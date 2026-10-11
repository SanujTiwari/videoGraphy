const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");
const router = Router();
// GET /api/media/access/:token - Public Private Access Link for Client Gallery
router.get('/access/:token', async (req, res) => {
    const token = req.params.token;
    const media = await db.prepare(`
    SELECT m.*, b.booking_ref, b.customer_name, b.event_type, b.event_date
    FROM media_deliveries m
    JOIN bookings b ON m.booking_id = b.id
    WHERE m.access_token = ?
  `).get(token);
    if (!media) {
        return res.status(404).json({ error: 'Private gallery access link invalid or expired.' });
    }
    // Increment download / view count
    await db.prepare('UPDATE media_deliveries SET download_count = download_count + 1 WHERE id = ?').run(media.id);
    return res.json({ media });
});
// GET /api/admin/media - Get all media delivery links for admin
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const mediaList = await db.prepare(`
    SELECT m.*, b.booking_ref, b.customer_name, b.event_type
    FROM media_deliveries m
    JOIN bookings b ON m.booking_id = b.id
    ORDER BY m.id DESC
  `).all();
    return res.json({ media_deliveries: mediaList });
});
// POST /api/admin/media - Add client photo/video album delivery link
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { booking_id, title, category, media_type, file_url, thumbnail_url } = req.body;
    if (!booking_id || !title || !file_url || !media_type) {
        return res.status(400).json({ error: 'booking_id, title, file_url, and media_type are required' });
    }
    const accessToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year access
    const stmt = db.prepare(`
    INSERT INTO media_deliveries (booking_id, title, category, media_type, file_url, thumbnail_url, access_token, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = await stmt.run(booking_id, title, category || 'Full Event Album', media_type, file_url, thumbnail_url || null, accessToken, expiresAt);
    return res.status(201).json({
        message: 'Media gallery delivery created successfully',
        id: Number(result.lastInsertRowid),
        access_token: accessToken,
        shareable_link: `/gallery/client/${accessToken}`,
    });
});

module.exports = router;
