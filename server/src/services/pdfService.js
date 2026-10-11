const pdfkit = require("pdfkit");
function generateInvoicePDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit({ margin: 40 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', (err) => reject(err));
        // Header Header Colors
        const goldColor = '#C5A059';
        const darkColor = '#1A1A1A';
        const grayColor = '#555555';
        // Studio Header
        doc.fillColor(goldColor).fontSize(22).font('Helvetica-Bold').text(data.studioSettings.name.toUpperCase(), 40, 40);
        doc.fillColor(grayColor).fontSize(9).font('Helvetica-Oblique').text(data.studioSettings.tagline, 40, 68);
        doc.fillColor(grayColor).fontSize(9).font('Helvetica').text(data.studioSettings.address, 40, 82);
        doc.text(`Phone: ${data.studioSettings.mobile} | Email: ${data.studioSettings.email}`, 40, 96);
        // Invoice Title
        doc.fillColor(darkColor).fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 40, { align: 'right' });
        doc.fillColor(grayColor).fontSize(10).font('Helvetica').text(`Invoice #: ${data.invoiceNumber}`, 400, 68, { align: 'right' });
        doc.text(`Date: ${data.issueDate}`, 400, 82, { align: 'right' });
        doc.text(`Due Date: ${data.dueDate}`, 400, 96, { align: 'right' });
        // Horizontal Line
        doc.moveTo(40, 115).lineTo(570, 115).strokeColor('#EAE1D7').lineWidth(1.5).stroke();
        // Bill To Section
        doc.fillColor(goldColor).fontSize(12).font('Helvetica-Bold').text('BILLED TO:', 40, 130);
        doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text(data.customerName, 40, 148);
        doc.fillColor(grayColor).fontSize(9).font('Helvetica').text(`Email: ${data.customerEmail}`, 40, 164);
        doc.text(`Mobile: ${data.customerMobile}`, 40, 178);
        // Event Info Section
        doc.fillColor(goldColor).fontSize(12).font('Helvetica-Bold').text('EVENT DETAILS:', 320, 130);
        doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(`Booking Ref: #${data.bookingRef}`, 320, 148);
        doc.text(`Event: ${data.eventType} (${data.packageName})`, 320, 164);
        doc.text(`Date & Venue: ${data.eventDate} | ${data.venue}`, 320, 178);
        // Table Header
        const tableTop = 215;
        doc.rect(40, tableTop, 530, 25).fill('#FAF7F2');
        doc.fillColor(goldColor).fontSize(10).font('Helvetica-Bold').text('DESCRIPTION', 50, tableTop + 7);
        doc.text('AMOUNT (INR)', 450, tableTop + 7, { align: 'right' });
        let position = tableTop + 32;
        // Line items
        data.lineItems.forEach((item) => {
            doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(item.description, 50, position);
            doc.text(`₹${item.amount.toLocaleString()}`, 450, position, { align: 'right' });
            position += 20;
        });
        doc.moveTo(40, position).lineTo(570, position).strokeColor('#EAE1D7').lineWidth(1).stroke();
        position += 15;
        // Financial Totals
        doc.fontSize(10).font('Helvetica-Bold').text('Subtotal:', 350, position);
        doc.font('Helvetica').text(`₹${(data.totalAmount - data.taxAmount).toLocaleString()}`, 450, position, { align: 'right' });
        position += 18;
        if (data.taxAmount > 0) {
            doc.font('Helvetica-Bold').text('GST Tax (18%):', 350, position);
            doc.font('Helvetica').text(`₹${data.taxAmount.toLocaleString()}`, 450, position, { align: 'right' });
            position += 18;
        }
        doc.font('Helvetica-Bold').fontSize(11).text('Grand Total:', 350, position);
        doc.font('Helvetica-Bold').fontSize(11).text(`₹${data.totalAmount.toLocaleString()}`, 450, position, { align: 'right' });
        position += 22;
        doc.fillColor('#2E7D32').font('Helvetica-Bold').text('Advance Paid:', 350, position);
        doc.text(`₹${data.advancePaid.toLocaleString()}`, 450, position, { align: 'right' });
        position += 20;
        doc.fillColor('#C62828').font('Helvetica-Bold').fontSize(12).text('Balance Due:', 350, position);
        doc.text(`₹${data.balanceDue.toLocaleString()}`, 450, position, { align: 'right' });
        position += 35;
        // Cancellation Policy & Terms
        doc.fillColor(goldColor).fontSize(10).font('Helvetica-Bold').text('TERMS & CANCELLATION POLICY:', 40, position);
        position += 16;
        doc.fillColor(grayColor).fontSize(8).font('Helvetica').text(data.studioSettings.cancellation_policy, 40, position, { width: 510 });
        // Footer Signature
        doc.fillColor(goldColor).fontSize(9).font('Helvetica-Oblique').text('Thank you for choosing Anmol VideoGraphy for your timeless wedding memories.', 40, 720, { align: 'center' });
        doc.end();
    });
}

module.exports = { generateInvoicePDF };
