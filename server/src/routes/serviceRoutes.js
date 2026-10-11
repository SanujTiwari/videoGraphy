const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/services - Public list of services
router.get('/', async (_req, res) => {
    const services = await db.prepare('SELECT * FROM services ORDER BY id ASC').all();
    const formattedServices = services.map((s) => ({
        ...s,
        features: s.features_json ? JSON.parse(s.features_json) : [],
        available_add_ons: s.available_add_ons_json ? JSON.parse(s.available_add_ons_json) : [],
    }));
    return res.json({ services: formattedServices });
});
// GET /api/services/:id
router.get('/:id', async (req, res) => {
    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service)
        return res.status(404).json({ error: 'Service not found' });
    return res.json({
        service: {
            ...service,
            features: service.features_json ? JSON.parse(service.features_json) : [],
            available_add_ons: service.available_add_ons_json ? JSON.parse(service.available_add_ons_json) : [],
        },
    });
});
// POST /api/admin/services - Create service (Owner / Manager)
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { title, category, description, starting_price, duration_hours, image_url, features, available_add_ons } = req.body;
    if (!title || !category || !description || !starting_price) {
        return res.status(400).json({ error: 'Title, category, description, and starting_price are required' });
    }
    const stmt = db.prepare(`
    INSERT INTO services (title, category, description, starting_price, duration_hours, image_url, features_json, available_add_ons_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = await stmt.run(title, category, description, starting_price, duration_hours || 6, image_url || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', JSON.stringify(features || []), JSON.stringify(available_add_ons || []));
    return res.status(201).json({ message: 'Service created successfully', id: Number(result.lastInsertRowid) });
});
// PATCH /api/admin/services/:id - Update service
router.patch('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { title, category, description, starting_price, duration_hours, image_url, features, available_add_ons } = req.body;
    const existing = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Service not found' });
    const stmt = db.prepare(`
    UPDATE services
    SET title = COALESCE(?, title),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        starting_price = COALESCE(?, starting_price),
        duration_hours = COALESCE(?, duration_hours),
        image_url = COALESCE(?, image_url),
        features_json = COALESCE(?, features_json),
        available_add_ons_json = COALESCE(?, available_add_ons_json)
    WHERE id = ?
  `);
    await stmt.run(title, category, description, starting_price, duration_hours, image_url, features ? JSON.stringify(features) : null, available_add_ons ? JSON.stringify(available_add_ons) : null, req.params.id);
    return res.json({ message: 'Service updated successfully' });
});
// DELETE /api/admin/services/:id
router.delete('/admin/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
    await db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Service deleted successfully' });
});

module.exports = router;
