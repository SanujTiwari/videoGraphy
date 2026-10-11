import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { useNotifications } from '../context/NotificationContext';
import { MonthlyChart, Photos, AdminSettings } from './AdminTools';
import { PackageManagement } from '../components/PackageManagement';
import { AvailabilityManager } from '../components/AvailabilityManager';
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
      {tab === 'packages' && <PackageManagement />}
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
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

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
            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking(prev => ({ ...prev, booking_status: next }));
            }
            load();
        }
        catch (e) {
            setError(e.message);
        }
    };

    const openDetails = async (b) => {
        setLoadingDetails(true);
        setSelectedBooking(b);
        try {
            const data = await apiRequest(`/bookings/admin/${b.id}`);
            setSelectedBooking(data.booking);
        } catch (err) {
            console.error('Failed to load full booking details:', err);
        } finally {
            setLoadingDetails(false);
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
      
      <div className="overflow-x-auto bg-white border border-gold-300/40 rounded-2xl shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-charcoal-900 text-gold-300 text-xs uppercase">
            <tr>{['Ref', 'Customer', 'Mobile', 'Event', 'Package', 'Date', 'Amount', 'Payment', 'Status', 'Action'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {bookings.map((b) => (<tr key={b.id} className="hover:bg-gold-50/60 transition-colors">
                <td className="p-3 font-semibold text-charcoal-900">
                  <button onClick={() => openDetails(b)} className="text-gold-700 hover:text-gold-800 underline font-mono font-bold">
                    {b.booking_ref}
                  </button>
                </td>
                <td className="p-3 cursor-pointer" onClick={() => openDetails(b)}>
                  <div className="font-medium text-charcoal-900">{b.customer_name}</div>
                  <div className="text-xs text-charcoal-400">{b.customer_email}</div>
                </td>
                <td className="p-3">{b.customer_mobile}</td>
                <td className="p-3">{b.event_type}</td>
                <td className="p-3">
                  <button onClick={() => openDetails(b)} className="text-left font-medium text-charcoal-800 hover:text-gold-700 underline decoration-dotted">
                    {b.package_name}
                  </button>
                </td>
                <td className="p-3 whitespace-nowrap">{b.event_date}</td>
                <td className="p-3 font-semibold text-charcoal-900">{money(b.total_amount)}</td>
                <td className="p-3 capitalize">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {label(b.payment_status)}
                  </span>
                </td>
                <td className="p-3">
                  <select value={b.booking_status} onChange={(e) => updateStatus(b.id, e.target.value)} className="rounded-lg border border-gold-300 px-2 py-1 text-xs capitalize bg-white">
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {b.booking_status !== 'confirmed' ? (
                    <button onClick={() => updateStatus(b.id, 'confirmed')} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-sm transition">
                      ✓ Approve
                    </button>
                  ) : (
                    <button onClick={() => openDetails(b)} className="px-3 py-1 border border-gold-400 text-gold-700 hover:bg-gold-50 rounded-lg text-xs font-semibold transition">
                      View Details
                    </button>
                  )}
                </td>
              </tr>))}
            {bookings.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-charcoal-500">No bookings found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white border border-gold-300/50 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl space-y-6" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gold-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold-100 text-gold-800">
                  {selectedBooking.booking_ref}
                </span>
                <h2 className="font-serif text-2xl font-bold text-charcoal-900 mt-2">
                  Booking Breakdown & Details
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Booked on {selectedBooking.created_at || 'Recent'}
                </p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-charcoal-400 hover:text-charcoal-700 p-2 text-xl font-bold rounded-full hover:bg-gold-50">
                ✕
              </button>
            </div>

            {/* Customer & Event Details */}
            <div className="grid sm:grid-cols-2 gap-4 bg-gold-50/50 p-4 rounded-2xl border border-gold-200/60 text-sm">
              <div>
                <p className="text-xs uppercase font-bold text-charcoal-400">Customer Info</p>
                <p className="font-bold text-charcoal-900 mt-1">{selectedBooking.customer_name}</p>
                <p className="text-charcoal-600">{selectedBooking.customer_mobile}</p>
                <p className="text-charcoal-600">{selectedBooking.customer_email}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-charcoal-400">Event Details</p>
                <p className="font-bold text-charcoal-900 mt-1">{selectedBooking.event_type}</p>
                <p className="text-charcoal-600">📅 {selectedBooking.event_date} ({selectedBooking.event_start_time || '10:00'} - {selectedBooking.event_end_time || '22:00'})</p>
                <p className="text-charcoal-600">📍 {selectedBooking.venue}, {selectedBooking.city}</p>
                {selectedBooking.guest_count && <p className="text-charcoal-500 text-xs">👥 Guests: {selectedBooking.guest_count}</p>}
              </div>
            </div>

            {/* Package & Addons Breakdown (The Price Reason) */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-lg text-charcoal-900 flex items-center justify-between">
                <span>Selected Package & Add-ons Breakdown</span>
                {loadingDetails && <span className="text-xs text-gold-600 font-normal">Loading item details...</span>}
              </h3>
              
              <div className="border border-gold-300/40 rounded-2xl overflow-hidden divide-y divide-gold-100">
                {/* Items list */}
                {selectedBooking.items && selectedBooking.items.length > 0 ? (
                  selectedBooking.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex justify-between items-center bg-white hover:bg-gold-50/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${item.item_type === 'package' ? 'bg-gold-100 text-gold-800' : 'bg-purple-100 text-purple-800'}`}>
                            {item.item_type === 'package' ? 'Base Package' : 'Add-on'}
                          </span>
                          <span className="font-semibold text-charcoal-900">{item.item_name}</span>
                        </div>
                        {item.quantity > 1 && <span className="text-xs text-charcoal-500">Qty: {item.quantity}</span>}
                      </div>
                      <span className="font-bold text-charcoal-900">{money(item.total_price)}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-white space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-charcoal-900">{selectedBooking.package_name}</span>
                      <span className="font-bold text-charcoal-900">{money(selectedBooking.total_amount)}</span>
                    </div>
                  </div>
                )}

                {/* Total Summary Rows */}
                <div className="bg-gold-50 p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-charcoal-600">
                    <span>Total Booking Cost</span>
                    <span className="font-bold text-charcoal-900 text-base">{money(selectedBooking.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-600">
                    <span>Required Advance (30%)</span>
                    <span className="font-semibold text-charcoal-800">{money(selectedBooking.advance_amount)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-600">
                    <span>Remaining Amount</span>
                    <span className="font-semibold text-charcoal-800">{money(selectedBooking.remaining_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Special notes if any */}
            {selectedBooking.special_requirements && (
              <div className="bg-charcoal-50 p-3.5 rounded-xl border border-charcoal-200/50 text-xs text-charcoal-700">
                <span className="font-bold">Special Requests: </span>{selectedBooking.special_requirements}
              </div>
            )}

            {/* Action Bar inside modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gold-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-charcoal-500 font-medium">Status:</span>
                <select
                  value={selectedBooking.booking_status}
                  onChange={(e) => updateStatus(selectedBooking.id, e.target.value)}
                  className="rounded-lg border border-gold-300 px-3 py-1.5 text-xs font-semibold capitalize bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedBooking.booking_status !== 'confirmed' && (
                  <button
                    onClick={() => updateStatus(selectedBooking.id, 'confirmed')}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-bold shadow-md transition"
                  >
                    ✓ Approve Booking
                  </button>
                )}
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-5 py-2 border border-gold-300 hover:bg-gold-50 text-charcoal-700 rounded-full text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
