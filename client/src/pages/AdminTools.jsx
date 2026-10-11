import React, { useEffect, useState } from 'react';
import { apiRequest, SERVER_URL } from '../api';
import { useAuth } from '../context/AuthContext';

// Admin tools used by AdminDashboard: chart, rates, photos, availability, settings.
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const box = 'bg-white border border-gold-300/40 rounded-2xl p-5 shadow-sm';
const input = 'rounded-xl border border-gold-300 bg-white px-3 py-2 text-sm w-full';
const button = 'gold-gradient-bg text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-60';

// ---------- Bookings per month (bar chart) ----------
export const MonthlyChart = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        apiRequest('/reports/monthly').then(setData).catch(() => {});
    }, []);

    if (!data) return null;
    const biggest = Math.max(1, ...data.months.map((m) => m.bookings));

    return (<div className={box}>
      <div className="flex flex-wrap justify-between gap-2 mb-4">
        <h3 className="font-serif font-bold">Bookings per month</h3>
        <p className="text-sm text-charcoal-600">
          This month: <b>{data.this_month.bookings}</b> bookings · {money(data.this_month.revenue)}
        </p>
      </div>
      <div className="flex items-end gap-2 h-48">
        {data.months.map((m) => (<div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m.month}: ${m.bookings} bookings, ${money(m.revenue)}`}>
            <span className="text-[10px] text-charcoal-500 mb-1">{m.bookings}</span>
            <div className="w-full rounded-t-md bg-gold-500" style={{ height: `${(m.bookings / biggest) * 100}%`, minHeight: m.bookings ? 4 : 2 }}/>
            <span className="text-[10px] text-charcoal-500 mt-1">{m.label}</span>
          </div>))}
      </div>
    </div>);
};

// ---------- Package rates ----------
const RateRow = ({ pkg, onSaved }) => {
    const [form, setForm] = useState({
        price: pkg.price ?? '',
        price_max: pkg.price_max ?? '',
        original_price: pkg.original_price ?? '',
        discount_amount: pkg.discount_amount ?? '',
        discount_percent: pkg.discount_percent ?? '',
    });
    const [message, setMessage] = useState('');

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const save = async () => {
        setMessage('');
        try {
            await apiRequest(`/packages/admin/${pkg.id}/rates`, { method: 'PATCH', body: JSON.stringify(form) });
            setMessage('Saved ✓');
            onSaved();
        } catch (err) {
            setMessage(err.message);
        }
    };

    const field = (key, text) => (<label className="text-xs text-charcoal-500 space-y-1 block">
        {text}
        <input type="number" min="0" className={input} value={form[key]} onChange={set(key)}/>
      </label>);

    return (<div className={box}>
      <h4 className="font-serif font-bold text-lg mb-3">{pkg.name}</h4>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        {field('price', 'Final price (₹)')}
        {field('price_max', 'Final price up to (₹, optional)')}
        {field('original_price', 'Original price (₹, optional)')}
        {field('discount_amount', 'Discount amount (₹, optional)')}
        {field('discount_percent', 'Discount % (optional)')}
      </div>
      <div className="flex items-center gap-4 mt-4">
        <button onClick={save} className={button}>Save rates</button>
        <span className="text-sm text-charcoal-600">{message}</span>
      </div>
    </div>);
};

export const PackageRates = () => {
    const [packages, setPackages] = useState([]);
    const load = () => apiRequest('/packages').then((d) => setPackages(d.packages || [])).catch(() => {});
    useEffect(() => { load(); }, []);

    return (<div className="space-y-4">
      <p className="text-sm text-charcoal-600">Leave optional boxes empty if they do not apply. The website card updates automatically.</p>
      {packages.map((p) => <RateRow key={`${p.id}-${p.price}`} pkg={p} onSaved={load}/>)}
    </div>);
};

// ---------- Photos ----------
export const Photos = () => {
    const [photos, setPhotos] = useState([]);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Wedding');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => apiRequest('/gallery').then((d) => setPhotos(d.photos || [])).catch(() => {});
    useEffect(() => { load(); }, []);

    const upload = (e) => {
        e.preventDefault();
        if (!file) return setMessage('Please choose a photo');
        setBusy(true);
        setMessage('');
        // Convert the photo to text (data URL) so it can be sent as JSON
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await apiRequest('/gallery/admin', { method: 'POST', body: JSON.stringify({ title, category, image_data: reader.result }) });
                setTitle('');
                setFile(null);
                e.target.reset();
                setMessage('Photo added ✓');
                load();
            } catch (err) {
                setMessage(err.message);
            }
            setBusy(false);
        };
        reader.readAsDataURL(file);
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this photo?')) return;
        await apiRequest(`/gallery/admin/${id}`, { method: 'DELETE' });
        load();
    };

    return (<div className="space-y-6">
      <form onSubmit={upload} className={`${box} grid md:grid-cols-4 gap-3 items-end`}>
        <input required className={input} placeholder="Photo title" value={title} onChange={(e) => setTitle(e.target.value)}/>
        <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {['Wedding', 'Pre-wedding', 'Haldi', 'Mehendi', 'Reception', 'Drone'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input required type="file" accept="image/jpeg,image/png,image/webp" className={input} onChange={(e) => setFile(e.target.files[0])}/>
        <button disabled={busy} className={button}>{busy ? 'Uploading...' : 'Add photo'}</button>
        {message && <p className="md:col-span-4 text-sm text-charcoal-600">{message}</p>}
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {photos.map((p) => (<div key={p.id} className="bg-white border border-gold-300/40 rounded-2xl overflow-hidden">
            <img src={SERVER_URL + p.image_url} alt={p.title} className="h-40 w-full object-cover"/>
            <div className="p-3 flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{p.title}</p>
                <p className="text-xs text-charcoal-500">{p.category}</p>
              </div>
              <button onClick={() => remove(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          </div>))}
        {photos.length === 0 && <p className="text-sm text-charcoal-500">No photos uploaded yet.</p>}
      </div>
    </div>);
};

// ---------- Availability ----------
export const AvailabilityManager = () => {
    const [data, setData] = useState({ blocked_dates: [], booked_events: [] });
    const [date, setDate] = useState('');
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');

    const load = () => apiRequest('/availability').then(setData).catch(() => {});
    useEffect(() => { load(); }, []);

    const block = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await apiRequest('/availability/admin/block', { method: 'POST', body: JSON.stringify({ date, reason }) });
            setDate('');
            setReason('');
            load();
        } catch (err) {
            setMessage(err.message);
        }
    };

    const unblock = async (id) => {
        await apiRequest(`/availability/admin/block/${id}`, { method: 'DELETE' });
        load();
    };

    const booked = [...data.booked_events].sort((a, b) => a.event_date.localeCompare(b.event_date));

    return (<div className="grid lg:grid-cols-2 gap-6">
      <div className={`${box} space-y-4`}>
        <h3 className="font-serif font-bold">Block a date (holiday / closed)</h3>
        <form onSubmit={block} className="flex flex-wrap gap-3">
          <input required type="date" className={`${input} !w-auto`} value={date} onChange={(e) => setDate(e.target.value)}/>
          <input className={`${input} flex-1 min-w-40`} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)}/>
          <button className={button}>Block</button>
        </form>
        {message && <p className="text-sm text-red-600">{message}</p>}
        {data.blocked_dates.length === 0 && <p className="text-sm text-charcoal-500">No blocked dates.</p>}
        {data.blocked_dates.map((b) => (<div key={b.id} className="flex justify-between text-sm py-1.5 border-b border-gold-100">
            <span>{b.date} <span className="text-charcoal-500">- {b.reason}</span></span>
            <button onClick={() => unblock(b.id)} className="text-xs text-red-600 hover:underline">Unblock</button>
          </div>))}
      </div>

      <div className={`${box} space-y-2`}>
        <h3 className="font-serif font-bold">Approved bookings (locked dates &amp; times)</h3>
        <p className="text-xs text-charcoal-500">Customers cannot book these dates at the same time. To free a slot, change the booking status in the Bookings tab.</p>
        {booked.length === 0 && <p className="text-sm text-charcoal-500">No approved bookings yet.</p>}
        {booked.map((b) => (<div key={b.booking_ref} className="flex justify-between text-sm py-1.5 border-b border-gold-100">
            <span>{b.event_date} · {b.event_start_time} - {b.event_end_time}</span>
            <span className="text-charcoal-500">{b.booking_ref} ({b.event_type})</span>
          </div>))}
      </div>
    </div>);
};

// ---------- Admin settings: change email / backup email with OTP ----------
const EmailChanger = ({ field, title, current }) => {
    const { saveLogin } = useAuth();
    const [newEmail, setNewEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState('');

    const sendOtp = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const data = await apiRequest('/auth/admin/change-email', { method: 'POST', body: JSON.stringify({ field, new_email: newEmail }) });
            setSent(true);
            setMessage(data.dev_otp ? `${data.message} (Test mode OTP: ${data.dev_otp})` : data.message);
        } catch (err) {
            setMessage(err.message);
        }
    };

    const confirm = async (e) => {
        e.preventDefault();
        try {
            const data = await apiRequest('/auth/admin/confirm-email', { method: 'POST', body: JSON.stringify({ field, new_email: newEmail, otp }) });
            saveLogin(data);
            setSent(false);
            setNewEmail('');
            setOtp('');
            setMessage(data.message);
        } catch (err) {
            setMessage(err.message);
        }
    };

    return (<form onSubmit={sent ? confirm : sendOtp} className={`${box} space-y-3`}>
      <h3 className="font-serif font-bold">{title}</h3>
      <p className="text-sm text-charcoal-600">Current: <b>{current || 'Not set'}</b></p>
      <input required type="email" disabled={sent} className={input} placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}/>
      {sent && <input required maxLength={6} className={input} placeholder="OTP sent to the new email" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}/>}
      <button className={button}>{sent ? 'Verify & save' : 'Send OTP'}</button>
      {message && <p className="text-sm text-charcoal-600">{message}</p>}
    </form>);
};

export const AdminSettings = () => {
    const { user } = useAuth();
    return (<div className="grid lg:grid-cols-2 gap-6">
      <EmailChanger field="email" title="Change admin email" current={user.email}/>
      <EmailChanger field="backup_email" title="Backup email (can also be used to log in)" current={user.backup_email}/>
    </div>);
};
