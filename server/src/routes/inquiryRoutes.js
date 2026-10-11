const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// POST /api/inquiries - Submit inquiry (Public)
router.post('/', async (req, res) => {
    const { name, mobile, email, event_type, message } = req.body;
    if (!name || !mobile || !email || !message) {
        return res.status(400).json({ error: 'name, mobile, email, and message are required' });
    }
    const stmt = db.prepare(`
    INSERT INTO inquiries (name, mobile, email, event_type, message, status)
    VALUES (?, ?, ?, ?, ?, 'new')
  `);
    await stmt.run(name, mobile, email, event_type || 'Wedding Inquiry', message);
    return res.status(201).json({ message: 'Thank you! Your inquiry has been sent to Anmol VideoGraphy team.' });
});
// GET /api/admin/inquiries - List inquiries for admin
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const inquiries = await db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all();
    return res.json({ inquiries });
});
// PATCH /api/admin/inquiries/:id/status - Update lead status (new -> contacted -> quotation_sent -> converted -> closed)
router.patch('/admin/:id/status', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { status } = req.body;
    await db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, req.params.id);
    return res.json({ message: `Inquiry status updated to ${status}` });
});

module.exports = router;
