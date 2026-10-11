import React, { useEffect, useState } from 'react';
import { apiRequest, SERVER_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { Cloud, Upload, Trash2, Video, Image, Check, AlertCircle, Play, Key } from 'lucide-react';

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
// ---------- Media & Gallery (Cloudinary Integration) ----------
export const Photos = () => {
    const [photos, setPhotos] = useState([]);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Wedding');
    const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState('');
    const [storageStatus, setStorageStatus] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [busy, setBusy] = useState(false);

    const load = () => {
        apiRequest('/gallery').then((d) => setPhotos(d.photos || [])).catch(() => {});
        apiRequest('/gallery/storage-status').then(setStorageStatus).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) {
            setFile(null);
            setPreviewUrl(null);
            return;
        }

        // Auto detect media type
        if (selected.type.startsWith('video/')) {
            setMediaType('video');
        } else {
            setMediaType('image');
        }

        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
    };

    const upload = (e) => {
        e.preventDefault();
        if (!file) return setMessage('Please select a photo or video to upload.');
        setBusy(true);
        setMessage('');

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await apiRequest('/gallery/admin', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        category,
                        media_type: mediaType,
                        image_data: reader.result
                    })
                });
                setTitle('');
                setFile(null);
                setPreviewUrl(null);
                e.target.reset();
                setMessage(res.message || 'Media uploaded successfully.');
                load();
            } catch (err) {
                setMessage(err.message || 'Upload failed.');
            } finally {
                setBusy(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const remove = async (id, itemTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${itemTitle}"? This will permanently remove it from storage.`)) return;
        try {
            await apiRequest(`/gallery/admin/${id}`, { method: 'DELETE' });
            load();
        } catch (err) {
            alert(err.message || 'Failed to delete');
        }
    };

    const CATEGORIES = ['Wedding', 'Haldi', 'Mehendi', 'Pre-wedding', 'Reception', 'Drone / Films'];

    const filteredPhotos = selectedCategory === 'All'
        ? photos
        : selectedCategory === 'Videos'
        ? photos.filter(p => p.media_type === 'video')
        : photos.filter(p => p.category === selectedCategory);

    return (
        <div className="space-y-6">
            {/* Storage Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gold-300/40 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        storageStatus?.isConfigured
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                        <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                            Media Storage: {storageStatus?.isConfigured ? (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                                    Cloudinary Active ({storageStatus.cloud_name})
                                </span>
                            ) : (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                                    Local Storage (Setup Cloudinary in Settings)
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-charcoal-500 mt-0.5">
                            Photos and videos uploaded here appear immediately on the public Portfolio and homepage.
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={upload} className={`${box} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-200/60 pb-3">
                    <h3 className="font-serif text-lg font-bold text-charcoal-900 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-gold-600" /> Upload New Photo or Video
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                        <label className="font-semibold text-charcoal-700">Type:</label>
                        <div className="flex bg-gold-50 p-1 rounded-lg border border-gold-300/60">
                            <button
                                type="button"
                                onClick={() => setMediaType('image')}
                                className={`px-3 py-1 rounded font-semibold transition ${
                                    mediaType === 'image' ? 'gold-gradient-bg text-white' : 'text-charcoal-600 hover:text-charcoal-900'
                                }`}
                            >
                                Photo
                            </button>
                            <button
                                type="button"
                                onClick={() => setMediaType('video')}
                                className={`px-3 py-1 rounded font-semibold transition ${
                                    mediaType === 'video' ? 'gold-gradient-bg text-white' : 'text-charcoal-600 hover:text-charcoal-900'
                                }`}
                            >
                                Video
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-xs font-semibold text-charcoal-700 block mb-1">Title</label>
                        <input
                            required
                            className={input}
                            placeholder="e.g. Royal Haldi Moments"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-charcoal-700 block mb-1">Event Category</label>
                        <select
                            className={input}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-charcoal-700 block mb-1">
                            Select File {mediaType === 'video' ? '(MP4, WebM, MOV)' : '(JPG, PNG, WEBP)'}
                        </label>
                        <input
                            required
                            type="file"
                            accept={mediaType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp'}
                            className={input}
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {/* File Preview */}
                {previewUrl && (
                    <div className="p-3 bg-gold-50/40 border border-gold-200/60 rounded-xl flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-black shrink-0 flex items-center justify-center">
                            {mediaType === 'video' ? (
                                <video src={previewUrl} className="w-full h-full object-cover" muted autoPlay loop />
                            ) : (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="min-w-0 text-xs">
                            <p className="font-semibold text-charcoal-900 truncate">{file?.name}</p>
                            <p className="text-charcoal-500">{(file?.size / (1024 * 1024)).toFixed(2)} MB · {mediaType.toUpperCase()}</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button disabled={busy} className={button}>
                        {busy ? 'Uploading to Storage...' : mediaType === 'video' ? 'Upload Video' : 'Upload Photo'}
                    </button>
                    {message && (
                        <p className={`text-xs font-semibold ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? 'text-red-600' : 'text-emerald-700'}`}>
                            {message}
                        </p>
                    )}
                </div>
            </form>

            {/* Filter Tabs & Gallery Count */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-1.5 text-xs">
                    {['All', 'Wedding', 'Haldi', 'Mehendi', 'Pre-wedding', 'Reception', 'Videos'].map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-full font-semibold border transition ${
                                selectedCategory === cat
                                    ? 'gold-gradient-bg text-white border-transparent'
                                    : 'bg-white text-charcoal-700 border-gold-200 hover:bg-gold-50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-charcoal-500 font-medium">
                    {filteredPhotos.length} media items
                </span>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPhotos.map((p) => {
                    const mediaSrc = p.image_url?.startsWith('http') ? p.image_url : (SERVER_URL + p.image_url);
                    const isVideo = p.media_type === 'video';

                    return (
                        <div key={p.id} className="bg-white border border-gold-300/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                            <div className="relative h-44 bg-charcoal-900 flex items-center justify-center overflow-hidden">
                                {isVideo ? (
                                    <video src={mediaSrc} controls className="w-full h-full object-cover" />
                                ) : (
                                    <img src={mediaSrc} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                                )}
                                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-charcoal-900/80 text-white backdrop-blur-xs flex items-center gap-1">
                                    {isVideo ? <Video className="w-3 h-3 text-gold-400" /> : <Image className="w-3 h-3 text-gold-400" />}
                                    {p.category}
                                </span>
                            </div>

                            <div className="p-3.5 flex items-center justify-between gap-2 border-t border-gold-100">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-charcoal-900 truncate">{p.title}</p>
                                    <p className="text-[10px] text-charcoal-400">{isVideo ? 'Video Clip' : 'High-Res Photo'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(p.id, p.title)}
                                    title="Delete from gallery and Cloudinary"
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredPhotos.length === 0 && (
                <div className="p-8 text-center bg-white border border-gold-200/60 rounded-2xl text-charcoal-400 text-xs">
                    No media items found in this category. Upload photos or videos using the form above.
                </div>
            )}
        </div>
    );
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

export const CloudinarySettings = () => {
    const [cloudName, setCloudName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            const data = await apiRequest('/studio/settings');
            const s = data.settings || {};
            if (s.cloudinary_cloud_name) setCloudName(s.cloudinary_cloud_name);
            if (s.cloudinary_api_key) setApiKey(s.cloudinary_api_key);
            if (s.cloudinary_api_secret) setApiSecret(s.cloudinary_api_secret);
            const st = await apiRequest('/gallery/storage-status');
            setStatus(st);
        } catch (err) {}
    };

    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            await apiRequest('/studio/cloudinary', {
                method: 'PATCH',
                body: JSON.stringify({
                    cloud_name: cloudName,
                    api_key: apiKey,
                    api_secret: apiSecret
                })
            });
            setMessage('Cloudinary credentials saved successfully.');
            load();
        } catch (err) {
            setMessage(err.message || 'Failed to save credentials.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={save} className={`${box} lg:col-span-2 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200/60 pb-3">
                <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-gold-600" />
                    <div>
                        <h3 className="font-serif font-bold text-base text-charcoal-900">Cloudinary Cloud Storage Setup</h3>
                        <p className="text-xs text-charcoal-500">Connect Cloudinary so all wedding photos &amp; videos upload to your cloud storage directly.</p>
                    </div>
                </div>
                {status?.isConfigured ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Connected: {status.cloud_name}
                    </span>
                ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Not Configured (Using Local Storage)
                    </span>
                )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-semibold text-charcoal-700 block mb-1">Cloud Name</label>
                    <input
                        required
                        className={input}
                        placeholder="e.g. anmol-studio"
                        value={cloudName}
                        onChange={(e) => setCloudName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-charcoal-700 block mb-1">API Key</label>
                    <input
                        required
                        className={input}
                        placeholder="e.g. 123456789012345"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-charcoal-700 block mb-1">API Secret</label>
                    <input
                        required
                        type="password"
                        className={input}
                        placeholder="••••••••••••••••"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-3.5 bg-gold-50/60 border border-gold-200 rounded-xl text-xs text-charcoal-700 space-y-1">
                <p className="font-bold text-charcoal-900">How to get these credentials (Free &amp; Easy):</p>
                <ol className="list-decimal list-inside space-y-0.5 text-charcoal-600">
                    <li>Create a free account on <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="text-gold-700 underline font-semibold">cloudinary.com</a> (Free tier provides 25GB cloud storage).</li>
                    <li>Go to your Cloudinary Dashboard and find <b>Cloud Name</b>, <b>API Key</b>, and <b>API Secret</b>.</li>
                    <li>Paste them into the fields above and click Save. All media uploads and deletions will now sync directly with your Cloudinary cloud!</li>
                </ol>
            </div>

            <div className="flex items-center justify-between pt-1">
                <button disabled={busy} className={button}>
                    {busy ? 'Saving...' : 'Save Cloudinary Credentials'}
                </button>
                {message && (
                    <p className={`text-xs font-semibold ${message.includes('fail') ? 'text-red-600' : 'text-emerald-700'}`}>
                        {message}
                    </p>
                )}
            </div>
        </form>
    );
};

export const AdminSettings = () => {
    const { user } = useAuth();
    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
                <EmailChanger field="email" title="Change admin email" current={user.email}/>
                <EmailChanger field="backup_email" title="Backup email (can also be used to log in)" current={user.backup_email}/>
            </div>
            <div className="grid grid-cols-1">
                <CloudinarySettings />
            </div>
        </div>
    );
};
