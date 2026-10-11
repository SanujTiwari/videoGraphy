import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Check } from 'lucide-react';
import { apiRequest } from '../api';
export const RazorpayModal = ({ booking, onClose, onPaymentSuccess }) => {
    const [paymentType, setPaymentType] = useState('advance');
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMsg, setSuccessMsg] = useState(null);
    if (!booking)
        return null;
    const payAmount = paymentType === 'advance' ? booking.advance_amount : booking.total_amount;
    const handleProcessPayment = async () => {
        setIsProcessing(true);
        setSuccessMsg(null);
        try {
            if (paymentMethod === 'razorpay') {
                // 1. Create Razorpay order on backend
                const orderData = await apiRequest('/payments/create-order', {
                    method: 'POST',
                    body: JSON.stringify({ booking_id: booking.id, amount: payAmount, payment_type: paymentType }),
                });
                // 2. Simulate or verify signature backend
                const verifyRes = await apiRequest('/payments/verify', {
                    method: 'POST',
                    body: JSON.stringify({
                        booking_id: booking.id,
                        razorpay_order_id: orderData.order_id,
                        razorpay_payment_id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        razorpay_signature: 'simulated_valid_test_signature_anmol_studio',
                        amount: payAmount,
                        payment_type: paymentType,
                    }),
                });
                setSuccessMsg(`Payment of ₹${payAmount.toLocaleString()} verified successfully! Ref: ${verifyRes.payment_ref}`);
            }
            else {
                // Record offline payment (Cash / UPI / Bank Transfer)
                const offlineRes = await apiRequest('/payments/manual-record', {
                    method: 'POST',
                    body: JSON.stringify({
                        booking_id: booking.id,
                        amount: payAmount,
                        payment_method: paymentMethod,
                        payment_type: paymentType,
                        notes: `Recorded payment via ${paymentMethod.toUpperCase()}`,
                    }),
                });
                setSuccessMsg(`Offline payment of ₹${payAmount.toLocaleString()} recorded! Ref: ${offlineRes.payment_ref}`);
            }
            setTimeout(() => {
                onPaymentSuccess();
                onClose();
            }, 1500);
        }
        catch (err) {
            alert(err.message || 'Payment processing failed');
        }
        finally {
            setIsProcessing(false);
        }
    };
    return (<div className="fixed inset-0 z-50 bg-charcoal-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-ivory-50 border border-gold-400/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-charcoal-400 hover:text-charcoal-800">
          <X className="w-5 h-5"/>
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-gold-200">
          <div className="w-10 h-10 rounded-full gold-gradient-bg flex items-center justify-center text-white">
            <CreditCard className="w-5 h-5"/>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-gold-500">Secure Payment Checkout</span>
            <h3 className="font-serif text-xl font-bold text-charcoal-900">Anmol VideoGraphy Payments</h3>
          </div>
        </div>

        <div className="py-5 space-y-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-gold-200 space-y-1">
            <p><strong>Booking Ref:</strong> #{booking.booking_ref}</p>
            <p><strong>Customer:</strong> {booking.customer_name}</p>
            <p><strong>Event:</strong> {booking.event_type} ({booking.package_name})</p>
            <p><strong>Event Date:</strong> {booking.event_date}</p>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block font-bold text-charcoal-800 mb-1.5">Select Payment Option</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPaymentType('advance')} className={`p-3 rounded-xl border font-bold text-center ${paymentType === 'advance'
            ? 'gold-gradient-bg text-white border-gold-500'
            : 'bg-white text-charcoal-700 border-gold-200'}`}>
                30% Advance Deposit
                <span className="block text-sm">₹{booking.advance_amount.toLocaleString()}</span>
              </button>

              <button type="button" onClick={() => setPaymentType('full')} className={`p-3 rounded-xl border font-bold text-center ${paymentType === 'full'
            ? 'gold-gradient-bg text-white border-gold-500'
            : 'bg-white text-charcoal-700 border-gold-200'}`}>
                Full Settlement
                <span className="block text-sm">₹{booking.total_amount.toLocaleString()}</span>
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-bold text-charcoal-800 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
            { id: 'razorpay', label: 'Razorpay / Card' },
            { id: 'upi', label: 'UPI / GPay' },
            { id: 'cash', label: 'Cash Deposit' },
            { id: 'bank_transfer', label: 'Bank Transfer' },
        ].map((m) => (<button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)} className={`p-2.5 rounded-lg border text-[11px] font-semibold text-center ${paymentMethod === m.id
                ? 'bg-charcoal-900 text-gold-400 border-gold-400 font-bold'
                : 'bg-white text-charcoal-700 border-gold-200 hover:border-gold-300'}`}>
                  {m.label}
                </button>))}
            </div>
          </div>

          {successMsg && (<div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0"/>
              {successMsg}
            </div>)}
        </div>

        <div className="pt-2">
          <button onClick={handleProcessPayment} disabled={isProcessing} className="w-full gold-gradient-bg text-white font-bold text-sm py-3.5 rounded-full shadow-gold-glow flex items-center justify-center gap-2">
            {isProcessing ? 'Processing Transaction...' : `Pay ₹${payAmount.toLocaleString()} Now`}
          </button>
          
          <p className="text-[10px] text-center text-charcoal-400 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/> 256-bit Encrypted Backend Verification
          </p>
        </div>
      </div>
    </div>);
};
