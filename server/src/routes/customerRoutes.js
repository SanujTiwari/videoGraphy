const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/admin/customers - Searchable Customer CRM Directory
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { search } = req.query;
    let query = `
    SELECT 
      c.id, c.full_name, c.email, c.mobile, c.created_at,
      COUNT(b.id) as total_bookings,
      COALESCE(SUM(b.total_amount), 0) as total_spent
    FROM users c
    LEFT JOIN bookings b ON (b.customer_id = c.id OR b.customer_email = c.email)
    WHERE c.role = 'customer'
  `;
    const params = [];
    if (search) {
        query += ' AND (c.full_name LIKE ? OR c.email LIKE ? OR c.mobile LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }
    query += ' GROUP BY c.id ORDER BY c.id DESC';
    const customers = await db.prepare(query).all(...params);
    return res.json({ customers });
});
// GET /api/admin/customers/:id - Customer Detail Profile
router.get('/admin/:id', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const customer = await db.prepare('SELECT id, full_name, email, mobile, created_at FROM users WHERE id = ? AND role = "customer"').get(req.params.id);
    if (!customer)
        return res.status(404).json({ error: 'Customer profile not found' });
    const bookings = await db.prepare('SELECT * FROM bookings WHERE customer_id = ? OR customer_email = ? ORDER BY id DESC').all(customer.id, customer.email);
    const totalSpent = (await db.prepare('SELECT SUM(total_amount) as total FROM bookings WHERE (customer_id = ? OR customer_email = ?) AND booking_status != "cancelled"').get(customer.id, customer.email))?.total || 0;
    return res.json({
        customer: {
            ...customer,
            total_spent: totalSpent,
            bookings,
        },
    });
});

module.exports = router;
