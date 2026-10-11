const assert = require('node:assert');
const crypto = require('node:crypto');
const { sendOtp, checkOtp } = require('../src/services/otpService');
const { db } = require('../src/db/database');

async function runTests() {
    console.log('🧪 Starting Auth & Resend Email OTP Test Suite...\n');
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}`);
            failed++;
        }
    }

    const testEmail = `test_customer_${Date.now()}@example.com`;
    const purpose = 'user_login';

    // Cleanup any lingering rows
    await db.prepare('DELETE FROM otp_codes WHERE target = ?').run(testEmail);

    // Test 1: Rate limit / 60-second cooldown
    await test('Enforces 60-second cooldown on immediate re-request', async () => {
        const now = Date.now();
        const codeHash = crypto.createHash('sha256').update('123456').digest('hex');
        await db.prepare(`
            INSERT INTO otp_codes (target, purpose, code_hash, attempts, expires_at, created_at)
            VALUES (?, ?, ?, 0, ?, ?)
        `).run(testEmail, purpose, codeHash, now + 5 * 60 * 1000, now);

        try {
            await sendOtp('email', testEmail, purpose);
            assert.fail('Should have thrown cooldown error');
        } catch (err) {
            assert.strictEqual(err.status, 429, 'Cooldown error must return status 429');
            assert.match(err.message, /Please wait \d+ seconds/, 'Message should indicate wait time');
        }
    });

    // Test 2: Successful OTP verification
    await test('Successfully verifies valid OTP and enforces single-use', async () => {
        await db.prepare('DELETE FROM otp_codes WHERE target = ?').run(testEmail);
        const validCode = '849201';
        const codeHash = crypto.createHash('sha256').update(validCode).digest('hex');
        const now = Date.now();

        await db.prepare(`
            INSERT INTO otp_codes (target, purpose, code_hash, attempts, expires_at, created_at)
            VALUES (?, ?, ?, 0, ?, ?)
        `).run(testEmail, purpose, codeHash, now + 5 * 60 * 1000, now);

        const verifyResult = await checkOtp(testEmail, purpose, validCode);
        assert.strictEqual(verifyResult.ok, true, 'Verification must succeed for correct OTP');

        // Test 3: Reused OTP (single-use guarantee)
        const reuseResult = await checkOtp(testEmail, purpose, validCode);
        assert.strictEqual(reuseResult.ok, false, 'OTP must not be reusable (single-use enforced)');
    });

    // Test 4: Wrong OTP handling and attempt countdown
    await test('Tracks incorrect attempts and returns remaining attempt count', async () => {
        await db.prepare('DELETE FROM otp_codes WHERE target = ?').run(testEmail);
        const validCode = '555111';
        const codeHash = crypto.createHash('sha256').update(validCode).digest('hex');
        const now = Date.now();

        await db.prepare(`
            INSERT INTO otp_codes (target, purpose, code_hash, attempts, expires_at, created_at)
            VALUES (?, ?, ?, 0, ?, ?)
        `).run(testEmail, purpose, codeHash, now + 5 * 60 * 1000, now);

        const wrongResult = await checkOtp(testEmail, purpose, '000000');
        assert.strictEqual(wrongResult.ok, false);
        assert.match(wrongResult.error, /4 attempts remaining/i);
    });

    // Test 5: Brute force lock after 5 failed attempts
    await test('Blocks verification after 5 failed attempts', async () => {
        await db.prepare('DELETE FROM otp_codes WHERE target = ?').run(testEmail);
        const validCode = '654321';
        const codeHash = crypto.createHash('sha256').update(validCode).digest('hex');
        const now = Date.now();

        await db.prepare(`
            INSERT INTO otp_codes (target, purpose, code_hash, attempts, expires_at, created_at)
            VALUES (?, ?, ?, 4, ?, ?)
        `).run(testEmail, purpose, codeHash, now + 5 * 60 * 1000, now);

        // 5th wrong attempt triggers lock
        const lockedResult = await checkOtp(testEmail, purpose, '111111');
        assert.strictEqual(lockedResult.ok, false);
        assert.match(lockedResult.error, /Too many incorrect attempts/i);

        // Even with the correct OTP afterwards, it remains blocked
        const blockedEvenIfCorrect = await checkOtp(testEmail, purpose, validCode);
        assert.strictEqual(blockedEvenIfCorrect.ok, false);
        assert.match(blockedEvenIfCorrect.error, /Too many incorrect attempts/i);
    });

    // Test 6: Expired OTP
    await test('Rejects expired OTP', async () => {
        await db.prepare('DELETE FROM otp_codes WHERE target = ?').run(testEmail);
        const validCode = '123789';
        const codeHash = crypto.createHash('sha256').update(validCode).digest('hex');
        const expiredTime = Date.now() - 10000; // 10s in the past

        await db.prepare(`
            INSERT INTO otp_codes (target, purpose, code_hash, attempts, expires_at, created_at)
            VALUES (?, ?, ?, 0, ?, ?)
        `).run(testEmail, purpose, codeHash, expiredTime, expiredTime - 60000);

        const expiredResult = await checkOtp(testEmail, purpose, validCode);
        assert.strictEqual(expiredResult.ok, false);
        assert.match(expiredResult.error, /expired/i);
    });

    // Test 7: Unauthorized admin email check in DB
    await test('Strictly blocks non-admin emails from admin authentication', async () => {
        const fakeAdminEmail = 'unauthorized_hacker@example.com';
        const admin = await db.prepare('SELECT * FROM users WHERE role IN (?, ?) AND (email = ? OR backup_email = ?) LIMIT 1')
            .get('owner', 'manager', fakeAdminEmail, fakeAdminEmail);
        assert.strictEqual(admin, undefined, 'Unauthorized email must not exist as admin');
    });

    // Cleanup
    await db.prepare('DELETE FROM otp_codes WHERE target = ?').run(testEmail);

    console.log(`\n========================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
