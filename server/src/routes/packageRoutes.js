const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const { calculateAuthoritativePricing } = require("../utils/pricing");

const router = Router();

const formatPackage = (pkg) => {
    const { details_json, included_services_json, features_json, ...rest } = pkg;
    
    // Check if discount is currently active based on dates and toggle
    const todayStr = new Date().toISOString().split('T')[0];
    let isDateActive = true;
    if (pkg.discount_start_date && pkg.discount_start_date > todayStr) isDateActive = false;
    if (pkg.discount_end_date && pkg.discount_end_date < todayStr) isDateActive = false;
    const isDiscountActive = Boolean(pkg.discount_enabled && isDateActive && pkg.original_price && pkg.original_price > pkg.price);

    return {
        ...rest,
        is_discount_active: isDiscountActive,
        details: details_json ? (typeof details_json === 'string' ? JSON.parse(details_json) : details_json) : {},
        included_services: included_services_json ? (typeof included_services_json === 'string' ? JSON.parse(included_services_json) : included_services_json) : [],
        features: features_json ? (typeof features_json === 'string' ? JSON.parse(features_json) : features_json) : [],
    };
};

// GET /api/packages - Public list of active packages
router.get('/', async (_req, res) => {
    const packages = await db.prepare('SELECT * FROM packages WHERE status = \'active\' ORDER BY display_order ASC, price ASC').all();
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
    const packages = await db.prepare('SELECT * FROM packages WHERE status = \'active\' ORDER BY display_order ASC, price ASC').all();
    const addOns = await db.prepare('SELECT * FROM add_ons ORDER BY id ASC').all();
    return res.json({
        packages: packages.map(formatPackage),
        add_ons: addOns,
    });
});

// GET /api/packages/admin/all - Admin list (all packages including archived/inactive)
router.get('/admin/all', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const packages = await db.prepare('SELECT * FROM packages WHERE status != \'archived\' ORDER BY display_order ASC, id ASC').all();
    return res.json({ packages: packages.map(formatPackage) });
});

// GET /api/packages/:id
router.get('/:id', async (req, res) => {
    const pkg = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    return res.json({ package: formatPackage(pkg) });
});

// POST /api/admin/packages - Create package (Owner / Manager)
router.post('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const {
            name, badge, description, coverage_hours, included_services, features,
            details, image_url, travel_policy, extra_travel_charge, terms,
            display_order, status,
        } = req.body;

        if (!name || !description) {
            return res.status(400).json({ error: 'Package name and description are required.' });
        }

        const pricing = calculateAuthoritativePricing(req.body);

        const stmt = db.prepare(`
            INSERT INTO packages (
                name, badge, price, original_price, description, coverage_hours,
                included_services_json, features_json, price_max, discount_amount, discount_percent,
                note, details_json, pricing_mode, discount_type, discount_value, discount_enabled,
                discount_start_date, discount_end_date, image_url, display_order, travel_policy,
                extra_travel_charge, terms, status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS'))
        `);

        const result = await stmt.run(
            name,
            badge || null,
            pricing.price,
            pricing.original_price,
            description,
            Number(coverage_hours) || 24,
            JSON.stringify(included_services || []),
            JSON.stringify(features || []),
            pricing.discount_amount,
            pricing.discount_percent,
            travel_policy || null,
            JSON.stringify(details || {}),
            pricing.pricing_mode,
            pricing.discount_type,
            pricing.discount_value,
            pricing.discount_enabled,
            pricing.discount_start_date,
            pricing.discount_end_date,
            image_url || null,
            Number(display_order) || 1,
            travel_policy || null,
            extra_travel_charge || null,
            terms || null,
            status || 'active'
        );

        return res.status(201).json({ message: 'Package created successfully', id: Number(result.lastInsertRowid) });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// PATCH /api/admin/packages/:id - Update complete package configuration
router.patch('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const existing = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Package not found' });

        const {
            name, badge, description, coverage_hours, included_services, features,
            details, image_url, travel_policy, extra_travel_charge, terms,
            display_order, status,
        } = req.body;

        // Calculate authoritative pricing merges with existing values
        const pricing = calculateAuthoritativePricing({
            pricing_mode: req.body.pricing_mode ?? existing.pricing_mode,
            price: req.body.price !== undefined ? req.body.price : existing.price,
            final_price: req.body.final_price !== undefined ? req.body.final_price : undefined,
            original_price: req.body.original_price !== undefined ? req.body.original_price : existing.original_price,
            discount_type: req.body.discount_type ?? existing.discount_type,
            discount_value: req.body.discount_value !== undefined ? req.body.discount_value : existing.discount_value,
            discount_enabled: req.body.discount_enabled !== undefined ? req.body.discount_enabled : existing.discount_enabled,
            discount_start_date: req.body.discount_start_date !== undefined ? req.body.discount_start_date : existing.discount_start_date,
            discount_end_date: req.body.discount_end_date !== undefined ? req.body.discount_end_date : existing.discount_end_date,
        });

        const stmt = db.prepare(`
            UPDATE packages SET
                name = COALESCE(?, name),
                badge = ?,
                price = ?,
                original_price = ?,
                description = COALESCE(?, description),
                coverage_hours = COALESCE(?, coverage_hours),
                included_services_json = COALESCE(?, included_services_json),
                features_json = COALESCE(?, features_json),
                price_max = NULL,
                discount_amount = ?,
                discount_percent = ?,
                note = COALESCE(?, note),
                details_json = COALESCE(?, details_json),
                pricing_mode = ?,
                discount_type = ?,
                discount_value = ?,
                discount_enabled = ?,
                discount_start_date = ?,
                discount_end_date = ?,
                image_url = ?,
                display_order = COALESCE(?, display_order),
                travel_policy = COALESCE(?, travel_policy),
                extra_travel_charge = ?,
                terms = ?,
                status = COALESCE(?, status),
                updated_at = to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
            WHERE id = ?
        `);

        await stmt.run(
            name || null,
            badge !== undefined ? badge : existing.badge,
            pricing.price,
            pricing.original_price,
            description || null,
            coverage_hours !== undefined ? Number(coverage_hours) : null,
            included_services ? JSON.stringify(included_services) : null,
            features ? JSON.stringify(features) : null,
            pricing.discount_amount,
            pricing.discount_percent,
            travel_policy || null,
            details ? JSON.stringify(details) : null,
            pricing.pricing_mode,
            pricing.discount_type,
            pricing.discount_value,
            pricing.discount_enabled,
            pricing.discount_start_date,
            pricing.discount_end_date,
            image_url !== undefined ? image_url : existing.image_url,
            display_order !== undefined ? Number(display_order) : null,
            travel_policy || null,
            extra_travel_charge !== undefined ? extra_travel_charge : existing.extra_travel_charge,
            terms !== undefined ? terms : existing.terms,
            status || null,
            req.params.id
        );

        const updated = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
        return res.json({
            message: 'Package updated successfully. Existing booking records preserved.',
            package: formatPackage(updated),
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// PATCH /api/packages/admin/:id/rates - Quick pricing update
router.patch('/admin/:id/rates', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const existing = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Package not found' });

        const pricing = calculateAuthoritativePricing({
            pricing_mode: req.body.pricing_mode ?? existing.pricing_mode,
            price: req.body.price !== undefined ? req.body.price : existing.price,
            final_price: req.body.final_price,
            original_price: req.body.original_price !== undefined ? req.body.original_price : existing.original_price,
            discount_type: req.body.discount_type ?? existing.discount_type,
            discount_value: req.body.discount_value !== undefined ? req.body.discount_value : existing.discount_value,
            discount_enabled: req.body.discount_enabled !== undefined ? req.body.discount_enabled : existing.discount_enabled,
            discount_start_date: req.body.discount_start_date !== undefined ? req.body.discount_start_date : existing.discount_start_date,
            discount_end_date: req.body.discount_end_date !== undefined ? req.body.discount_end_date : existing.discount_end_date,
        });

        await db.prepare(`
            UPDATE packages SET
                price = ?,
                price_max = NULL,
                original_price = ?,
                discount_amount = ?,
                discount_percent = ?,
                pricing_mode = ?,
                discount_type = ?,
                discount_value = ?,
                discount_enabled = ?,
                discount_start_date = ?,
                discount_end_date = ?,
                updated_at = to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
            WHERE id = ?
        `).run(
            pricing.price,
            pricing.original_price,
            pricing.discount_amount,
            pricing.discount_percent,
            pricing.pricing_mode,
            pricing.discount_type,
            pricing.discount_value,
            pricing.discount_enabled,
            pricing.discount_start_date,
            pricing.discount_end_date,
            req.params.id
        );

        const updated = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
        return res.json({ message: 'Pricing rates updated successfully', package: formatPackage(updated) });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// DELETE /api/admin/packages/:id - Archive package
router.delete('/admin/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
    await db.prepare('UPDATE packages SET status = \'archived\' WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Package archived successfully' });
});

module.exports = router;
