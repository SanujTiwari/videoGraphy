const { Router } = require("express");
const { db } = require("../db/database");
const { requireRole, authenticateToken } = require("../middleware/auth");
const { sendInstantBookingNotification } = require("../services/notificationService");
const router = Router();
// GET /api/admin/notifications - Get manager notifications
router.get('/admin', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const notifications = await db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all();
    const formatted = notifications.map((n) => ({
        ...n,
        payload: n.payload_json ? JSON.parse(n.payload_json) : null,
    }));
    const unreadCount = await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();
    return res.json({
        unread_count: unreadCount.count,
        notifications: formatted,
    });
});
// PATCH /api/admin/notifications/:id/read - Mark notification as read
router.patch('/admin/:id/read', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Notification marked as read' });
});
// PATCH /api/admin/notifications/read-all - Mark all as read
router.patch('/admin/read-all', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    await db.prepare('UPDATE notifications SET is_read = 1').run();
    return res.json({ message: 'All notifications marked as read' });
});
// POST /api/admin/notifications/test - Trigger test booking notification
router.post('/admin/test', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const notifId = await sendInstantBookingNotification({
        booking_id: 1,
        booking_ref: 'AV-TEST-9999',
        customer_name: 'Test Customer (Rohan & Neha)',
        customer_email: 'rohan.test@gmail.com',
        customer_mobile: '+91 99999 88888',
        event_type: 'Royal Wedding',
        package_name: 'Diamond Package',
        event_date: '2026-12-25',
        venue: 'Oberoi Udaivilas, Udaipur',
        total_amount: 249999,
        advance_amount: 75000,
        special_requirements: 'Test booking notification trigger for Studio Manager.',
    });
    return res.json({ message: 'Test notification sent successfully', notification_id: notifId });
});

module.exports = router;
