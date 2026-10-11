const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// POST /api/coupons/validate - Validate coupon for customer
router.post('/validate', async (req, res) => {
    const { code, booking_amount } = req.body;
    if (!code)
        return res.status(400).json({ error: 'Coupon code required' });
    const coupon = await db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.toUpperCase().trim());
    if (!coupon) {
        return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }
    if (booking_amount && booking_amount < coupon.min_booking_value) {
        return res.status(400).json({
            error: `Coupon requires a minimum booking amount of ₹${coupon.min_booking_value.toLocaleString()}`,
        });
    }
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
        discount = ((booking_amount || 0) * coupon.discount_value) / 100;
    }
    else {
        discount = coupon.discount_value;
    }
    return res.json({
        valid: true,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discount,
    });
});
// GET /api/admin/coupons - List all coupons
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const coupons = await db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    return res.json({ coupons });
});
// POST /api/admin/coupons - Create coupon
router.post('/admin', authenticateToken, requireRole(['owner']), async (req, res) => {
    const { code, discount_type, discount_value, min_booking_value, start_date, expiry_date, max_uses } = req.body;
    if (!code || !discount_type || !discount_value) {
        return res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
    }
    const stmt = db.prepare(`
    INSERT INTO coupons (code, discount_type, discount_value, min_booking_value, start_date, expiry_date, max_uses, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
    await stmt.run(code.toUpperCase().trim(), discount_type, discount_value, min_booking_value || 0, start_date || null, expiry_date || null, max_uses || 100);
    return res.status(201).json({ message: 'Coupon code created successfully' });
});

module.exports = router;
