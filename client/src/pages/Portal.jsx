import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { apiRequest } from '../api';
export const Portal = () => {
    const { user } = useAuth();
    const { openWizard } = useBooking();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        apiRequest('/bookings/my-bookings').then((d) => setBookings(d.bookings || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);
    return (<>
      <PageHeader eyebrow="My Account" title={`Welcome, ${user?.full_name || ''}`}/>
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-serif text-2xl font-bold">My Bookings</h2>
          <button onClick={() => openWizard()} className="gold-gradient-bg text-white px-5 py-2.5 rounded-full text-sm font-semibold">New Booking</button>
        </div>
        {loading && <p className="text-sm text-charcoal-500">Loading...</p>}
        {!loading && bookings.length === 0 && <p className="text-sm text-charcoal-500">You have no bookings yet.</p>}
        {bookings.map((b) => (<div key={b.id} className="bg-white border border-gold-300/40 rounded-2xl p-5 flex flex-wrap justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-serif font-bold">#{b.booking_ref} - {b.event_type}</h3>
              <p className="text-xs text-charcoal-600">{b.package_name} on {b.event_date}</p>
            </div>
            <div className="text-right text-sm">
              <p className="capitalize font-semibold text-gold-700">{String(b.booking_status).replace(/_/g, ' ')}</p>
              <Link to={`/track?ref=${b.booking_ref}`} className="text-xs text-charcoal-600 hover:underline">View details</Link>
            </div>
          </div>))}
      </section>
    </>);
};
