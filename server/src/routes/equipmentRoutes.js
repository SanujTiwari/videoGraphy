const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/admin/equipment - Equipment directory & inventory list
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const equipment = await db.prepare('SELECT * FROM equipment ORDER BY id ASC').all();
    const inventory = await db.prepare('SELECT * FROM inventory ORDER BY id ASC').all();
    return res.json({ equipment, inventory });
});
// POST /api/admin/equipment - Add equipment asset
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { asset_id, name, category, quantity, condition, availability, purchase_date, notes } = req.body;
    if (!asset_id || !name || !category) {
        return res.status(400).json({ error: 'asset_id, name, and category are required' });
    }
    const stmt = db.prepare(`
    INSERT INTO equipment (asset_id, name, category, quantity, condition, availability, purchase_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = await stmt.run(asset_id, name, category, quantity || 1, condition || 'excellent', availability || 'available', purchase_date || null, notes || null);
    return res.status(201).json({ message: 'Equipment added successfully', id: Number(result.lastInsertRowid) });
});
// PATCH /api/admin/equipment/:id - Update equipment asset
router.patch('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, category, quantity, condition, availability, notes } = req.body;
    await db.prepare(`
    UPDATE equipment
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        quantity = COALESCE(?, quantity),
        condition = COALESCE(?, condition),
        availability = COALESCE(?, availability),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(name, category, quantity, condition, availability, notes, req.params.id);
    return res.json({ message: 'Equipment status updated' });
});
// POST /api/admin/inventory - Add physical deliverable item (Albums, Frames, etc.)
router.post('/admin/inventory', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, category, stock, price, supplier } = req.body;
    if (!name || !category || price === undefined) {
        return res.status(400).json({ error: 'name, category, and price are required' });
    }
    await db.prepare(`
    INSERT INTO inventory (name, category, stock, price, supplier)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, category, stock || 0, price, supplier || null);
    return res.status(201).json({ message: 'Inventory item added' });
});

module.exports = router;
