const { Router } = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// GET /api/gallery - photos uploaded by the admin (public)
router.get('/', async (_req, res) => {
    const photos = await db.prepare('SELECT * FROM gallery_photos ORDER BY id DESC').all();
    return res.json({ photos });
});

// POST /api/gallery/admin - upload a photo. image_data is a data URL (data:image/jpeg;base64,...)
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { title, category, image_data } = req.body;
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image_data || '');
    if (!title || !match) {
        return res.status(400).json({ error: 'Title and a JPG, PNG or WEBP photo are required' });
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'Photo is too large. Maximum size is 8 MB.' });
    }
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileName = `${crypto.randomBytes(8).toString('hex')}.${EXTENSIONS[match[1]]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

    const result = await db.prepare('INSERT INTO gallery_photos (title, category, image_url) VALUES (?, ?, ?)')
        .run(title, category || 'Wedding', `/uploads/${fileName}`);
    return res.status(201).json({ message: 'Photo added', id: Number(result.lastInsertRowid) });
});

// DELETE /api/gallery/admin/:id
router.delete('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const photo = await db.prepare('SELECT * FROM gallery_photos WHERE id = ?').get(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    const file = path.join(UPLOAD_DIR, path.basename(photo.image_url));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await db.prepare('DELETE FROM gallery_photos WHERE id = ?').run(photo.id);
    return res.json({ message: 'Photo deleted' });
});

module.exports = router;