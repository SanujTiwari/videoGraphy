const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/admin/reports/dashboard - Dashboard Overview KPIs and Charts
router.get('/dashboard', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const totalBookings = (await db.prepare('SELECT COUNT(*) as count FROM bookings').get())?.count || 0;
    const pendingBookings = (await db.prepare('SELECT COUNT(*) as count FROM bookings WHERE booking_status = "pending"').get())?.count || 0;
    const confirmedBookings = (await db.prepare('SELECT COUNT(*) as count FROM bookings WHERE booking_status = "confirmed"').get())?.count || 0;
    const completedBookings = (await db.prepare('SELECT COUNT(*) as count FROM bookings WHERE booking_status = "completed"').get())?.count || 0;
    const cancelledBookings = (await db.prepare('SELECT COUNT(*) as count FROM bookings WHERE booking_status = "cancelled"').get())?.count || 0;
    const totalBookedRevenue = (await db.prepare('SELECT SUM(total_amount) as total FROM bookings WHERE booking_status != "cancelled"').get())?.total || 0;
    const totalReceivedPayments = (await db.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "success"').get())?.total || 0;
    const totalOutstandingBalance = Math.max(0, totalBookedRevenue - totalReceivedPayments);
    const popularPackages = await db.prepare(`
    SELECT package_name, COUNT(*) as booking_count, SUM(total_amount) as total_revenue
    FROM bookings
    WHERE booking_status != "cancelled"
    GROUP BY package_name
    ORDER BY booking_count DESC
  `).all();
    const recentInquiries = await db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 5').all();
    const upcomingEvents = await db.prepare('SELECT * FROM bookings WHERE booking_status IN ("confirmed", "in_progress") ORDER BY event_date ASC LIMIT 5').all();
    return res.json({
        kpis: {
            total_bookings: totalBookings,
            pending_bookings: pendingBookings,
            confirmed_bookings: confirmedBookings,
            completed_bookings: completedBookings,
            cancelled_bookings: cancelledBookings,
            total_booked_revenue: totalBookedRevenue,
            total_received_payments: totalReceivedPayments,
            outstanding_balance: totalOutstandingBalance,
        },
        popular_packages: popularPackages,
        recent_inquiries: recentInquiries,
        upcoming_events: upcomingEvents,
    });
});
// GET /api/reports/monthly - bookings per month for the last 12 months + this month's count
router.get('/monthly', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const rows = await db.prepare(`
    SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS bookings, COALESCE(SUM(total_amount), 0) AS revenue
    FROM bookings
    WHERE booking_status NOT IN ('cancelled', 'rejected')
    GROUP BY substr(created_at, 1, 7)
  `).all();

    // Build the last 12 months, filling empty months with 0
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const found = rows.find((r) => r.month === key);
        months.push({
            month: key,
            label: d.toLocaleString('en-US', { month: 'short' }),
            bookings: found ? found.bookings : 0,
            revenue: found ? found.revenue : 0,
        });
    }
    return res.json({ months, this_month: months[months.length - 1] });
});

// GET /api/admin/reports/csv - Export Bookings to CSV
router.get('/csv', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const bookings = await db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
    let csvContent = 'Booking Ref,Customer Name,Email,Mobile,Event Type,Package,Event Date,Total Amount,Advance Paid,Remaining,Payment Status,Booking Status\n';
    for (const b of bookings) {
        const totalPaid = (await db.prepare('SELECT SUM(amount) as total FROM payments WHERE booking_id = ? AND status = "success"').get(b.id))?.total || 0;
        csvContent += `"${b.booking_ref}","${b.customer_name}","${b.customer_email}","${b.customer_mobile}","${b.event_type}","${b.package_name}","${b.event_date}",${b.total_amount},${totalPaid},${b.remaining_amount},"${b.payment_status}","${b.booking_status}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Anmol_VideoGraphy_Bookings_Report.csv');
    return res.send(csvContent);
});

module.exports = router;
