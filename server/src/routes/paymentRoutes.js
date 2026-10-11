const { Router } = require("express");
const { db } = require("../db/database");
const { createRazorpayOrder, verifyRazorpaySignature } = require("../services/paymentService");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// POST /api/payments/create-order - Create Razorpay payment order
router.post('/create-order', async (req, res) => {
    try {
        const { booking_id, amount, payment_type } = req.body;
        if (!booking_id || !amount) {
            return res.status(400).json({ error: 'booking_id and amount are required' });
        }
        const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        const order = await createRazorpayOrder({
            amount: Number(amount),
            receipt: `rcpt_${booking.booking_ref}_${Date.now()}`,
            notes: {
                booking_ref: booking.booking_ref,
                customer_name: booking.customer_name,
                payment_type: payment_type || 'advance',
            },
        });
        return res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency || 'INR',
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_AnmolStudioKey123',
            booking_ref: booking.booking_ref,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_mobile: booking.customer_mobile,
        });
    }
    catch (err) {
        console.error('Error creating payment order:', err);
        return res.status(500).json({ error: 'Failed to create payment order' });
    }
});
// POST /api/payments/verify - Backend signature verification
router.post('/verify', async (req, res) => {
    try {
        const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, payment_type } = req.body;
        if (!booking_id || !razorpay_order_id || !razorpay_payment_id) {
            return res.status(400).json({ error: 'Missing payment verification details' });
        }
        const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid payment signature verification failed' });
        }
        const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        const paymentAmount = Number(amount) || booking.advance_amount;
        const paymentRef = `PAY-${Date.now()}`;
        // Record Payment
        await db.prepare(`
      INSERT INTO payments (payment_ref, booking_id, amount, payment_method, payment_type, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, notes)
      VALUES (?, ?, ?, 'razorpay', ?, ?, ?, ?, 'success', ?)
    `).run(paymentRef, booking.id, paymentAmount, payment_type || 'advance', razorpay_order_id, razorpay_payment_id, razorpay_signature, `Online Razorpay Payment - ${payment_type || 'advance'}`);
        // Update Booking Payment Status & Status Workflow
        const totalPaid = (await db.prepare('SELECT SUM(amount) as total FROM payments WHERE booking_id = ? AND status = "success"').get(booking.id))?.total || paymentAmount;
        let newPaymentStatus = 'advance_paid';
        if (totalPaid >= booking.total_amount) {
            newPaymentStatus = 'fully_paid';
        }
        let newBookingStatus = booking.booking_status;
        if (booking.booking_status === 'pending' || booking.booking_status === 'awaiting_advance') {
            newBookingStatus = 'confirmed';
        }
        const newRemaining = Math.max(0, booking.total_amount - totalPaid);
        await db.prepare(`
      UPDATE bookings
      SET payment_status = ?, booking_status = ?, remaining_amount = ?
      WHERE id = ?
    `).run(newPaymentStatus, newBookingStatus, newRemaining, booking.id);
        // Status History
        await db.prepare(`
      INSERT INTO booking_status_history (booking_id, status, notes, changed_by_name)
      VALUES (?, ?, ?, 'Razorpay Payment Gateway')
    `).run(booking.id, newBookingStatus, `Payment of ₹${paymentAmount.toLocaleString()} verified. Payment Status: ${newPaymentStatus}`);
        // Audit Log
        await db.prepare(`
      INSERT INTO audit_logs (user_name, action, details)
      VALUES ('Razorpay Webhook', 'PAYMENT_VERIFIED', ?)
    `).run(`Payment ${paymentRef} of ₹${paymentAmount} verified for Booking #${booking.booking_ref}`);
        return res.json({
            message: 'Payment verified successfully!',
            payment_status: newPaymentStatus,
            booking_status: newBookingStatus,
            remaining_amount: newRemaining,
            payment_ref: paymentRef,
        });
    }
    catch (err) {
        console.error('Error verifying payment:', err);
        return res.status(500).json({ error: 'Failed to verify payment' });
    }
});
// POST /api/payments/manual-record - Record Offline Payments (Cash, UPI, Bank Transfer)
router.post('/manual-record', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { booking_id, amount, payment_method, payment_type, notes } = req.body;
    if (!booking_id || !amount || !payment_method) {
        return res.status(400).json({ error: 'booking_id, amount, and payment_method are required' });
    }
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
    if (!booking)
        return res.status(404).json({ error: 'Booking not found' });
    const paymentRef = `MAN-${Date.now()}`;
    const paymentAmount = Number(amount);
    await db.prepare(`
    INSERT INTO payments (payment_ref, booking_id, amount, payment_method, payment_type, status, notes)
    VALUES (?, ?, ?, ?, ?, 'success', ?)
  `).run(paymentRef, booking.id, paymentAmount, payment_method, payment_type || 'advance', notes || `Recorded by ${req.user?.full_name}`);
    // Recalculate totals
    const totalPaid = (await db.prepare('SELECT SUM(amount) as total FROM payments WHERE booking_id = ? AND status = "success"').get(booking.id))?.total || paymentAmount;
    let newPaymentStatus = 'advance_paid';
    if (totalPaid >= booking.total_amount) {
        newPaymentStatus = 'fully_paid';
    }
    let newBookingStatus = booking.booking_status;
    if (booking.booking_status === 'pending' || booking.booking_status === 'awaiting_advance') {
        newBookingStatus = 'confirmed';
    }
    const newRemaining = Math.max(0, booking.total_amount - totalPaid);
    await db.prepare(`
    UPDATE bookings
    SET payment_status = ?, booking_status = ?, remaining_amount = ?
    WHERE id = ?
  `).run(newPaymentStatus, newBookingStatus, newRemaining, booking.id);
    return res.json({ message: 'Offline payment recorded successfully', payment_ref: paymentRef });
});
// GET /api/admin/payments - Payment transaction list
router.get('/admin/list', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const payments = await db.prepare(`
    SELECT p.*, b.booking_ref, b.customer_name, b.event_type
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    ORDER BY p.id DESC
  `).all();
    return res.json({ payments });
});

module.exports = router;
