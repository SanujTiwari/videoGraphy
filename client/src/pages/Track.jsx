import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { RazorpayModal } from '../components/RazorpayModal';
import { PDFViewerModal } from '../components/PDFViewerModal';
import { apiRequest } from '../api';
export const Track = () => {
    const [params] = useSearchParams();
    const [ref, setRef] = useState(params.get('ref') || '');
    const [booking, setBooking] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [paying, setPaying] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const lookup = async (value = ref) => {
        if (!value.trim())
            return;
        setLoading(true);
        setError('');
        try {
            const d = await apiRequest(`/bookings/track/${encodeURIComponent(value.trim())}`);
            setBooking(d.booking);
        }
        catch (e) {
            setBooking(null);
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const initial = params.get('ref');
        if (initial)
            lookup(initial);
    }, []);
    return (<>
      <PageHeader eyebrow="Booking Status" title="Track Your Booking" subtitle="Enter the booking reference you received after submitting your request."/>
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex flex-col sm:flex-row gap-3">
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. AV-2026-1001" className="flex-1 rounded-full border border-gold-300 bg-white px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"/>
          <button className="gold-gradient-bg text-white px-6 py-3 sm:py-0 rounded-full font-semibold flex justify-center items-center gap-2" disabled={loading}>
            <Search className="w-4 h-4"/> {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && <p className="text-center text-red-600 text-sm">{error}</p>}

        {booking && (<div className="bg-white border border-gold-300/40 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-bold">#{booking.booking_ref}</h2>
                <p className="text-sm text-charcoal-600">{booking.event_type} - {booking.package_name}</p>
              </div>
              <span className="self-start px-4 py-1.5 rounded-full text-xs font-bold uppercase gold-gradient-bg text-white">
                {String(booking.booking_status).replace(/_/g, ' ')}
              </span>
            </div>

            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-charcoal-400 text-xs">Event date</dt><dd>{booking.event_date}</dd></div>
              <div><dt className="text-charcoal-400 text-xs">Venue</dt><dd>{booking.venue}, {booking.city}</dd></div>
              <div><dt className="text-charcoal-400 text-xs">Total</dt><dd>₹{Number(booking.total_amount).toLocaleString()}</dd></div>
              <div><dt className="text-charcoal-400 text-xs">Balance due</dt><dd>₹{Number(booking.remaining_amount).toLocaleString()}</dd></div>
              <div><dt className="text-charcoal-400 text-xs">Payment status</dt><dd className="capitalize">{String(booking.payment_status).replace(/_/g, ' ')}</dd></div>
            </dl>

            <div>
              <h3 className="font-serif font-bold mb-2">Status history</h3>
              <ul className="space-y-2 text-sm">
                {(booking.status_history || []).map((h) => (<li key={h.id} className="border-l-2 border-gold-400 pl-3">
                    <span className="font-semibold capitalize">{String(h.status).replace(/_/g, ' ')}</span>
                    <span className="text-charcoal-400 text-xs"> - {h.created_at}</span>
                    <p className="text-xs text-charcoal-600">{h.notes}</p>
                  </li>))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              {booking.payment_status !== 'fully_paid' && booking.booking_status !== 'cancelled' && booking.booking_status !== 'rejected' && (<button onClick={() => setPaying(true)} className="gold-gradient-bg text-white px-6 py-2.5 rounded-full text-sm font-semibold">Pay Now</button>)}
              <button onClick={() => setInvoice(`INV-${booking.booking_ref}`)} className="border border-gold-400 text-gold-700 px-6 py-2.5 rounded-full text-sm font-semibold">View Invoice</button>
            </div>
          </div>)}
      </section>

      {paying && booking && (<RazorpayModal booking={booking} onClose={() => setPaying(false)} onPaymentSuccess={() => { setPaying(false); lookup(booking.booking_ref); }}/>)}
      {invoice && <PDFViewerModal invoiceNumber={invoice} onClose={() => setInvoice(null)}/>}
    </>);
};
