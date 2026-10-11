const { Router } = require("express");
const { db } = require("../db/database");
const { generateToken, authenticateToken, requireRole } = require("../middleware/auth");
const { sendOtp, checkOtp } = require("../services/otpService");
const router = Router();

const ADMIN_MARK = 'otp-admin'; // password_hash value that marks the real admin account
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keeps only the 10 digits of an Indian mobile number (removes +91, spaces, dashes)
function cleanMobile(mobile) {
    const digits = String(mobile || '').replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function cleanEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function publicUser(user) {
    return { id: user.id, email: user.email, full_name: user.full_name, mobile: user.mobile, role: user.role, backup_email: user.backup_email || null };
}

function sendToken(res, user, message) {
    const token = generateToken({ id: user.id, email: user.email, role: user.role, full_name: user.full_name });
    return res.json({ message, token, user: publicUser(user) });
}

// Sends the OTP and returns an error response if something fails
async function sendOtpOrFail(res, kind, target, purpose, extra) {
    try {
        const result = await sendOtp(kind, target, purpose, extra);
        return res.json({ message: kind === 'sms' ? 'OTP sent to your mobile number.' : 'OTP sent to your email.', ...result });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message });
    }
}

async function getAdmin() {
    return db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get('owner');
}

// ---------------- USER (email / mobile + OTP) ----------------

// POST /api/auth/user/send-otp
router.post('/user/send-otp', async (req, res) => {
    if (req.body.email) {
        const email = cleanEmail(req.body.email);
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        return sendOtpOrFail(res, 'email', email, 'user_login');
    }

    if (req.body.mobile) {
        const mobile = cleanMobile(req.body.mobile);
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
        }
        return sendOtpOrFail(res, 'sms', mobile, 'user_login');
    }

    return res.status(400).json({ error: 'Please provide a valid email address' });
});

// POST /api/auth/user/verify-otp (finds or creates customer account automatically)
router.post('/user/verify-otp', async (req, res) => {
    const otp = String(req.body.otp || '').trim();
    if (!otp) {
        return res.status(400).json({ error: 'Please provide the 6-digit OTP' });
    }

    if (req.body.email) {
        const email = cleanEmail(req.body.email);
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const result = await checkOtp(email, 'user_login', otp);
        if (!result.ok) return res.status(400).json({ error: result.error });

        let user = await db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(email);
        if (!user) {
            // New customer registration - role is strictly enforced by server as 'customer'
            const created = await db.prepare(`
              INSERT INTO users (email, password_hash, full_name, mobile, role, permissions)
              VALUES (?, '', 'Customer', '', 'customer', ?)
            `).run(email, JSON.stringify(['view_bookings']));
            user = await db.prepare('SELECT * FROM users WHERE id = ?').get(created.lastInsertRowid);
        }

        return sendToken(res, user, 'Login successful');
    }

    if (req.body.mobile) {
        const mobile = cleanMobile(req.body.mobile);
        const result = await checkOtp(mobile, 'user_login', otp);
        if (!result.ok) return res.status(400).json({ error: result.error });

        let user = await db.prepare('SELECT * FROM users WHERE role = ? AND (mobile = ? OR mobile = ?)').get('customer', mobile, `+91${mobile}`);
        if (!user) {
            const created = await db.prepare(`
              INSERT INTO users (email, password_hash, full_name, mobile, role, permissions)
              VALUES (?, '', 'Customer', ?, 'customer', ?)
            `).run(`${mobile}@mobile.local`, mobile, JSON.stringify(['view_bookings']));
            user = await db.prepare('SELECT * FROM users WHERE id = ?').get(created.lastInsertRowid);
        }
        return sendToken(res, user, 'Login successful');
    }

    return res.status(400).json({ error: 'Please provide email and OTP' });
});

// ---------------- ADMIN / OWNER (email + OTP) ----------------

// POST /api/auth/admin/send-otp
router.post('/admin/send-otp', async (req, res) => {
    const email = cleanEmail(req.body.email);
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });

    const admin = await db.prepare('SELECT * FROM users WHERE role IN (?, ?) AND (email = ? OR backup_email = ?) LIMIT 1').get('owner', 'manager', email, email);

    // Prevent email enumeration by returning a generic success message, or simply block it.
    // The requirement says: "Only an authorized email can request an admin OTP."
    if (!admin) {
        return res.status(403).json({ error: 'Unauthorized email address.' });
    }

    return sendOtpOrFail(res, 'email', email, 'admin_login');
});

// POST /api/auth/admin/verify-otp
router.post('/admin/verify-otp', async (req, res) => {
    const email = cleanEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    const admin = await db.prepare('SELECT * FROM users WHERE role IN (?, ?) AND (email = ? OR backup_email = ?) LIMIT 1').get('owner', 'manager', email, email);

    if (!admin) {
        return res.status(403).json({ error: 'Unauthorized email address.' });
    }

    const result = await checkOtp(email, 'admin_login', otp);
    if (!result.ok) return res.status(400).json({ error: result.error });

    return sendToken(res, admin, 'Login successful');
});

// POST /api/auth/admin/change-email  { field: 'email' | 'backup_email', new_email }
// Sends an OTP to the NEW email. Nothing changes until it is confirmed.
router.post('/admin/change-email', authenticateToken, requireRole(['owner']), async (req, res) => {
    const newEmail = cleanEmail(req.body.new_email);
    const field = req.body.field === 'backup_email' ? 'backup_email' : 'email';
    if (!emailRegex.test(newEmail)) return res.status(400).json({ error: 'Please enter a valid email address' });
    return sendOtpOrFail(res, 'email', newEmail, `admin_change_${field}`);
});

// POST /api/auth/admin/confirm-email  { field, new_email, otp }
router.post('/admin/confirm-email', authenticateToken, requireRole(['owner']), async (req, res) => {
    const newEmail = cleanEmail(req.body.new_email);
    const field = req.body.field === 'backup_email' ? 'backup_email' : 'email';
    const result = await checkOtp(newEmail, `admin_change_${field}`, String(req.body.otp || '').trim());
    if (!result.ok) return res.status(400).json({ error: result.error });

    await db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`).run(newEmail, req.user.id);
    const admin = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return sendToken(res, admin, field === 'email' ? 'Admin email changed.' : 'Backup email saved.');
});

// ---------------- Common ----------------

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
    const user = await db.prepare('SELECT id, email, full_name, mobile, role, backup_email, permissions, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
        user: {
            ...user,
            permissions: user.permissions ? JSON.parse(user.permissions) : [],
        },
    });
});

module.exports = router;
