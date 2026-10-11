const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/studio/settings - Public & Admin Studio details
router.get('/settings', async (_req, res) => {
    const settings = await db.prepare('SELECT * FROM studio_settings LIMIT 1').get();
    return res.json({ settings });
});
// PATCH /api/studio/settings - Update Studio Settings (Owner Only)
router.patch('/settings', authenticateToken, requireRole(['owner']), async (req, res) => {
    const { name, tagline, email, mobile, whatsapp_number, address, cancellation_policy, tax_rate, advance_percentage, manager_email } = req.body;
    await db.prepare(`
    UPDATE studio_settings
    SET name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        email = COALESCE(?, email),
        mobile = COALESCE(?, mobile),
        whatsapp_number = COALESCE(?, whatsapp_number),
        address = COALESCE(?, address),
        cancellation_policy = COALESCE(?, cancellation_policy),
        tax_rate = COALESCE(?, tax_rate),
        advance_percentage = COALESCE(?, advance_percentage),
        manager_email = COALESCE(?, manager_email)
    WHERE id = 1
  `).run(name, tagline, email, mobile, whatsapp_number, address, cancellation_policy, tax_rate, advance_percentage, manager_email);
    return res.json({ message: 'Studio configuration settings updated successfully' });
});
// GET /api/studio/audit-logs - View system audit logs (Owner Only)
router.get('/audit-logs', authenticateToken, requireRole(['owner']), async (_req, res) => {
    const logs = await db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
    return res.json({ audit_logs: logs });
});

// PATCH /api/studio/cloudinary - Update Cloudinary credentials directly from Admin Settings
router.patch('/cloudinary', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { cloud_name, api_key, api_secret } = req.body;
    await db.prepare(`
        UPDATE studio_settings
        SET cloudinary_cloud_name = ?,
            cloudinary_api_key = ?,
            cloudinary_api_secret = ?
        WHERE id = 1
    `).run(cloud_name ? cloud_name.trim() : null, api_key ? api_key.trim() : null, api_secret ? api_secret.trim() : null);
    return res.json({ message: 'Cloudinary storage credentials saved successfully!' });
});

module.exports = router;
