const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
const formatPackage = (pkg) => {
    const { details_json, included_services_json, features_json, ...rest } = pkg;
    return {
        ...rest,
        details: details_json ? JSON.parse(details_json) : {},
        included_services: included_services_json ? JSON.parse(included_services_json) : [],
        features: features_json ? JSON.parse(features_json) : [],
    };
};
// GET /api/packages - Public list of packages
router.get('/', async (_req, res) => {
    const packages = await db.prepare('SELECT * FROM packages WHERE status = "active" ORDER BY price ASC').all();
    const formatted = packages.map(formatPackage);
    return res.json({ packages: formatted });
});
// GET /api/packages/addons - Available add-on options
router.get('/addons', async (_req, res) => {
    const addOns = await db.prepare('SELECT * FROM add_ons ORDER BY id ASC').all();
    return res.json({ add_ons: addOns });
});
// GET /api/packages/compare - Detailed package comparison matrix
router.get('/compare', async (_req, res) => {
    const packages = await db.prepare('SELECT * FROM packages WHERE status = "active" ORDER BY price ASC').all();
    const addOns = await db.prepare('SELECT * FROM add_ons ORDER BY id ASC').all();
    const formattedPackages = packages.map(formatPackage);
    return res.json({
        packages: formattedPackages,
        add_ons: addOns,
    });
});
// GET /api/packages/:id
router.get('/:id', async (req, res) => {
    const pkg = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    if (!pkg)
        return res.status(404).json({ error: 'Package not found' });
    return res.json({
        package: formatPackage(pkg),
    });
});
// POST /api/admin/packages - Create package (Owner / Manager)
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, badge, price, original_price, description, coverage_hours, included_services, features, price_max, discount_amount, discount_percent, note, details } = req.body;
    if (!name || !price || !description || !coverage_hours) {
        return res.status(400).json({ error: 'Name, price, description, and coverage_hours are required' });
    }
    const stmt = db.prepare(`
    INSERT INTO packages (name, badge, price, original_price, description, coverage_hours, included_services_json, features_json, price_max, discount_amount, discount_percent, note, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = await stmt.run(name, badge || null, price, original_price || null, description, coverage_hours, JSON.stringify(included_services || []), JSON.stringify(features || []), price_max || null, discount_amount || null, discount_percent || null, note || null, JSON.stringify(details || {}));
    return res.status(201).json({ message: 'Package created successfully', id: Number(result.lastInsertRowid) });
});
// PATCH /api/admin/packages/:id - Update package
router.patch('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { name, badge, price, original_price, description, coverage_hours, included_services, features, status, price_max, discount_amount, discount_percent, note, details } = req.body;
    const existing = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Package not found' });
    const stmt = db.prepare(`
    UPDATE packages
    SET name = COALESCE(?, name),
        badge = COALESCE(?, badge),
        price = COALESCE(?, price),
        original_price = COALESCE(?, original_price),
        description = COALESCE(?, description),
        coverage_hours = COALESCE(?, coverage_hours),
        included_services_json = COALESCE(?, included_services_json),
        features_json = COALESCE(?, features_json),
        status = COALESCE(?, status),
        price_max = COALESCE(?, price_max),
        discount_amount = COALESCE(?, discount_amount),
        discount_percent = COALESCE(?, discount_percent),
        note = COALESCE(?, note),
        details_json = COALESCE(?, details_json)
    WHERE id = ?
  `);
    await stmt.run(name, badge, price, original_price, description, coverage_hours, included_services ? JSON.stringify(included_services) : null, features ? JSON.stringify(features) : null, status, price_max, discount_amount, discount_percent, note, details ? JSON.stringify(details) : null, req.params.id);
    return res.json({ message: 'Package updated successfully. Existing booking quotations preserved.' });
});
// PATCH /api/packages/admin/:id/rates - Set package rates. Empty values are saved as "not set".
router.patch('/admin/:id/rates', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const toNumber = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    const price = toNumber(req.body.price);
    if (!price || price <= 0) return res.status(400).json({ error: 'Final price is required' });
    const priceMax = toNumber(req.body.price_max);
    const originalPrice = toNumber(req.body.original_price);
    const discountAmount = toNumber(req.body.discount_amount);
    const discountPercent = toNumber(req.body.discount_percent);
    if ([priceMax, originalPrice, discountAmount, discountPercent].some((v) => v !== null && (isNaN(v) || v < 0))) {
        return res.status(400).json({ error: 'Prices must be valid positive numbers' });
    }
    await db.prepare('UPDATE packages SET price = ?, price_max = ?, original_price = ?, discount_amount = ?, discount_percent = ? WHERE id = ?')
        .run(price, priceMax, originalPrice, discountAmount, discountPercent, req.params.id);
    return res.json({ message: 'Rates updated' });
});
// DELETE /api/admin/packages/:id
router.delete('/admin/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
    await db.prepare('UPDATE packages SET status = "archived" WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Package archived successfully' });
});

module.exports = router;
