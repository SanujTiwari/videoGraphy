const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/reviews - Approved and featured reviews for home page & testimonials
router.get('/', async (_req, res) => {
    const reviews = await db.prepare('SELECT * FROM reviews WHERE status = "approved" ORDER BY is_featured DESC, id DESC').all();
    return res.json({ reviews });
});
// POST /api/reviews - Submit review (Verified Customer)
router.post('/', async (req, res) => {
    const { booking_ref, customer_name, event_type, rating, title, comment, image_url } = req.body;
    if (!customer_name || !rating || !title || !comment) {
        return res.status(400).json({ error: 'customer_name, rating, title, and comment are required' });
    }
    let bookingId = null;
    if (booking_ref) {
        const booking = await db.prepare('SELECT id FROM bookings WHERE booking_ref = ?').get(booking_ref);
        if (booking)
            bookingId = booking.id;
    }
    const stmt = db.prepare(`
    INSERT INTO reviews (booking_id, customer_name, event_type, rating, title, comment, image_url, status, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)
  `);
    await stmt.run(bookingId, customer_name, event_type || 'Wedding Event', rating, title, comment, image_url || null);
    return res.status(201).json({ message: 'Thank you for your feedback! Your review will be published after verification.' });
});
// GET /api/admin/reviews - All reviews for admin review
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const reviews = await db.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
    return res.json({ reviews });
});
// PATCH /api/admin/reviews/:id - Approve, reject, feature, or reply
router.patch('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { status, is_featured, reply } = req.body;
    await db.prepare(`
    UPDATE reviews
    SET status = COALESCE(?, status),
        is_featured = COALESCE(?, is_featured),
        reply = COALESCE(?, reply)
    WHERE id = ?
  `).run(status, is_featured !== undefined ? (is_featured ? 1 : 0) : null, reply, req.params.id);
    return res.json({ message: 'Review updated successfully' });
});

module.exports = router;
