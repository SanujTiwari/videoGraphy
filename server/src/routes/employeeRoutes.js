const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/admin/staff - Get all staff members
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const staff = await db.prepare('SELECT * FROM staff ORDER BY id ASC').all();
    const formatted = staff.map((s) => ({
        ...s,
        skills: s.skills_json ? JSON.parse(s.skills_json) : [],
    }));
    return res.json({ staff: formatted });
});
// POST /api/admin/staff - Add new staff member
router.post('/admin', authenticateToken, requireRole(['owner']), async (req, res) => {
    const { name, email, mobile, role, skills } = req.body;
    if (!name || !email || !mobile || !role) {
        return res.status(400).json({ error: 'name, email, mobile, and role are required' });
    }
    const stmt = db.prepare(`
    INSERT INTO staff (name, email, mobile, role, skills_json, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
    const result = await stmt.run(name, email, mobile, role, JSON.stringify(skills || []));
    return res.status(201).json({ message: 'Staff member added successfully', id: Number(result.lastInsertRowid) });
});
// PATCH /api/admin/staff/:id - Update staff
router.patch('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, email, mobile, role, skills, status } = req.body;
    await db.prepare(`
    UPDATE staff
    SET name = COALESCE(?, name),
        email = COALESCE(?, email),
        mobile = COALESCE(?, mobile),
        role = COALESCE(?, role),
        skills_json = COALESCE(?, skills_json),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(name, email, mobile, role, skills ? JSON.stringify(skills) : null, status, req.params.id);
    return res.json({ message: 'Staff profile updated' });
});

module.exports = router;
