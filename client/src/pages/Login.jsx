import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';

// Login page: supports customer email OTP and admin email OTP via Resend
export const Login = () => {
    const { saveLogin } = useAuth();
    const navigate = useNavigate();

    const [who, setWho] = useState('user'); // 'user' or 'admin'
    const [otpSent, setOtpSent] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const timerRef = useRef(null);

    useEffect(() => {
        if (cooldown > 0) {
            timerRef.current = setTimeout(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [cooldown]);

    const reset = () => {
        setOtpSent(false);
        setOtp('');
        setMessage('');
        setError('');
        setCooldown(0);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const chooseWho = (value) => {
        setWho(value);
        reset();
    };

    // Step 1: send the OTP
    const sendOtp = async (e) => {
        if (e) e.preventDefault();
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Please enter your email address');
            return;
        }

        setBusy(true);
        setError('');
        setMessage('');
        try {
            let data;
            if (who === 'user') {
                data = await apiRequest('/auth/user/send-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email: trimmedEmail })
                });
            } else {
                data = await apiRequest('/auth/admin/send-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email: trimmedEmail })
                });
            }
            setOtpSent(true);
            setCooldown(60); // 60-second cooldown
            // dev_otp only appears when email provider credentials are not configured
            setMessage(data.dev_otp ? `${data.message} (Test OTP: ${data.dev_otp})` : (data.message || 'Verification code sent to your email.'));
        } catch (err) {
            setError(err.message || 'Failed to send OTP. Please try again.');
        }
        setBusy(false);
    };

    // Step 2: check the OTP and log in
    const verifyOtp = async (e) => {
        e.preventDefault();
        const trimmedOtp = otp.trim();
        if (trimmedOtp.length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setBusy(true);
        setError('');
        try {
            let data;
            if (who === 'user') {
                data = await apiRequest('/auth/user/verify-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email: email.trim(), otp: trimmedOtp })
                });
            } else {
                data = await apiRequest('/auth/admin/verify-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email: email.trim(), otp: trimmedOtp })
                });
            }
            const user = saveLogin(data);
            navigate(user.role === 'customer' ? '/portal' : '/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Verification failed. Please check the OTP.');
        }
        setBusy(false);
    };

    const input = 'w-full rounded-xl border border-gold-300/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 transition-all placeholder:text-charcoal-400';
    const switchButton = (value, text) => (
        <button
            type="button"
            onClick={() => chooseWho(value)}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                who === value ? 'gold-gradient-bg text-white shadow-sm' : 'text-charcoal-700 hover:bg-gold-50'
            }`}
        >
            {text}
        </button>
    );

    return (
        <>
            <PageHeader
                eyebrow="Authentication"
                title={who === 'user' ? 'Customer Sign In' : 'Studio Management Login'}
            />
            <section className="max-w-md mx-auto px-4 py-16">
                <div className="bg-white border border-gold-300/40 rounded-3xl p-8 shadow-sm space-y-6">

                    {/* Switch: User / Admin */}
                    <div className="flex gap-1 bg-gold-50 border border-gold-300/40 rounded-full p-1">
                        {switchButton('user', 'Customer')}
                        {switchButton('admin', 'Admin / Studio Owner')}
                    </div>

                    <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-4">
                        {/* Email Address Input */}
                        <div>
                            <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
                                {who === 'user' ? 'Your Email Address' : 'Authorized Admin Email'}
                            </label>
                            <input
                                required
                                type="email"
                                autoComplete="email"
                                className={input}
                                placeholder={who === 'user' ? 'e.g. yourname@example.com' : 'e.g. admin@anmolvideography.com'}
                                disabled={otpSent || busy}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError('');
                                }}
                            />
                        </div>

                        {/* OTP Verification Input */}
                        {otpSent && (
                            <div className="animate-fadeIn">
                                <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
                                    6-Digit Verification Code
                                </label>
                                <input
                                    required
                                    autoFocus
                                    inputMode="numeric"
                                    maxLength={6}
                                    pattern="\d{6}"
                                    className={`${input} tracking-widest text-center text-lg font-bold`}
                                    placeholder="••••••"
                                    value={otp}
                                    disabled={busy}
                                    onChange={(e) => {
                                        setOtp(e.target.value.replace(/\D/g, ''));
                                        if (error) setError('');
                                    }}
                                />
                                <div className="flex justify-between items-center mt-2 text-xs">
                                    <span className="text-charcoal-500">Sent to {email}</span>
                                    {cooldown > 0 ? (
                                        <span className="text-gold-700 font-medium">Resend in {cooldown}s</span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => sendOtp()}
                                            className="text-gold-700 hover:text-gold-800 font-semibold underline disabled:opacity-50"
                                        >
                                            Resend OTP
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-800">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full gold-gradient-bg text-white font-semibold py-3.5 rounded-full shadow-sm hover:opacity-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        >
                            {busy ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Please wait...</span>
                                </>
                            ) : otpSent ? (
                                'Verify Code & Sign In'
                            ) : (
                                'Send Verification Code'
                            )}
                        </button>

                        {otpSent && (
                            <button
                                type="button"
                                onClick={reset}
                                disabled={busy}
                                className="w-full text-xs text-charcoal-500 hover:text-charcoal-800 underline text-center pt-1"
                            >
                                Change email address
                            </button>
                        )}
                    </form>

                    {who === 'user' && !otpSent && (
                        <p className="text-xs text-center text-charcoal-500">
                            New customer? Enter your email address to log in or create an account instantly.
                        </p>
                    )}
                    {who === 'admin' && !otpSent && (
                        <p className="text-xs text-center text-charcoal-500">
                            Admin access requires an authorized email configured in the studio settings.
                        </p>
                    )}
                </div>
            </section>
        </>
    );
};


