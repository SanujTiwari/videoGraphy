const { Router } = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const { isConfigured, uploadMedia, deleteMedia } = require("../services/cloudinaryService");
const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
};

// GET /api/gallery - media uploaded by the admin (public)
router.get('/', async (_req, res) => {
  const photos = await db.prepare('SELECT id, title, category, image_url, media_type, public_id, created_at FROM gallery_photos ORDER BY id DESC').all();
  return res.json({ photos });
});

// GET /api/gallery/storage-status - check if Cloudinary is active or using local fallback
router.get('/storage-status', async (_req, res) => {
  const status = await isConfigured();
  return res.json(status);
});

// POST /api/gallery/admin - upload a photo or video
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  const { title, category, image_data, media_type = 'image' } = req.body;

  if (!title || !image_data) {
    return res.status(400).json({ error: 'Title and media file are required' });
  }

  const cloudStatus = await isConfigured();

  // If Cloudinary is configured, upload to Cloudinary directly!
  if (cloudStatus.isConfigured) {
    try {
      const uploadResult = await uploadMedia(image_data, {
        title,
        category: category || 'Wedding',
        media_type: media_type === 'video' ? 'video' : 'image'
      });

      const result = await db.prepare(`
        INSERT INTO gallery_photos (title, category, image_url, media_type, public_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        title,
        category || 'Wedding',
        uploadResult.url,
        uploadResult.resource_type || media_type,
        uploadResult.public_id
      );

      return res.status(201).json({
        message: `${media_type === 'video' ? 'Video' : 'Photo'} uploaded to Cloudinary successfully!`,
        id: Number(result.lastInsertRowid),
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        storage: 'cloudinary'
      });
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: `Cloudinary upload failed: ${err.message}` });
    }
  }

  // Fallback: local disk storage (images only)
  if (media_type === 'video') {
    return res.status(400).json({
      error: 'Video upload requires Cloudinary. Please configure your Cloudinary credentials in Settings > Cloudinary Storage.'
    });
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image_data || '');
  if (!match) {
    return res.status(400).json({ error: 'Valid JPG, PNG, or WEBP photo required for local storage' });
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'Photo is too large. Maximum size is 10 MB.' });
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const fileName = `${crypto.randomBytes(8).toString('hex')}.${EXTENSIONS[match[1]] || 'jpg'}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

  const result = await db.prepare(`
    INSERT INTO gallery_photos (title, category, image_url, media_type, public_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, category || 'Wedding', `/uploads/${fileName}`, 'image', null);

  return res.status(201).json({
    message: 'Photo uploaded to local storage (Configure Cloudinary in Settings for cloud backup & video support)',
    id: Number(result.lastInsertRowid),
    storage: 'local'
  });
});

// DELETE /api/gallery/admin/:id - Delete media from Cloudinary and database
router.delete('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  const photo = await db.prepare('SELECT * FROM gallery_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Media not found' });

  // If stored in Cloudinary, delete from Cloudinary
  if (photo.public_id) {
    await deleteMedia(photo.public_id, photo.media_type || 'image');
  }

  // If stored locally, delete local file
  if (photo.image_url && photo.image_url.startsWith('/uploads/')) {
    const file = path.join(UPLOAD_DIR, path.basename(photo.image_url));
    if (fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch (e) { /* ignore */ }
    }
  }

  await db.prepare('DELETE FROM gallery_photos WHERE id = ?').run(photo.id);
  return res.json({ message: 'Media deleted successfully from gallery and storage.' });
});

module.exports = router;