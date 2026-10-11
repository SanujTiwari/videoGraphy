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
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpStatus, setOtpStatus] = useState('idle'); // 'idle' | 'error' | 'success'
    const [shake, setShake] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const timerRef = useRef(null);
    const inputRefs = useRef([]);

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

    useEffect(() => {
        if (otpSent && inputRefs.current[0]) {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [otpSent]);

    const reset = () => {
        setOtpSent(false);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpStatus('idle');
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
        setOtpStatus('idle');
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
            setOtpDigits(['', '', '', '', '', '']);
            setCooldown(60); // 60-second cooldown
            setMessage(data.dev_otp ? `${data.message} (Test OTP: ${data.dev_otp})` : (data.message || 'Verification code sent to your email.'));
        } catch (err) {
            setError(err.message || 'Failed to send OTP. Please try again.');
        }
        setBusy(false);
    };

    // Verify OTP with a given 6-digit string
    const verifyOtpWithCode = async (code) => {
        const trimmedOtp = (code || otpDigits.join('')).trim();
        if (trimmedOtp.length !== 6) {
            setError('Please enter all 6 digits of the verification code');
            setOtpStatus('error');
            setShake(true);
            setTimeout(() => setShake(false), 500);
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
            // Success state - green boxes and Accepted text (matches Image 4)
            setOtpStatus('success');
            setMessage('Accepted');
            setTimeout(() => {
                const user = saveLogin(data);
                navigate(user.role === 'customer' ? '/portal' : '/admin/dashboard');
            }, 600);
        } catch (err) {
            // Error state - red boxes and error message (matches Image 3)
            setOtpStatus('error');
            setShake(true);
            setError(err.message || 'Incorrect code. Please try again');
            setTimeout(() => setShake(false), 500);
        }
        setBusy(false);
    };

    // Handle single digit input
    const handleDigitChange = (index, value) => {
        const cleanVal = value.replace(/\D/g, '');
        const newDigits = [...otpDigits];

        if (cleanVal.length > 0) {
            // Take the last entered character
            newDigits[index] = cleanVal.slice(-1);
            setOtpDigits(newDigits);
            if (otpStatus !== 'idle') setOtpStatus('idle');
            if (error) setError('');

            // Auto-focus next box
            if (index < 5) {
                inputRefs.current[index + 1]?.focus();
            }

            // If complete 6-digit entered, auto verify
            const completedCode = newDigits.join('');
            if (completedCode.length === 6) {
                verifyOtpWithCode(completedCode);
            }
        } else {
            // Cleared
            newDigits[index] = '';
            setOtpDigits(newDigits);
            if (otpStatus !== 'idle') setOtpStatus('idle');
        }
    };

    // Handle backspace and arrow navigation
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!otpDigits[index] && index > 0) {
                // Focus previous and clear
                e.preventDefault();
                const newDigits = [...otpDigits];
                newDigits[index - 1] = '';
                setOtpDigits(newDigits);
                inputRefs.current[index - 1]?.focus();
                if (otpStatus !== 'idle') setOtpStatus('idle');
            } else if (otpDigits[index]) {
                const newDigits = [...otpDigits];
                newDigits[index] = '';
                setOtpDigits(newDigits);
                if (otpStatus !== 'idle') setOtpStatus('idle');
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle paste of 6-digit OTP
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedText.length > 0) {
            const newDigits = pastedText.split('').concat(Array(6).fill('')).slice(0, 6);
            setOtpDigits(newDigits);
            if (otpStatus !== 'idle') setOtpStatus('idle');
            if (error) setError('');

            const nextFocusIndex = Math.min(pastedText.length, 5);
            inputRefs.current[nextFocusIndex]?.focus();

            if (pastedText.length === 6) {
                verifyOtpWithCode(pastedText);
            }
        }
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

                    <form onSubmit={otpSent ? (e) => { e.preventDefault(); verifyOtpWithCode(); } : sendOtp} className="space-y-4">
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

                        {/* 6-Digit Segmented OTP Verification Boxes */}
                        {otpSent && (
                            <div className="animate-fadeIn pt-1">
                                <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2.5">
                                    6-Digit Verification Code
                                </label>

                                {/* 6 Individual OTP Boxes (Matches Image 2, 3, 4) */}
                                <div
                                    className={`flex items-center justify-between gap-1.5 sm:gap-2.5 py-1 ${
                                        shake ? 'animate-otp-shake' : ''
                                    }`}
                                >
                                    {[0, 1, 2, 3, 4, 5].map((index) => {
                                        const boxClass = `otp-digit-box ${
                                            otpStatus === 'error'
                                                ? 'otp-box-error'
                                                : otpStatus === 'success'
                                                ? 'otp-box-success'
                                                : ''
                                        }`;

                                        return (
                                            <input
                                                key={index}
                                                ref={(el) => (inputRefs.current[index] = el)}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={1}
                                                disabled={busy || otpStatus === 'success'}
                                                value={otpDigits[index]}
                                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                onPaste={handlePaste}
                                                className={boxClass}
                                                aria-label={`Digit ${index + 1}`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Status Feedback under Boxes */}
                                {otpStatus === 'error' ? (
                                    /* Image 3: Red text below boxes */
                                    <p className="text-xs sm:text-sm text-red-600 font-medium mt-2 animate-fadeIn">
                                        {error || 'Incorrect code. Please try again'}
                                    </p>
                                ) : otpStatus === 'success' ? (
                                    /* Image 4: Green 'Accepted' text below boxes */
                                    <p className="text-xs sm:text-sm text-green-600 font-semibold mt-2 animate-fadeIn">
                                        Accepted
                                    </p>
                                ) : (
                                    <div className="flex justify-between items-center mt-2.5 text-xs">
                                        <span className="text-charcoal-500 truncate max-w-[200px]">
                                            Sent to {email}
                                        </span>
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
                                )}

                                {otpStatus !== 'error' && message && otpStatus !== 'success' && (
                                    <div className="rounded-xl bg-green-50 border border-green-200 p-2.5 text-xs text-green-800 mt-2">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        {error && !otpSent && (
                            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={busy || (otpSent && otpDigits.join('').length !== 6)}
                            className="w-full gold-gradient-bg text-white font-semibold py-3.5 rounded-full shadow-sm hover:opacity-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-2"
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


