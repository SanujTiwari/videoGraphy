const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/availability - Get blocked and booked dates calendar view
router.get('/', async (req, res) => {
    const blockedDates = await db.prepare('SELECT * FROM availability_blocks').all();
    // Only approved bookings lock a date/time. Pending requests do not.
    const bookedEvents = await db.prepare(`
    SELECT event_date, event_start_time, event_end_time, booking_ref, event_type, booking_status
    FROM bookings
    WHERE booking_status IN ('confirmed', 'in_progress', 'editing', 'album_production', 'ready_for_delivery', 'completed')
  `).all();
    return res.json({
        blocked_dates: blockedDates,
        booked_events: bookedEvents,
    });
});// POST /api/admin/availability/block - Block date (Owner / Manager)
router.post('/admin/block', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { date, reason } = req.body;
    if (!date)
        return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    try {
        const stmt = db.prepare(`
      INSERT INTO availability_blocks (date, reason, created_by)
      VALUES (?, ?, ?)
    `);
        await stmt.run(date, reason || 'Studio Closed', req.user?.full_name || 'Manager');
        return res.status(201).json({ message: `Date ${date} has been blocked successfully.` });
    }
    catch (err) {
        return res.status(400).json({ error: 'Date is already blocked.' });
    }
});
// DELETE /api/admin/availability/block/:id - Unblock date
router.delete('/admin/block/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    await db.prepare('DELETE FROM availability_blocks WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Date unblocked successfully.' });
});

module.exports = router;
