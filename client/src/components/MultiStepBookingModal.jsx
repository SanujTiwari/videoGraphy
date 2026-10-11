import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Calendar, ArrowRight, ArrowLeft, ShieldCheck, Tag, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
const EVENT_TYPES = [
    'Wedding',
    'Pre-wedding',
    'Engagement',
    'Haldi',
    'Mehendi',
    'Reception',
    'Birthday',
    'Anniversary',
    'Baby Shoot',
    'Other Event',
];
const AVAILABLE_ADDONS = [
    { id: 1, name: '4K Aerial Drone Coverage', price: 15000, quantity: 1 },
    { id: 2, name: 'Extra Senior Candid Photographer', price: 12000, quantity: 1 },
    { id: 3, name: 'Extra Cinematic Videographer', price: 15000, quantity: 1 },
    { id: 4, name: 'Jimmy Jib Crane Camera Setup (24-ft)', price: 20000, quantity: 1 },
    { id: 5, name: 'Luxury Velvet Canvera Album (40 Pages)', price: 10000, quantity: 1 },
    { id: 6, name: 'Custom Framed Canvas (24x36 inch)', price: 6000, quantity: 1 },
    { id: 7, name: '60-Second Instagram Reel / Teaser', price: 5000, quantity: 1 },
    { id: 8, name: 'Multi-Cam 4K Live Streaming', price: 18000, quantity: 1 },
];
export const MultiStepBookingModal = () => {
    const { isWizardOpen, closeWizard, currentStep, setCurrentStep, draft, setDraft, calculateTotals, resetDraft } = useBooking();
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [couponInput, setCouponInput] = useState('');
    const [couponMsg, setCouponMsg] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedBooking, setSubmittedBooking] = useState(null);
    const [availabilityMsg, setAvailabilityMsg] = useState(null);
    const [isCheckingDate, setIsCheckingDate] = useState(false);
    // Auto-fill logged-in customer info
    useEffect(() => {
        if (user && !draft.customer_name) {
            setDraft((prev) => ({
                ...prev,
                customer_name: user.full_name && user.full_name !== 'Customer' ? user.full_name : '',
                customer_email: user.email && !user.email.endsWith('@mobile.local') ? user.email : '',
                customer_mobile: user.mobile || '',
            }));
        }
    }, [user]);
    // Fetch packages list
    useEffect(() => {
        if (isWizardOpen) {
            apiRequest('/packages')
                .then((data) => setPackages(data.packages || []))
                .catch(() => { });
        }
    }, [isWizardOpen]);
    if (!isWizardOpen)
        return null;
    const totals = calculateTotals();
    // Step 5: Check date availability
    const checkDateAvailability = async (selectedDate, start, end) => {
        if (!selectedDate)
            return;
        setIsCheckingDate(true);
        setAvailabilityMsg(null);
        try {
            const res = await apiRequest('/availability');
            const isBlocked = (res.blocked_dates || []).some((b) => b.date === selectedDate);
            // An approved booking on the same date with overlapping time also blocks the slot
            const isTaken = (res.booked_events || []).some((b) => b.event_date === selectedDate && start < b.event_end_time && b.event_start_time < end);
            if (isBlocked) {
                setAvailabilityMsg('⚠️ Studio is closed on this date. Please select an alternative date.');
            }
            else if (isTaken) {
                setAvailabilityMsg('⚠️ This date and time is already booked. Please select another date or time.');
            }
            else {
                setAvailabilityMsg('✅ Date is Available! Anmol VideoGraphy master crew is ready for your event.');
            }
        }
        catch (err) {
            setAvailabilityMsg('Could not check availability right now. We will confirm it after you submit.');
        }
        finally {
            setIsCheckingDate(false);
        }
    };    const handleToggleAddOn = (addon) => {
        setDraft((prev) => {
            const exists = prev.add_ons.some((a) => a.id === addon.id);
            if (exists) {
                return { ...prev, add_ons: prev.add_ons.filter((a) => a.id !== addon.id) };
            }
            else {
                return { ...prev, add_ons: [...prev.add_ons, addon] };
            }
        });
    };
    const handleApplyCoupon = async () => {
        if (!couponInput.trim())
            return;
        try {
            const res = await apiRequest('/coupons/validate', {
                method: 'POST',
                body: JSON.stringify({ code: couponInput, booking_amount: totals.rawTotal }),
            });
            setDraft((prev) => ({
                ...prev,
                coupon_code: res.code,
                discount_amount: res.discount_amount,
            }));
            setCouponMsg({ type: 'success', text: `Coupon applied! Discount of ₹${res.discount_amount.toLocaleString()}` });
        }
        catch (err) {
            setCouponMsg({ type: 'error', text: err.message || 'Invalid coupon code' });
        }
    };
    const handleSubmitBooking = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                customer_name: draft.customer_name,
                customer_email: draft.customer_email,
                customer_mobile: draft.customer_mobile,
                event_type: draft.event_type,
                package_id: draft.package_id,
                package_name: draft.package_name,
                event_date: draft.event_date,
                event_start_time: draft.event_start_time,
                event_end_time: draft.event_end_time,
                venue: draft.venue,
                city: draft.city,
                guest_count: Number(draft.guest_count) || 300,
                special_requirements: draft.special_requirements,
                add_ons: draft.add_ons,
                coupon_code: draft.coupon_code,
                customer_id: user?.id || null,
            };
            const res = await apiRequest('/bookings', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setSubmittedBooking(res.booking);
            setCurrentStep(7);
            // Trigger Celebration Confetti
            try {
                confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#2563EB', '#60A5FA', '#FFFFFF', '#0F1E3D'],
                });
            }
            catch (e) { }
        }
        catch (err) {
            alert(err.message || 'Failed to submit booking request. Please check required fields.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="fixed inset-0 z-50 bg-charcoal-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-ivory-50 border border-gold-400/40 rounded-3xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="bg-charcoal-900 text-white px-6 py-5 flex items-center justify-between border-b border-gold-400/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gold-gradient-bg flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 fill-white"/>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400">Anmol Studio Booking Wizard</span>
              <h3 className="font-serif text-xl font-bold">Reserve Your Wedding Story</h3>
            </div>
          </div>
          <button onClick={closeWizard} className="text-charcoal-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-6 h-6"/>
          </button>
        </div>

        {/* Step Indicator Bar */}
        {currentStep < 7 && (<div className="bg-ivory-100 px-6 py-3 border-b border-gold-200 flex items-center justify-between overflow-x-auto text-xs font-semibold text-charcoal-600">
            {[
                { num: 1, label: 'Event Type' },
                { num: 2, label: 'Package' },
                { num: 3, label: 'Customize' },
                { num: 4, label: 'Details' },
                { num: 5, label: 'Availability' },
                { num: 6, label: 'Summary' },
            ].map((st) => (<div key={st.num} className={`flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-full ${currentStep === st.num
                    ? 'gold-gradient-bg text-white shadow-sm'
                    : currentStep > st.num
                        ? 'text-gold-600 font-bold'
                        : 'text-charcoal-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep === st.num ? 'bg-white text-gold-600' : 'bg-charcoal-200 text-charcoal-700'}`}>
                  {st.num}
                </span>
                <span>{st.label}</span>
              </div>))}
          </div>)}

        {/* Step Contents */}
        <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto">

          {/* STEP 1: EVENT TYPE */}
          {currentStep === 1 && (<div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto">
                <h4 className="font-serif text-2xl font-bold text-charcoal-900">Step 1: What Event Are We Capturing?</h4>
                <p className="text-xs text-charcoal-600 mt-1">Select the event ceremony you are planning.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {EVENT_TYPES.map((type) => (<button key={type} onClick={() => setDraft((prev) => ({ ...prev, event_type: type }))} className={`p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 ${draft.event_type === type
                    ? 'gold-gradient-bg text-white font-bold border-gold-400 shadow-gold-glow scale-105'
                    : 'bg-white text-charcoal-800 border-gold-200 hover:border-gold-400 hover:bg-gold-50/50'}`}>
                    <Calendar className={`w-6 h-6 ${draft.event_type === type ? 'text-white' : 'text-gold-500'}`}/>
                    <span className="text-xs font-semibold">{type}</span>
                  </button>))}
              </div>
            </div>)}

          {/* STEP 2: PACKAGE SELECTION */}
          {currentStep === 2 && (<div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto">
                <h4 className="font-serif text-2xl font-bold text-charcoal-900">Step 2: Choose Your Package Template</h4>
                <p className="text-xs text-charcoal-600 mt-1">Select from our benchmark wedding photography packages.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packages.map((pkg) => (<div key={pkg.id} onClick={() => setDraft((prev) => ({
                    ...prev,
                    package_id: pkg.id,
                    package_name: pkg.name,
                    package_price: pkg.price,
                    package_price_max: pkg.price_max || null,
                    package_features: pkg.features || [],
                }))} className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${draft.package_id === pkg.id
                    ? 'bg-charcoal-900 text-white border-2 border-gold-400 shadow-gold-glow scale-105'
                    : 'bg-white text-charcoal-800 border-gold-200 hover:border-gold-400'}`}>
                    <div>
                      <h5 className="font-serif font-bold text-lg text-gold-400">{pkg.name}</h5>
                      <p className="text-xs opacity-80 mt-1 min-h-[36px]">{pkg.description}</p>
                      <div className="mt-3 font-serif text-2xl font-extrabold gold-gradient-text">
                        ₹{pkg.price.toLocaleString()}{pkg.price_max ? ` – ₹${pkg.price_max.toLocaleString()}` : ''}
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-gold-500">After Discount</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gold-400/20 text-xs font-semibold flex items-center justify-between">
                      <span>{pkg.details?.days || `${pkg.coverage_hours} Hours`}</span>
                      {draft.package_id === pkg.id ? (<span className="text-gold-400 font-bold flex items-center gap-1">Selected <Check className="w-4 h-4"/></span>) : (<span className="text-charcoal-400">Select</span>)}
                    </div>
                  </div>))}
              </div>
            </div>)}

          {/* STEP 3: CUSTOMIZE ADD-ONS */}
          {currentStep === 3 && (<div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto">
                <h4 className="font-serif text-2xl font-bold text-charcoal-900">Step 3: Customize Your Package Add-Ons</h4>
                <p className="text-xs text-charcoal-600 mt-1">Enhance coverage with drones, extra crew, cranes, or custom albums.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_ADDONS.map((addon) => {
                const isSelected = draft.add_ons.some((a) => a.id === addon.id);
                return (<div key={addon.id} onClick={() => handleToggleAddOn(addon)} className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between ${isSelected
                        ? 'bg-gold-50 border-gold-500 text-charcoal-900 shadow-sm font-semibold'
                        : 'bg-white border-gold-200 text-charcoal-700 hover:border-gold-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-gold-500 text-white border-gold-500' : 'border-charcoal-300'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5"/>}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{addon.name}</p>
                          <p className="text-[11px] text-gold-600 font-bold">+₹{addon.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>);
            })}
              </div>

              {/* Coupon Code Section */}
              <div className="bg-white p-4 rounded-xl border border-gold-200 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-700 shrink-0">
                  <Tag className="w-4 h-4 text-gold-500"/> Have a Coupon?
                </div>
                <div className="flex w-full gap-2">
                  <input type="text" placeholder="Enter Coupon Code (e.g. ROYALWEDDING10)" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="w-full text-xs px-3 py-2 border border-gold-300 rounded-lg uppercase font-bold text-charcoal-800 focus:outline-none focus:border-gold-500"/>
                  <button onClick={handleApplyCoupon} className="bg-charcoal-800 hover:bg-charcoal-900 text-white text-xs font-semibold px-4 py-2 rounded-lg shrink-0">
                    Apply
                  </button>
                </div>
              </div>
              {couponMsg && (<p className={`text-xs font-semibold ${couponMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {couponMsg.text}
                </p>)}
            </div>)}

          {/* STEP 4: EVENT DETAILS & CUSTOMER INFO */}
          {currentStep === 4 && (<div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto">
                <h4 className="font-serif text-2xl font-bold text-charcoal-900">Step 4: Contact & Venue Details</h4>
                <p className="text-xs text-charcoal-600 mt-1">Please provide accurate contact details so our studio manager can confirm.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Full Name *</label>
                  <input type="text" required placeholder="e.g. Priya & Rahul Verma" value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Mobile Number *</label>
                  <input type="tel" required placeholder="e.g. +91 98123 45678" value={draft.customer_mobile} onChange={(e) => setDraft({ ...draft, customer_mobile: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Email Address *</label>
                  <input type="email" required placeholder="e.g. priya@gmail.com" value={draft.customer_email} onChange={(e) => setDraft({ ...draft, customer_email: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Event Date *</label>
                  <input type="date" required value={draft.event_date} onChange={(e) => {
                setDraft({ ...draft, event_date: e.target.value });
                checkDateAvailability(e.target.value, draft.event_start_time, draft.event_end_time);
            }} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Event Time (From - To) *</label>
                  <div className="flex gap-2">
                    <input type="time" required value={draft.event_start_time} onChange={(e) => {
                setDraft({ ...draft, event_start_time: e.target.value });
                checkDateAvailability(draft.event_date, e.target.value, draft.event_end_time);
            }} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                    <input type="time" required value={draft.event_end_time} onChange={(e) => {
                setDraft({ ...draft, event_end_time: e.target.value });
                checkDateAvailability(draft.event_date, draft.event_start_time, e.target.value);
            }} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                  </div>
                </div>                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Venue Name & Address *</label>
                  <input type="text" required placeholder="e.g. Taj Palace Grand Ballroom" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">City *</label>
                  <input type="text" required placeholder="e.g. New Delhi / Udaipur" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 focus:border-gold-500 focus:outline-none"/>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1 text-xs">Special Photography Instructions or Message</label>
                <textarea rows={3} placeholder="Tell us about your Baraat entry, special rituals, or candid focus preferences..." value={draft.special_requirements} onChange={(e) => setDraft({ ...draft, special_requirements: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 text-xs focus:border-gold-500 focus:outline-none"/>
              </div>
            </div>)}

          {/* STEP 5: AVAILABILITY CHECK */}
          {currentStep === 5 && (<div className="space-y-6 text-center animate-fade-in max-w-xl mx-auto py-4">
              <Calendar className="w-12 h-12 text-gold-500 mx-auto"/>
              <h4 className="font-serif text-2xl font-bold text-charcoal-900">Step 5: Calendar Availability Check</h4>
              
              <div className="bg-white p-6 rounded-2xl border border-gold-300/40 shadow-sm space-y-4 text-xs">
                <p><strong>Selected Date:</strong> <span className="text-gold-600 font-bold text-sm">{draft.event_date || 'Not Selected Yet'}</span></p>
                
                {isCheckingDate ? (<p className="text-gold-600 animate-pulse font-semibold">Checking Studio Crew Availability...</p>) : availabilityMsg ? (<p className="font-bold text-sm">{availabilityMsg}</p>) : (<p className="text-charcoal-600">Please make sure event date is set in previous step.</p>)}

                <div className="pt-4 border-t border-gold-100 text-charcoal-500 text-[11px] leading-relaxed">
                  <Info className="w-4 h-4 text-gold-500 inline mr-1"/>
                  Note: Requesting an available date sends an immediate notification alert to Studio Manager Rajesh Kumar.
                </div>
              </div>
            </div>)}

          {/* STEP 6: SUMMARY & QUOTATION */}
          {currentStep === 6 && (<div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto">
                <h4 className="font-serif text-2xl font-bold text-charcoal-900">Step 6: Review Quotation & Advance Deposit</h4>
                <p className="text-xs text-charcoal-600 mt-1">Review itemized quotation breakdown and deposit rules.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gold-300/50 shadow-sm space-y-4 text-xs">
                <div className="flex justify-between pb-3 border-b border-gold-200 font-bold text-sm">
                  <span>Selected Package: {draft.package_name}</span>
                  <span className="text-gold-600">₹{draft.package_price.toLocaleString()}{draft.package_price_max ? ` – ₹${draft.package_price_max.toLocaleString()}` : ''}</span>
                </div>

                {draft.add_ons.length > 0 && (<div className="space-y-1.5 pb-3 border-b border-gold-100">
                    <span className="font-bold text-charcoal-700 block mb-1">Selected Upgrades:</span>
                    {draft.add_ons.map((addon) => (<div key={addon.id} className="flex justify-between text-charcoal-600">
                        <span>+ {addon.name}</span>
                        <span>₹{addon.price.toLocaleString()}</span>
                      </div>))}
                  </div>)}

                {totals.discount > 0 && (<div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount Applied ({draft.coupon_code})</span>
                    <span>-₹{totals.discount.toLocaleString()}</span>
                  </div>)}

                <div className="pt-2 space-y-2 border-t border-gold-200">
                  <div className="flex justify-between font-bold text-sm text-charcoal-900">
                    <span>Estimated Total Quotation{draft.package_price_max ? ' (from)' : ''}:</span>
                    <span className="gold-gradient-text text-base">₹{totals.finalTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gold-700 font-bold bg-gold-50 p-2.5 rounded-lg border border-gold-200">
                    <span>Required 30% Advance Deposit:</span>
                    <span>₹{totals.advanceRequired.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-600 text-[11px]">
                    <span>Remaining Balance Due on Event Day:</span>
                    <span>₹{totals.balanceRemaining.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-charcoal-500 bg-ivory-100 p-4 rounded-xl border border-gold-200">
                <ShieldCheck className="w-4 h-4 text-gold-500 inline mr-1"/>
                By submitting this request, your booking ID will be generated and routed directly to Studio Manager for instant approval.
              </div>
            </div>)}

          {/* STEP 7: SUBMISSION CONFIRMATION */}
          {currentStep === 7 && submittedBooking && (<div className="space-y-6 text-center animate-fade-in py-4">
              <div className="w-16 h-16 rounded-full gold-gradient-bg flex items-center justify-center text-white mx-auto shadow-gold-glow">
                <Check className="w-8 h-8 stroke-[3]"/>
              </div>

              <h4 className="font-serif text-3xl font-bold text-charcoal-900">Booking Request Submitted!</h4>
              <p className="text-xs text-charcoal-600 max-w-md mx-auto">
                Thank you <strong>{submittedBooking.customer_name}</strong>! Your request has been recorded and transmitted to Studio Manager.
              </p>

              <div className="bg-white p-6 rounded-2xl border-2 border-gold-400/50 max-w-md mx-auto shadow-lg space-y-3 text-xs text-left">
                <div className="flex items-center justify-between pb-3 border-b border-gold-200">
                  <span className="text-charcoal-500 font-semibold">Booking Reference Code:</span>
                  <span className="font-mono text-base font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded border border-gold-300">
                    #{submittedBooking.booking_ref}
                  </span>
                </div>

                <p><strong>Event:</strong> {submittedBooking.event_type} ({submittedBooking.package_name})</p>
                <p><strong>Date:</strong> {submittedBooking.event_date}</p>
                <p><strong>Venue:</strong> {submittedBooking.venue}</p>
                <p><strong>Total Quotation:</strong> ₹{submittedBooking.total_amount.toLocaleString()}</p>
                <p><strong>Required Advance:</strong> ₹{submittedBooking.advance_amount.toLocaleString()}</p>
                <p><strong>Status:</strong> <span className="uppercase text-amber-600 font-bold px-2 py-0.5 bg-amber-50 rounded border border-amber-200">PENDING MANAGER APPROVAL</span></p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => {
                closeWizard();
                resetDraft();
            }} className="gold-gradient-bg text-white font-semibold text-xs px-8 py-3 rounded-full shadow-gold-glow">
                  Done
                </button>
              </div>
            </div>)}

        </div>

        {/* Footer Navigation Bar */}
        {currentStep < 7 && (<div className="bg-ivory-100 px-6 py-4 border-t border-gold-200 flex items-center justify-between">
            <button onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))} disabled={currentStep === 1} className="text-xs font-semibold text-charcoal-700 hover:text-gold-600 disabled:opacity-40 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4"/> Back
            </button>

            <div className="text-xs font-bold text-gold-700">
              Total: ₹{totals.finalTotal.toLocaleString()}
            </div>

            {currentStep < 6 ? (<button onClick={() => {
                    if (currentStep === 2 && !draft.package_id) {
                        alert('Please select a package to continue.');
                        return;
                    }
                    if (currentStep === 4 && (!draft.customer_name || !draft.customer_mobile || !draft.event_date || !draft.venue)) {
                        alert('Please complete all mandatory fields in Step 4.');
                        return;
                    }
                    setCurrentStep((prev) => prev + 1);
                }} className="gold-gradient-bg text-white font-semibold text-xs px-6 py-2.5 rounded-full shadow-gold-glow flex items-center gap-1 hover:scale-105 transition-all">
                Next Step <ArrowRight className="w-4 h-4"/>
              </button>) : (<button onClick={handleSubmitBooking} disabled={isSubmitting} className="gold-gradient-bg text-white font-bold text-xs px-8 py-3 rounded-full shadow-gold-glow flex items-center gap-2 hover:scale-105 transition-all">
                {isSubmitting ? 'Transmitting Request...' : 'Submit Booking Request'}
              </button>)}
          </div>)}

      </div>
    </div>);
};
