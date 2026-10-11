const { Router } = require("express");
const { db } = require("../db/database");
const { generateInvoicePDF } = require("../services/pdfService");
const { requireRole, authenticateToken } = require("../middleware/auth");
const router = Router();
// GET /api/admin/invoices - Get all invoices
router.get('/admin/list', authenticateToken, requireRole(['owner', 'manager']), async (_req, res) => {
    const invoices = await db.prepare(`
    SELECT i.*, b.booking_ref, b.event_type, b.package_name
    FROM invoices i
    JOIN bookings b ON i.booking_id = b.id
    ORDER BY i.id DESC
  `).all();
    return res.json({ invoices });
});
// POST /api/admin/invoices/generate - Create invoice for a booking
router.post('/admin/generate', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
    const { booking_id, due_days } = req.body;
    if (!booking_id)
        return res.status(400).json({ error: 'booking_id is required' });
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
    if (!booking)
        return res.status(404).json({ error: 'Booking not found' });
    const invoiceNumber = `INV-${booking.booking_ref}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + (due_days || 7));
    const dueDate = dueDateObj.toISOString().split('T')[0];
    const totalPaid = (await db.prepare('SELECT SUM(amount) as total FROM payments WHERE booking_id = ? AND status = "success"').get(booking.id))?.total || 0;
    const balanceDue = Math.max(0, booking.total_amount - totalPaid);
    try {
        await db.prepare(`
      INSERT INTO invoices (invoice_number, booking_id, customer_name, customer_email, customer_mobile, total_amount, advance_paid, balance_due, tax_amount, status, issue_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)
    `).run(invoiceNumber, booking.id, booking.customer_name, booking.customer_email, booking.customer_mobile, booking.total_amount, totalPaid, balanceDue, 0, issueDate, dueDate);
    }
    catch (err) {
        // Update existing invoice if already generated
        await db.prepare(`
      UPDATE invoices
      SET advance_paid = ?, balance_due = ?, status = ?
      WHERE invoice_number = ?
    `).run(totalPaid, balanceDue, balanceDue === 0 ? 'paid' : 'issued', invoiceNumber);
    }
    return res.json({ message: 'Invoice generated successfully', invoice_number: invoiceNumber });
});
// GET /api/invoices/:number/pdf - Stream PDF download
router.get('/:number/pdf', async (req, res) => {
    const invoiceNumber = req.params.number;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(invoiceNumber);
    if (!invoice)
        return res.status(404).json({ error: 'Invoice not found' });
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(invoice.booking_id);
    const items = await db.prepare('SELECT * FROM booking_items WHERE booking_id = ?').all(invoice.booking_id);
    const studioSettings = await db.prepare('SELECT * FROM studio_settings LIMIT 1').get();
    const lineItems = items.map((i) => ({
        description: `${i.item_name} (${i.item_type}) x${i.quantity}`,
        amount: i.total_price,
    }));
    try {
        const pdfBuffer = await generateInvoicePDF({
            invoiceNumber: invoice.invoice_number,
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date,
            customerName: invoice.customer_name,
            customerEmail: invoice.customer_email,
            customerMobile: invoice.customer_mobile,
            bookingRef: booking ? booking.booking_ref : 'N/A',
            eventType: booking ? booking.event_type : 'Wedding Event',
            packageName: booking ? booking.package_name : 'Custom Package',
            venue: booking ? `${booking.venue}, ${booking.city}` : 'Main Venue',
            eventDate: booking ? booking.event_date : invoice.issue_date,
            lineItems: lineItems.length > 0 ? lineItems : [{ description: 'Wedding Photography & Videography Services', amount: invoice.total_amount }],
            totalAmount: invoice.total_amount,
            taxAmount: invoice.tax_amount,
            advancePaid: invoice.advance_paid,
            balanceDue: invoice.balance_due,
            status: invoice.status,
            studioSettings: {
                name: studioSettings?.name || 'Anmol VideoGraphy',
                tagline: studioSettings?.tagline || 'Capturing Eternal Memories with Cinematic Elegance',
                email: studioSettings?.email || 'contact@anmolvideography.com',
                mobile: studioSettings?.mobile || '+91 98765 43210',
                address: studioSettings?.address || 'City Center, India',
                cancellation_policy: studioSettings?.cancellation_policy || 'Standard studio cancellation terms apply.',
            },
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoiceNumber}.pdf`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        console.error('Error rendering PDF:', err);
        return res.status(500).json({ error: 'Failed to render invoice PDF' });
    }
});

module.exports = router;
