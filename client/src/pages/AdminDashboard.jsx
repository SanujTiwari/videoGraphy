import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { useNotifications } from '../context/NotificationContext';
import { MonthlyChart, PackageRates, Photos, AvailabilityManager, AdminSettings } from './AdminTools';
const STATUSES = ['pending', 'under_review', 'awaiting_advance', 'confirmed', 'in_progress', 'editing', 'album_production', 'ready_for_delivery', 'completed', 'rejected', 'cancelled'];
const TABS = ['overview', 'bookings', 'packages', 'photos', 'availability', 'notifications', 'inquiries', 'settings'];
const money = (n) => `₹${Number(n || 0).toLocaleString()}`;
const label = (s) => String(s).replace(/_/g, ' ');
export const AdminDashboard = () => {
    const [params, setParams] = useSearchParams();
    const tab = TABS.includes(params.get('tab') || '') ? params.get('tab') : 'overview';
    return (<div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gold-300/40 pb-3">
        {TABS.map((t) => (<button key={t} onClick={() => setParams({ tab: t })} className={`px-5 py-2 rounded-full text-sm font-semibold capitalize ${tab === t ? 'bg-charcoal-900 text-gold-300' : 'text-charcoal-700 hover:bg-gold-50'}`}>
            {t}
          </button>))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'bookings' && <Bookings />}
      {tab === 'packages' && <PackageRates />}
      {tab === 'photos' && <Photos />}
      {tab === 'availability' && <AvailabilityManager />}
      {tab === 'settings' && <AdminSettings />}
      {tab === 'notifications' && <Notifications />}
      {tab === 'inquiries' && <Inquiries />}
    </div>);
};
const Overview = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        apiRequest('/reports/dashboard').then(setData).catch((e) => setError(e.message));
    }, []);
    if (error)
        return <p className="text-red-600 text-sm">{error}</p>;
    if (!data)
        return <p className="text-sm text-charcoal-500">Loading...</p>;
    const k = data.kpis;
    const cards = [
        ['Total bookings', k.total_bookings], ['Pending', k.pending_bookings], ['Confirmed', k.confirmed_bookings],
        ['Completed', k.completed_bookings], ['Booked revenue', money(k.total_booked_revenue)],
        ['Payments received', money(k.total_received_payments)], ['Outstanding', money(k.outstanding_balance)],
    ];
    return (<div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([t, v]) => (<div key={t} className="bg-white border border-gold-300/40 rounded-2xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-charcoal-400">{t}</p>
            <p className="font-serif text-2xl font-bold text-charcoal-900 mt-1">{v}</p>
          </div>))}
      </div>
      <MonthlyChart />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gold-300/40 rounded-2xl p-5">
          <h3 className="font-serif font-bold mb-3">Popular packages</h3>
          {data.popular_packages.map((p) => (<div key={p.package_name} className="flex justify-between text-sm py-1.5 border-b border-gold-100">
              <span>{p.package_name}</span><span>{p.booking_count} bookings - {money(p.total_revenue)}</span>
            </div>))}
        </div>
        <div className="bg-white border border-gold-300/40 rounded-2xl p-5">
          <h3 className="font-serif font-bold mb-3">Upcoming events</h3>
          {data.upcoming_events.length === 0 && <p className="text-sm text-charcoal-500">No upcoming confirmed events.</p>}
          {data.upcoming_events.map((b) => (<div key={b.id} className="flex justify-between text-sm py-1.5 border-b border-gold-100">
              <span>{b.customer_name} ({b.event_type})</span><span>{b.event_date}</span>
            </div>))}
        </div>
      </div>
    </div>);
};
const Bookings = () => {
    const [bookings, setBookings] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [error, setError] = useState('');
    const load = () => {
        const q = new URLSearchParams({ status });
        if (search)
            q.set('search', search);
        apiRequest(`/bookings/admin/all?${q}`).then((d) => setBookings(d.bookings || [])).catch((e) => setError(e.message));
    };
    useEffect(() => {
        load();
    }, [status]);
    const updateStatus = async (id, next) => {
        try {
            await apiRequest(`/bookings/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
            load();
        }
        catch (e) {
            setError(e.message);
        }
    };
    return (<div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, mobile, ref, venue" className="flex-1 min-w-60 rounded-full border border-gold-300 bg-white px-4 py-2 text-sm"/>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-gold-300 bg-white px-4 py-2 text-sm capitalize">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <button className="gold-gradient-bg text-white px-5 py-2 rounded-full text-sm font-semibold">Search</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="overflow-x-auto bg-white border border-gold-300/40 rounded-2xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-charcoal-900 text-gold-300 text-xs uppercase">
            <tr>{['Ref', 'Customer', 'Mobile', 'Event', 'Package', 'Date', 'Amount', 'Payment', 'Status'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {bookings.map((b) => (<tr key={b.id}>
                <td className="p-3 font-semibold">{b.booking_ref}</td>
                <td className="p-3">{b.customer_name}<div className="text-xs text-charcoal-400">{b.customer_email}</div></td>
                <td className="p-3">{b.customer_mobile}</td>
                <td className="p-3">{b.event_type}</td>
                <td className="p-3">{b.package_name}</td>
                <td className="p-3 whitespace-nowrap">{b.event_date}</td>
                <td className="p-3">{money(b.total_amount)}</td>
                <td className="p-3 capitalize">{label(b.payment_status)}</td>
                <td className="p-3">
                  <select value={b.booking_status} onChange={(e) => updateStatus(b.id, e.target.value)} className="rounded-lg border border-gold-300 px-2 py-1 text-xs capitalize">
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </td>
              </tr>))}
            {bookings.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-charcoal-500">No bookings found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>);
};
const Notifications = () => {
    const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
    useEffect(() => { refreshNotifications(); }, []);
    return (<div className="space-y-3">
      <button onClick={markAllAsRead} className="text-sm text-gold-700 hover:underline">Mark all as read</button>
      {notifications.length === 0 && <p className="text-sm text-charcoal-500">No notifications yet.</p>}
      {notifications.map((n) => (<div key={n.id} className={`rounded-2xl border p-4 ${n.is_read ? 'bg-white border-gold-200' : 'bg-gold-50 border-gold-400'}`}>
          <div className="flex justify-between gap-3">
            <h4 className="font-semibold text-sm">{n.title}</h4>
            {!n.is_read && <button onClick={() => markAsRead(n.id)} className="text-xs text-gold-700 hover:underline shrink-0">Mark read</button>}
          </div>
          <p className="text-xs text-charcoal-600 mt-1">{n.message}</p>
          {n.payload && (<p className="text-xs text-charcoal-500 mt-2">
              {n.payload.customer_name} - {n.payload.customer_mobile} - {n.payload.customer_email} - {n.payload.venue}
            </p>)}
        </div>))}
    </div>);
};
const Inquiries = () => {
    const [items, setItems] = useState([]);
    const load = () => apiRequest('/inquiries/admin').then((d) => setItems(d.inquiries || [])).catch(() => { });
    useEffect(() => { load(); }, []);
    const setStatus = async (id, status) => {
        await apiRequest(`/inquiries/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        load();
    };
    return (<div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-charcoal-500">No inquiries yet.</p>}
      {items.map((i) => (<div key={i.id} className="bg-white border border-gold-300/40 rounded-2xl p-4 flex flex-wrap justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold">{i.name} <span className="text-charcoal-400 font-normal">({i.event_type})</span></p>
            <p className="text-xs text-charcoal-500">{i.mobile} - {i.email}</p>
            <p className="text-xs mt-2">{i.message}</p>
          </div>
          <select value={i.status} onChange={(e) => setStatus(i.id, e.target.value)} className="self-start rounded-lg border border-gold-300 px-2 py-1 text-xs capitalize">
            {['new', 'contacted', 'quotation_sent', 'converted', 'closed'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>))}
    </div>);
};
