// OTP helper: creates, sends and checks one-time passwords.
// Uses official Resend SDK as primary email provider, with SMTP fallback.
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const { db } = require("../db/database");

const OTP_LIFETIME_MS = (Number(process.env.OTP_EXPIRES_MINUTES) || 5) * 60 * 1000; // 5 minutes expiry
const RESEND_WAIT_MS = 60 * 1000; // 60-second cooldown between requests
const MAX_TRIES = 5; // Maximum 5 verification attempts per OTP

function hashCode(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function makeCode() {
    return String(crypto.randomInt(100000, 1000000)); // Cryptographically secure 6-digit OTP
}

const resendReady = () => !!process.env.RESEND_API_KEY;
const emailReady = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const fast2smsReady = () => !!(process.env.FAST2SMS_API_KEY || process.env.Fast2SMS_API_KEY);
const getFast2smsKey = () => process.env.FAST2SMS_API_KEY || process.env.Fast2SMS_API_KEY;
const smsReady = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

// Returns true when a real SMS was sent
async function sendSms(mobile, code) {
    const rawDigits = String(mobile).replace(/\D/g, '');
    const cleanTen = rawDigits.length === 12 && rawDigits.startsWith('91') ? rawDigits.slice(2) : rawDigits;

    // Option 1: Fast2SMS (Indian SMS gateway)
    if (fast2smsReady()) {
        const apiKey = getFast2smsKey();
        let response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'otp',
                variables_values: code,
                numbers: cleanTen
            })
        });
        let resData = await response.json();
        if (resData.return) return true;

        if (resData.status_code === 996 || !resData.return) {
            response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    route: 'q',
                    message: `Your Anmol VideoGraphy OTP is ${code}. Valid for 5 minutes.`,
                    language: 'english',
                    numbers: cleanTen
                })
            });
            resData = await response.json();
            if (resData.return) return true;
        }

        console.error('Fast2SMS delivery error status:', resData.status_code);
        if (resData.status_code === 999) {
            throw new Error('Fast2SMS: Please recharge minimum ₹100 in Fast2SMS wallet to activate API SMS delivery.');
        }
        if (resData.status_code === 996) {
            throw new Error('Fast2SMS: Please verify website in Fast2SMS OTP menu or recharge ₹100.');
        }
        throw new Error(resData.message || 'Could not send SMS via Fast2SMS');
    }

    // Option 2: Twilio
    if (!smsReady()) return false;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const to = cleanTen.length === 10 ? `+91${cleanTen}` : mobile;
    const body = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: `Your Anmol VideoGraphy OTP is ${code}. It is valid for 5 minutes.` });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!res.ok) throw new Error('Could not send SMS. Please try again.');
    return true;
}

// Sends OTP email: prioritizes Google SMTP (free for all users) with Resend fallback
async function sendEmail(email, code) {
    const htmlTemplate = `
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid #f1e5cc; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #92400e; font-size: 22px; margin: 0; font-weight: bold; letter-spacing: 0.5px;">ANMOL VIDEOGRAPHY</h2>
                <p style="color: #b45309; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">Wedding Studio Management</p>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Hello,</p>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Use the verification code below to complete your login. This code is confidential and valid for <strong>5 minutes</strong>.</p>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #78350f; font-family: 'Courier New', monospace;">${code}</span>
            </div>

            <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 20px 0 0;">
                • Single-use only<br />
                • Valid for 5 minutes<br />
                • Never share this code with anyone, including studio staff
            </p>

            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">If you did not request this OTP, please disregard this email.</p>
        </div>
    `;
    const textTemplate = `Your Anmol VideoGraphy login OTP is ${code}. It is valid for 5 minutes. Do not share it with anyone.`;

    // 1. Primary: Resend SDK (Uses HTTPS port 443, never blocked by Render cloud firewall, instant delivery)
    if (resendReady()) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const fromAddress = process.env.EMAIL_FROM || 'Anmol VideoGraphy <onboarding@resend.dev>';

            const { data, error } = await resend.emails.send({
                from: fromAddress,
                to: [email],
                subject: 'Your Anmol VideoGraphy Login OTP',
                html: htmlTemplate,
                text: textTemplate,
            });

            if (error) {
                console.error('Resend delivery notice:', error.message || error);
                // If Resend failed (e.g. unverified recipient domain on onboarding@resend.dev), try SMTP fallback if available
                if (!emailReady()) {
                    throw new Error(`Email delivery failed: ${error.message || 'Unable to send email via Resend'}`);
                }
            } else {
                return true;
            }
        } catch (err) {
            console.error('Resend delivery attempt failed:', err.message);
            if (!emailReady()) {
                throw err;
            }
        }
    }

    // 2. Secondary / Local: Google SMTP (Nodemailer with 5s strict timeout so it never hangs indefinitely)
    if (emailReady()) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false,
                connectionTimeout: 5000, // 5 seconds max connection timeout
                greetingTimeout: 5000,
                socketTimeout: 8000,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || `Anmol VideoGraphy <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Your Anmol VideoGraphy Login OTP',
                text: textTemplate,
                html: htmlTemplate,
            });
            return true;
        } catch (err) {
            console.error('SMTP delivery error:', err.message);
            throw new Error(`Email delivery failed: ${err.message}`);
        }
    }

    return false;
}

// kind is "sms" or "email". target is the mobile number or the email.
// extra is any small text we want to remember (for example the admin name).
async function sendOtp(kind, target, purpose, extra) {
    const now = Date.now();
    const last = await db.prepare('SELECT created_at FROM otp_codes WHERE target = ? AND purpose = ? ORDER BY id DESC LIMIT 1').get(target, purpose);
    
    // Enforce 60-second cooldown
    if (last && (now - last.created_at) < RESEND_WAIT_MS) {
        const remainingSec = Math.ceil((RESEND_WAIT_MS - (now - last.created_at)) / 1000);
        const error = new Error(`Please wait ${remainingSec} seconds before requesting a new OTP.`);
        error.status = 429;
        throw error;
    }

    const code = makeCode();
    await db.prepare('DELETE FROM otp_codes WHERE target = ? AND purpose = ?').run(target, purpose);
    await db.prepare('INSERT INTO otp_codes (target, purpose, code_hash, extra, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)')
        .run(target, purpose, hashCode(code), extra || null, now + OTP_LIFETIME_MS, now);

    const sent = kind === 'sms' ? await sendSms(target, code) : await sendEmail(target, code);
    if (sent) return {};

    // Safe fallback only in non-production when no provider credentials exist
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Email OTP delivery service is not configured on the server.');
    }
    return { dev_otp: code };
}

// Returns { ok: true, extra } when the OTP is right, otherwise { ok: false, error }
async function checkOtp(target, purpose, code) {
    const row = await db.prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? ORDER BY id DESC LIMIT 1').get(target, purpose);
    if (!row) return { ok: false, error: 'Please request an OTP first.' };
    if (Date.now() > row.expires_at) return { ok: false, error: 'OTP has expired. Please request a new one.' };
    if (row.attempts >= MAX_TRIES) return { ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' };

    if (row.code_hash !== hashCode(code)) {
        const nextAttempts = (row.attempts || 0) + 1;
        await db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
        if (nextAttempts >= MAX_TRIES) {
            return { ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
        }
        const remaining = MAX_TRIES - nextAttempts;
        return { ok: false, error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
    }

    // Single-use: delete row upon successful verification
    await db.prepare('DELETE FROM otp_codes WHERE id = ?').run(row.id);
    return { ok: true, extra: row.extra };
}

module.exports = { sendOtp, checkOtp };

