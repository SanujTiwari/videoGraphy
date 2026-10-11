// OTP helper: creates, sends and checks one-time passwords.
// SMS goes through Twilio and email through SMTP. Both are optional.
// If they are not set up in .env, the OTP is printed in the server console
// and sent back as "dev_otp" so you can still test the login.
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { db } = require("../db/database");

const OTP_LIFETIME_MS = 5 * 60 * 1000; // OTP works for 5 minutes
const RESEND_WAIT_MS = 30 * 1000; // wait 30 seconds before asking for a new OTP
const MAX_TRIES = 5;

function hashCode(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function makeCode() {
    return String(crypto.randomInt(100000, 1000000)); // 6 digits
}

const fast2smsReady = () => !!process.env.FAST2SMS_API_KEY;
const smsReady = () => process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM;
const emailReady = () => process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

// Returns true when a real SMS was sent
async function sendSms(mobile, code) {
    const rawDigits = String(mobile).replace(/\D/g, '');
    const cleanTen = rawDigits.length === 12 && rawDigits.startsWith('91') ? rawDigits.slice(2) : rawDigits;

    // Option 1: Fast2SMS (Indian SMS gateway)
    if (fast2smsReady()) {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': process.env.FAST2SMS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'otp',
                variables_values: code,
                numbers: cleanTen
            })
        });
        const resData = await response.json();
        if (resData.return) return true;
        console.error('Fast2SMS error:', resData);
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

// Returns true when a real email was sent
async function sendEmail(email, code) {
    if (!emailReady()) return false;
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Your Anmol VideoGraphy login OTP',
        text: `Your OTP is ${code}. It is valid for 5 minutes. Do not share it with anyone.`,
    });
    return true;
}

// kind is "sms" or "email". target is the mobile number or the email.
// extra is any small text we want to remember (for example the admin name).
async function sendOtp(kind, target, purpose, extra) {
    const now = Date.now();
    const last = await db.prepare('SELECT created_at FROM otp_codes WHERE target = ? AND purpose = ? ORDER BY id DESC LIMIT 1').get(target, purpose);
    if (last && now - last.created_at < RESEND_WAIT_MS) {
        const error = new Error('Please wait 30 seconds before asking for a new OTP.');
        error.status = 429;
        throw error;
    }

    const code = makeCode();
    await db.prepare('DELETE FROM otp_codes WHERE target = ? AND purpose = ?').run(target, purpose);
    await db.prepare('INSERT INTO otp_codes (target, purpose, code_hash, extra, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(target, purpose, hashCode(code), extra || null, now + OTP_LIFETIME_MS, now);

    const sent = kind === 'sms' ? await sendSms(target, code) : await sendEmail(target, code);
    if (sent) return {};

    console.log(`[OTP - not sent, SMS/email is not set up] ${purpose} ${target} -> ${code}`);
    if (process.env.NODE_ENV === 'production') {
        throw new Error('OTP service is not configured.');
    }
    return { dev_otp: code };
}

// Returns { ok: true, extra } when the OTP is right, otherwise { ok: false, error }
async function checkOtp(target, purpose, code) {
    const row = await db.prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? ORDER BY id DESC LIMIT 1').get(target, purpose);
    if (!row) return { ok: false, error: 'Please request an OTP first.' };
    if (Date.now() > row.expires_at) return { ok: false, error: 'OTP has expired. Please request a new one.' };
    if (row.attempts >= MAX_TRIES) return { ok: false, error: 'Too many wrong tries. Please request a new OTP.' };

    if (row.code_hash !== hashCode(code)) {
        await db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
        return { ok: false, error: 'Wrong OTP. Please try again.' };
    }
    await db.prepare('DELETE FROM otp_codes WHERE id = ?').run(row.id);
    return { ok: true, extra: row.extra };
}

module.exports = { sendOtp, checkOtp };
