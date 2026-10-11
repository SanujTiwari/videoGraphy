import React, { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { apiRequest } from '../api';
export const Contact = () => {
    const [form, setForm] = useState({ name: '', mobile: '', email: '', event_type: 'Wedding', message: '' });
    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);
        try {
            const d = await apiRequest('/inquiries', { method: 'POST', body: JSON.stringify(form) });
            setStatus({ ok: true, text: d.message });
            setForm({ name: '', mobile: '', email: '', event_type: 'Wedding', message: '' });
        }
        catch (err) {
            setStatus({ ok: false, text: err.message });
        }
        finally {
            setSending(false);
        }
    };
    const input = 'w-full rounded-xl border border-gold-300/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400';
    return (<>
      <PageHeader eyebrow="Get In Touch" title="Contact Us" subtitle="Tell us about your celebration and we will get back to you shortly."/>
      <section className="max-w-6xl mx-auto px-4 py-10 sm:py-16 grid lg:grid-cols-5 gap-8 sm:gap-10">
        <div className="lg:col-span-2 space-y-5 text-sm text-charcoal-700">
          <div className="flex gap-3"><MapPin className="w-5 h-5 text-gold-500 shrink-0"/> 101 Royal Wedding Square, Studio Road, City Center</div>
          <div className="flex gap-3"><Phone className="w-5 h-5 text-gold-500 shrink-0"/> +91 98765 43210</div>
          <div className="flex gap-3"><Mail className="w-5 h-5 text-gold-500 shrink-0"/> contact@anmolvideography.com</div>
          <div className="flex gap-3"><Clock className="w-5 h-5 text-gold-500 shrink-0"/> Mon - Sat, 10:00 AM - 7:00 PM</div>
          <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-emerald-800 text-white px-5 py-3 rounded-full font-semibold">
            <MessageCircle className="w-4 h-4"/> Chat on WhatsApp
          </a>
        </div>

        <form onSubmit={submit} className="lg:col-span-3 bg-white border border-gold-300/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <input required className={input} placeholder="Full name" value={form.name} onChange={set('name')}/>
            <input required className={input} placeholder="Mobile number" value={form.mobile} onChange={set('mobile')}/>
          </div>
          <input required type="email" className={input} placeholder="Email address" value={form.email} onChange={set('email')}/>
          <select className={input} value={form.event_type} onChange={set('event_type')}>
            {['Wedding', 'Pre-wedding', 'Engagement', 'Haldi', 'Mehendi', 'Reception', 'Birthday', 'Other'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <textarea required rows={5} className={input} placeholder="Your message" value={form.message} onChange={set('message')}/>
          {status && <p className={`text-sm ${status.ok ? 'text-emerald-700' : 'text-red-600'}`}>{status.text}</p>}
          <button disabled={sending} className="gold-gradient-bg text-white font-semibold px-8 py-3 w-full sm:w-auto rounded-full disabled:opacity-60">
            {sending ? 'Sending...' : 'Send Inquiry'}
          </button>
        </form>
      </section>
    </>);
};
