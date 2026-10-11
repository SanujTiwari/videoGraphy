const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const { sendInstantBookingNotification } = require("../services/notificationService");
const router = Router();
// Helper to generate unique booking reference
function generateBookingRef() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    return `AV-${year}-${randomNum}`;
}
// Statuses that mean the admin has approved the booking. Those dates/times are locked.
const APPROVED_STATUSES = ['confirmed', 'in_progress', 'editing', 'album_production', 'ready_for_delivery', 'completed'];

// Finds an approved booking on the same date whose time overlaps with the given time
async function findApprovedClash(date, startTime, endTime, ignoreId) {
    const start = startTime || '10:00';
    const end = endTime || '22:00';
    const marks = APPROVED_STATUSES.map(() => '?').join(',');
    const rows = await db.prepare(`SELECT * FROM bookings WHERE event_date = ? AND booking_status IN (${marks}) AND id != ?`)
        .all(date, ...APPROVED_STATUSES, ignoreId || 0);
    return rows.find((b) => start < (b.event_end_time || '22:00') && (b.event_start_time || '10:00') < end);
}

// POST /api/bookings - Submit new booking request (Public or Logged-in Customer)
router.post('/', async (req, res) => {
    try {
        const { customer_name, customer_email, customer_mobile, event_type, package_id, package_name, event_date, event_start_time, event_end_time, venue, city, guest_count, special_requirements, add_ons, coupon_code, customer_id } = req.body;
        // Validate mandatory fields
        if (!customer_name || !customer_email || !customer_mobile || !event_type || !event_date || !venue || !city) {
            return res.status(400).json({
                error: 'Mandatory fields missing. Please provide name, email, mobile, event_type, event_date, venue, and city.',
            });
        }
        // Phone number format validation (basic Indian mobile check)
        const mobileRegex = /^(\+91[\s-]?)?[6789]\d{9}$/;
        if (!mobileRegex.test(customer_mobile.trim())) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
        }
        // Check availability block for requested date
        const blocked = await db.prepare('SELECT * FROM availability_blocks WHERE date = ?').get(event_date);
        if (blocked) {
            return res.status(400).json({
                error: `Studio is fully booked or closed on ${event_date}. Please select an alternative date.`,
            });
        }
        // An approved booking on the same date and time blocks new bookings
        const clash = await findApprovedClash(event_date, event_start_time, event_end_time);
        if (clash) {
            return res.status(409).json({
                error: `This date and time is already booked (${clash.event_start_time} - ${clash.event_end_time}). Please choose another date or time.`,
            });
        }
        // Calculate Pricing
        let packagePrice = 0;
        let packagePriceMax = null;
        let selectedPackageName = package_name || 'Custom Package';
        if (package_id) {
            const pkg = await db.prepare('SELECT * FROM packages WHERE id = ?').get(package_id);
            if (pkg) {
                packagePrice = pkg.price;
                packagePriceMax = pkg.price_max || null;
                selectedPackageName = pkg.name;
            }
        }
        let addOnsTotal = 0;
        const itemRecords = [];
        if (packagePrice > 0) {
            itemRecords.push({
                type: 'package',
                name: selectedPackageName,
                qty: 1,
                unitPrice: packagePrice,
                totalPrice: packagePrice,
            });
        }
        if (Array.isArray(add_ons) && add_ons.length > 0) {
            add_ons.forEach((addon) => {
                const addonPrice = Number(addon.price) || 0;
                const qty = Number(addon.quantity) || 1;
                const total = addonPrice * qty;
                addOnsTotal += total;
                itemRecords.push({
                    type: 'addon',
                    name: addon.name,
                    qty,
                    unitPrice: addonPrice,
                    totalPrice: total,
                });
            });
        }
        let rawTotal = packagePrice + addOnsTotal;
        // Check Coupon Discount
        let discountAmount = 0;
        if (coupon_code) {
            const coupon = await db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code);
            if (coupon) {
                if (coupon.discount_type === 'percentage') {
                    discountAmount = (rawTotal * coupon.discount_value) / 100;
                }
                else {
                    discountAmount = coupon.discount_value;
                }
                // Increment coupon use
                await db.prepare('UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?').run(coupon.id);
            }
        }
        const finalTotal = Math.max(0, rawTotal - discountAmount);
        // Fetch advance percentage setting
        const studioSettings = await db.prepare('SELECT advance_percentage FROM studio_settings LIMIT 1').get();
        const advancePercent = studioSettings?.advance_percentage || 30.0;
        const advanceAmount = Math.round((finalTotal * advancePercent) / 100);
        const remainingAmount = finalTotal - advanceAmount;
        const bookingRef = generateBookingRef();
        // Begin DB Transaction
        const insertBookingStmt = db.prepare(`
      INSERT INTO bookings (
        booking_ref, customer_id, customer_name, customer_email, customer_mobile,
        event_type, package_id, package_name, event_date, event_start_time, event_end_time,
        venue, city, guest_count, special_requirements, total_amount, advance_amount,
        remaining_amount, payment_status, booking_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    `);
        const bookingResult = await insertBookingStmt.run(bookingRef, customer_id || null, customer_name, customer_email, customer_mobile, event_type, package_id || null, selectedPackageName, event_date, event_start_time || '10:00', event_end_time || '22:00', venue, city, guest_count || null, special_requirements || null, finalTotal, advanceAmount, remainingAmount);
        const bookingId = Number(bookingResult.lastInsertRowid);
        // Insert line items
        const insertItemStmt = db.prepare(`
      INSERT INTO booking_items (booking_id, item_type, item_name, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        for (const item of itemRecords) {
            await insertItemStmt.run(bookingId, item.type, item.name, item.qty, item.unitPrice, item.totalPrice);
        }
        // Record Status History
        await db.prepare(`
      INSERT INTO booking_status_history (booking_id, status, notes, changed_by_name)
      VALUES (?, 'pending', 'Booking request submitted by customer.', ?)
    `).run(bookingId, customer_name);
        // Record Audit Log
        await db.prepare(`
      INSERT INTO audit_logs (user_name, action, details)
      VALUES (?, 'BOOKING_SUBMITTED', ?)
    `).run(customer_name, `Submitted booking #${bookingRef} for ${event_type} on ${event_date}`);
        // TRIGGER CRITICAL INSTANT BOOKING NOTIFICATION FOR STUDIO MANAGER
        await sendInstantBookingNotification({
            booking_id: bookingId,
            booking_ref: bookingRef,
            customer_name,
            customer_email,
            customer_mobile,
            event_type,
            package_name: selectedPackageName,
            package_price_max: packagePriceMax,
            add_ons: Array.isArray(add_ons) ? add_ons.map((a) => ({ name: a.name, quantity: Number(a.quantity) || 1, price: Number(a.price) || 0 })) : [],
            event_date,
            event_time: event_start_time,
            venue: `${venue}, ${city}`,
            total_amount: finalTotal,
            advance_amount: advanceAmount,
            special_requirements,
            created_at: new Date().toISOString(),
        });
        return res.status(201).json({
            message: 'Booking request submitted successfully!',
            booking: {
                id: bookingId,
                booking_ref: bookingRef,
                customer_name,
                customer_email,
                customer_mobile,
                event_type,
                package_name: selectedPackageName,
                event_date,
                venue: `${venue}, ${city}`,
                total_amount: finalTotal,
                advance_amount: advanceAmount,
                remaining_amount: remainingAmount,
                booking_status: 'pending',
                payment_status: 'pending',
            },
        });
    }
    catch (err) {
        console.error('Error creating booking:', err);
        return res.status(500).json({ error: 'Internal server error while processing booking request' });
    }
});
// GET /api/bookings/track/:ref - Track booking status publicly with Booking Ref
router.get('/track/:ref', async (req, res) => {
    const ref = req.params.ref.trim();
    const booking = await db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(ref);
    if (!booking) {
        return res.status(404).json({ error: 'Booking reference not found. Please check your booking code.' });
    }
    const items = await db.prepare('SELECT * FROM booking_items WHERE booking_id = ?').all(booking.id);
    const statusHistory = await db.prepare('SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY id DESC').all(booking.id);
    const payments = await db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC').all(booking.id);
    const media = await db.prepare('SELECT id, title, category, media_type, access_token, expires_at FROM media_deliveries WHERE booking_id = ?').all(booking.id);
    return res.json({
        booking: {
            ...booking,
            items,
            status_history: statusHistory,
            payments,
            media_deliveries: media,
        },
    });
});
// GET /api/bookings/my-bookings - Customer portal bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const bookings = await db.prepare(`
    SELECT * FROM bookings
    WHERE customer_id = ? OR customer_email = ?
    ORDER BY id DESC
  `).all(req.user.id, req.user.email);
    return res.json({ bookings });
});
// GET /api/admin/bookings - Searchable, filterable list for Admin & Manager
router.get('/admin/all', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { status, payment_status, search, date } = req.query;
    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
        query += ' AND booking_status = ?';
        params.push(status);
    }
    if (payment_status && payment_status !== 'all') {
        query += ' AND payment_status = ?';
        params.push(payment_status);
    }
    if (date) {
        query += ' AND event_date = ?';
        params.push(date);
    }
    if (search) {
        query += ' AND (customer_name LIKE ? OR customer_email LIKE ? OR customer_mobile LIKE ? OR booking_ref LIKE ? OR venue LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
    }
    query += ' ORDER BY id DESC';
    const bookings = await db.prepare(query).all(...params);
    return res.json({ bookings });
});
// GET /api/admin/bookings/:id - Single booking details
router.get('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking)
        return res.status(404).json({ error: 'Booking not found' });
    const items = await db.prepare('SELECT * FROM booking_items WHERE booking_id = ?').all(booking.id);
    const statusHistory = await db.prepare('SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY id DESC').all(booking.id);
    const payments = await db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC').all(booking.id);
    const staffAssignments = await db.prepare(`
    SELECT sa.*, s.name as staff_name, s.role as staff_role, s.mobile as staff_mobile
    FROM staff_assignments sa
    JOIN staff s ON sa.staff_id = s.id
    WHERE sa.booking_id = ?
  `).all(booking.id);
    return res.json({
        booking: {
            ...booking,
            items,
            status_history: statusHistory,
            payments,
            staff_assignments: staffAssignments,
        },
    });
});
// PATCH /api/admin/bookings/:id/status - Update Booking Status Workflow
router.patch('/admin/:id/status', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { status, notes } = req.body;
    const bookingId = req.params.id;
    const validStatuses = [
        'pending',
        'under_review',
        'awaiting_advance',
        'confirmed',
        'in_progress',
        'editing',
        'album_production',
        'ready_for_delivery',
        'completed',
        'rejected',
        'cancelled',
    ];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking)
        return res.status(404).json({ error: 'Booking not found' });
    // Do not approve a booking if another approved booking has the same date and time
    if (APPROVED_STATUSES.includes(status)) {
        const clash = await findApprovedClash(booking.event_date, booking.event_start_time, booking.event_end_time, booking.id);
        if (clash) {
            return res.status(409).json({ error: `Cannot approve. Booking ${clash.booking_ref} is already approved for this date and time.` });
        }
    }
    // Update Booking Status
    await db.prepare('UPDATE bookings SET booking_status = ? WHERE id = ?').run(status, bookingId);
    // Record Status History
    await db.prepare(`
    INSERT INTO booking_status_history (booking_id, status, notes, changed_by_name)
    VALUES (?, ?, ?, ?)
  `).run(bookingId, status, notes || `Status updated to ${status}`, req.user?.full_name || 'Manager');
    // Record Audit Log
    await db.prepare(`
    INSERT INTO audit_logs (user_name, action, details)
    VALUES (?, 'STATUS_CHANGE', ?)
  `).run(req.user?.full_name || 'Manager', `Booking #${booking.booking_ref} status changed to ${status}`);
    return res.json({ message: `Booking status updated to ${status}`, status });
});
// PATCH /api/admin/bookings/:id/reschedule - Reschedule event date
router.patch('/admin/:id/reschedule', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { new_date, reason } = req.body;
    const bookingId = req.params.id;
    if (!new_date)
        return res.status(400).json({ error: 'New event date is required' });
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking)
        return res.status(404).json({ error: 'Booking not found' });
    if (APPROVED_STATUSES.includes(booking.booking_status)) {
        const clash = await findApprovedClash(new_date, booking.event_start_time, booking.event_end_time, booking.id);
        if (clash) return res.status(409).json({ error: `Cannot move. Booking ${clash.booking_ref} is already approved on ${new_date} at this time.` });
    }
    await db.prepare('UPDATE bookings SET event_date = ? WHERE id = ?').run(new_date, bookingId);
    await db.prepare(`
    INSERT INTO booking_status_history (booking_id, status, notes, changed_by_name)
    VALUES (?, ?, ?, ?)
  `).run(bookingId, booking.booking_status, `Rescheduled from ${booking.event_date} to ${new_date}. Reason: ${reason || 'Customer request'}`, req.user?.full_name || 'Manager');
    return res.json({ message: `Event rescheduled to ${new_date}` });
});
// POST /api/admin/bookings/:id/assign-staff - Assign Staff Members to Booking
router.post('/admin/:id/assign-staff', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { staff_id, role_assigned } = req.body;
    const bookingId = req.params.id;
    if (!staff_id || !role_assigned) {
        return res.status(400).json({ error: 'staff_id and role_assigned are required' });
    }
    // Remove existing assignment if any
    await db.prepare('DELETE FROM staff_assignments WHERE booking_id = ? AND staff_id = ?').run(bookingId, staff_id);
    await db.prepare(`
    INSERT INTO staff_assignments (booking_id, staff_id, role_assigned)
    VALUES (?, ?, ?)
  `).run(bookingId, staff_id, role_assigned);
    return res.json({ message: 'Staff member assigned successfully' });
});

module.exports = router;
