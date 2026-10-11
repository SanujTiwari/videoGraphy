import React from 'react';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
export const NotificationToast = () => {
    const { activeToast, dismissToast } = useNotifications();
    const navigate = useNavigate();
    if (!activeToast)
        return null;
    const payload = activeToast.payload || {};
    return (<div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-charcoal-900 border-2 border-gold-400 text-white rounded-2xl p-5 shadow-2xl animate-bounce-short">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gold-gradient-bg flex items-center justify-center text-white shadow-gold-glow">
            <Sparkles className="w-5 h-5 fill-white animate-spin"/>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-gold-400 font-bold block">Instant Booking Alert</span>
            <h4 className="font-serif text-lg font-bold text-white">{activeToast.title}</h4>
          </div>
        </div>
        <button onClick={dismissToast} className="text-charcoal-400 hover:text-white p-1 rounded-lg transition-colors">
          <X className="w-5 h-5"/>
        </button>
      </div>

      <div className="mt-3 bg-charcoal-800/80 rounded-xl p-3.5 border border-gold-400/20 text-xs space-y-1.5 text-ivory-200">
        <p><strong>Customer:</strong> {payload.customer_name} ({payload.customer_mobile})</p>
        <p><strong>Event & Package:</strong> {payload.event_type} | {payload.package_name}</p>
        <p><strong>Date & Venue:</strong> {payload.event_date} ({payload.venue || 'Venue'})</p>
        <p className="text-sm font-bold text-gold-400 pt-1">
          Total: ₹{payload.total_amount ? Number(payload.total_amount).toLocaleString() : 'N/A'} (Advance: ₹{payload.advance_amount ? Number(payload.advance_amount).toLocaleString() : 'N/A'})
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button onClick={dismissToast} className="text-xs text-charcoal-300 hover:text-white px-3 py-1.5">
          Dismiss
        </button>
        <button onClick={() => {
            dismissToast();
            navigate(`/admin/dashboard?bookingId=${payload.booking_id || ''}`);
        }} className="gold-gradient-bg text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-gold-glow hover:scale-105 transition-all">
          Review Booking <ArrowRight className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>);
};
