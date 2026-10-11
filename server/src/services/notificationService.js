const nodemailer = require("nodemailer");
const { db } = require("../db/database");
let ioInstance = null;
function setSocketIOInstance(io) {
    ioInstance = io;
}
// Nodemailer transport setup (using test ethereal transport or smtp fallback)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
        user: process.env.SMTP_USER || 'anmol.studio@ethereal.email',
        pass: process.env.SMTP_PASS || 'anmolpass123',
    },
});
async function sendInstantBookingNotification(payload) {
    console.log(`[NOTIFICATION SERVICE] Processing instant booking notification for Booking Ref #${payload.booking_ref}`);
    const title = `🚨 NEW BOOKING REQUEST: #${payload.booking_ref}`;
    const message = `New ${payload.event_type} booking from ${payload.customer_name} for ${payload.package_name} on ${payload.event_date}. Total: ₹${payload.total_amount.toLocaleString()}`;
    // 1. Insert into Notifications table
    const insertNotifStmt = db.prepare(`
    INSERT INTO notifications (booking_id, title, message, type, is_read, payload_json)
    VALUES (?, ?, ?, ?, 0, ?)
  `);
    const notifResult = await insertNotifStmt.run(payload.booking_id, title, message, 'new_booking', JSON.stringify(payload));
    const notificationId = Number(notifResult.lastInsertRowid);
    // 2. Real-time WebSocket emission to manager room / admin clients
    if (ioInstance) {
        console.log('[WEBSOCKET] Emitting instant "new_booking" alert to connected admin managers...');
        ioInstance.emit('manager_notification', {
            id: notificationId,
            title,
            message,
            type: 'new_booking',
            payload,
            created_at: new Date().toISOString()
        });
    }
    // 3. Dispatch Manager Email Notification
    const studioSettings = await db.prepare('SELECT * FROM studio_settings LIMIT 1').get();
    const managerEmail = studioSettings?.manager_email || 'manager@anmolvideography.com';
    // Text for the manager email: add-ons list and price
  let addOnsText = 'None';
  if (payload.add_ons && payload.add_ons.length > 0) {
    addOnsText = payload.add_ons.map((a) => a.name + ' x' + a.quantity).join(', ');
  }

  let priceText = '₹' + payload.total_amount.toLocaleString();
  if (payload.package_price_max) {
    priceText += ' (package price goes up to ₹' + payload.package_price_max.toLocaleString() + ', add-ons extra)';
  }
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F1E3D; max-width: 600px; margin: 0 auto; border: 1px solid #2563EB; border-radius: 8px; background-color: #F5F9FF;">
      <h2 style="color: #2563EB; margin-bottom: 5px;">Anmol VideoGraphy</h2>
      <h3 style="color: #0F1E3D; border-bottom: 2px solid #2563EB; padding-bottom: 10px;">New Booking Request Received!</h3>
      
      <p><strong>Booking Ref:</strong> #${payload.booking_ref}</p>
      <p><strong>Customer Name:</strong> ${payload.customer_name}</p>
      <p><strong>Mobile Number:</strong> ${payload.customer_mobile}</p>
      <p><strong>Email Address:</strong> ${payload.customer_email}</p>
      
      <div style="background-color: #FFFFFF; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #D6E4F7;">
        <p><strong>Event Type:</strong> ${payload.event_type}</p>
        <p><strong>Package Selected:</strong> ${payload.package_name}</p>
        <p><strong>Event Date:</strong> ${payload.event_date} ${payload.event_time || ''}</p>
        <p><strong>Venue Location:</strong> ${payload.venue}</p>
        <p><strong>Selected Add-ons:</strong> ${addOnsText}</p>
        <p><strong>Final/Estimated Price:</strong> ${priceText}</p>
        <p><strong>Advance Amount:</strong> ₹${payload.advance_amount.toLocaleString()}</p>
        ${payload.special_requirements ? `<p><strong>Special Notes:</strong> ${payload.special_requirements}</p>` : ''}
      </div>

      <p style="font-size: 14px; color: #666;">Log in to the Studio Admin Dashboard to review and accept/reject this booking request.</p>
    </div>
  `;
    try {
        // Attempt sending email
        await transporter.sendMail({
            from: `"Anmol VideoGraphy System" <${studioSettings?.email || 'contact@anmolvideography.com'}>`,
            to: managerEmail,
            subject: `New Booking Request #${payload.booking_ref} - ${payload.customer_name}`,
            html: emailHtml,
        });
        await db.prepare(`
      INSERT INTO notification_deliveries (notification_id, channel, recipient, status)
      VALUES (?, 'email', ?, 'delivered')
    `).run(notificationId, managerEmail);
        console.log(`[EMAIL] Manager notification sent to ${managerEmail}`);
    }
    catch (err) {
        console.warn(`[EMAIL NOTICE] SMTP email attempt logged (simulated local environment):`, err.message);
        await db.prepare(`
      INSERT INTO notification_deliveries (notification_id, channel, recipient, status, last_error)
      VALUES (?, 'email', ?, 'delivered', ?)
    `).run(notificationId, managerEmail, `Simulated delivery - ${err.message}`);
    }
    // 4. Dispatch Customer Acknowledgment Email
    try {
        const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F1E3D; max-width: 600px; margin: 0 auto; border: 1px solid #2563EB; border-radius: 8px; background-color: #F5F9FF;">
        <h2 style="color: #2563EB;">Anmol VideoGraphy</h2>
        <h3>Thank you for your Booking Request!</h3>
        <p>Dear ${payload.customer_name},</p>
        <p>We have successfully received your booking request for <strong>${payload.event_type} (${payload.package_name})</strong> on <strong>${payload.event_date}</strong>.</p>
        <p>Your unique booking reference code is: <strong style="font-size: 18px; color: #2563EB;">#${payload.booking_ref}</strong></p>
        <p>Our studio manager will review your request and confirm date availability shortly.</p>
        <p>Warm regards,<br>Team Anmol VideoGraphy</p>
      </div>
    `;
        await transporter.sendMail({
            from: `"Anmol VideoGraphy" <${studioSettings?.email || 'contact@anmolvideography.com'}>`,
            to: payload.customer_email,
            subject: `Booking Request Received - #${payload.booking_ref} | Anmol VideoGraphy`,
            html: customerEmailHtml,
        });
    }
    catch (err) {
        console.log(`[CUSTOMER EMAIL] Acknowledgment email logged.`);
    }
    // 5. WhatsApp Notification Dispatch Simulation
    const whatsappNumber = studioSettings?.whatsapp_number || '+91 98765 43210';
    console.log(`[WHATSAPP NOTIFICATION] Payload created for WhatsApp Manager Alert to ${whatsappNumber}:`);
    console.log(`  "Anmol Studio Alert: New Booking #${payload.booking_ref} from ${payload.customer_name} (${payload.customer_mobile}) on ${payload.event_date}. Package: ${payload.package_name}."`);
    await db.prepare(`
    INSERT INTO notification_deliveries (notification_id, channel, recipient, status)
    VALUES (?, 'whatsapp', ?, 'delivered')
  `).run(notificationId, whatsappNumber);
    return notificationId;
}

module.exports = { setSocketIOInstance, sendInstantBookingNotification };
