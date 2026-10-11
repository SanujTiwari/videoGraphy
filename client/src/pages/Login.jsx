import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';

// Login page: one switch for "User" (mobile + OTP) and "Admin / Owner" (email + OTP)
export const Login = () => {
    const { saveLogin } = useAuth();
    const navigate = useNavigate();

    const [who, setWho] = useState('user'); // 'user' or 'admin'
    const [otpSent, setOtpSent] = useState(false);
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const reset = () => {
        setOtpSent(false);
        setOtp('');
        setMessage('');
        setError('');
    };

    const chooseWho = (value) => {
        setWho(value);
        reset();
    };

    // Step 1: send the OTP
    const sendOtp = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        setMessage('');
        try {
            let data;
            if (who === 'user') {
                data = await apiRequest('/auth/user/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) });
            } else {
                data = await apiRequest('/auth/admin/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
            }
            setOtpSent(true);
            // dev_otp only comes back when SMS / email is not set up on the server (testing)
            setMessage(data.dev_otp ? `${data.message} (Test mode OTP: ${data.dev_otp})` : data.message);
        } catch (err) {
            setError(err.message);
        }
        setBusy(false);
    };

    // Step 2: check the OTP and log in
    const verifyOtp = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            let data;
            if (who === 'user') {
                data = await apiRequest('/auth/user/verify-otp', { method: 'POST', body: JSON.stringify({ mobile, otp }) });
            } else {
                data = await apiRequest('/auth/admin/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
            }
            const user = saveLogin(data);
            navigate(user.role === 'customer' ? '/portal' : '/admin/dashboard');
        } catch (err) {
            setError(err.message);
        }
        setBusy(false);
    };

    const input = 'w-full rounded-xl border border-gold-300/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400';
    const switchButton = (value, text) => (
        <button type="button" onClick={() => chooseWho(value)}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${who === value ? 'gold-gradient-bg text-white' : 'text-charcoal-700 hover:bg-gold-50'}`}>
            {text}
        </button>
    );

    return (<>
      <PageHeader eyebrow="Welcome" title={who === 'user' ? 'Login as User' : 'Login as Admin / Owner'}/>
      <section className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-gold-300/40 rounded-3xl p-8 shadow-sm space-y-5">

          {/* Switch: User / Admin */}
          <div className="flex gap-1 bg-gold-50 border border-gold-300/40 rounded-full p-1">
            {switchButton('user', 'User')}
            {switchButton('admin', 'Admin / Owner')}
          </div>

          <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-4">

            {/* User: only the mobile number with permanent +91 prefix */}
            {who === 'user' && (
              <div className="flex rounded-xl border border-gold-300/60 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-gold-400">
                <span className="inline-flex items-center px-3.5 bg-gold-50 border-r border-gold-300/40 text-charcoal-700 font-semibold text-sm select-none">
                  +91
                </span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="w-full px-3.5 py-3 text-sm bg-transparent focus:outline-none placeholder:text-charcoal-400"
                  placeholder="Enter 10-digit mobile number"
                  disabled={otpSent}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            )}

            {/* Admin: email */}
            {who === 'admin' && (
              <input required type="email" className={input} placeholder="Authorized Admin Email" disabled={otpSent} value={email} onChange={(e) => setEmail(e.target.value)}/>
            )}

            {otpSent && (
              <input required inputMode="numeric" maxLength={6} className={input} placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}/>
            )}

            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button disabled={busy} className="w-full gold-gradient-bg text-white font-semibold py-3 rounded-full disabled:opacity-60">
              {busy ? 'Please wait...' : otpSent ? 'Verify OTP & Login' : 'Send OTP'}
            </button>

            {otpSent && (
              <button type="button" onClick={reset} className="w-full text-sm text-gold-700 hover:underline">
                Change {who === 'user' ? 'number' : 'email'} / send OTP again
              </button>
            )}
          </form>

          {who === 'user' && (
            <p className="text-xs text-center text-charcoal-500">New here? Just enter your mobile number. Your account is created automatically.</p>
          )}
        </div>
      </section>
    </>);
};

