import React, { useState } from 'react';
import { Check, Info, X } from 'lucide-react';
import { useBooking } from '../context/BookingContext';

// ---------------------------------------------------------------
// PACKAGE CARD
// All package data (name, price, features...) comes from the database.
// To change the data, edit server/src/db/seed.js (or use the admin API).
// ---------------------------------------------------------------

// Formats a number as Indian rupees, e.g. 22000 -> ₹22,000
export function formatPrice(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Final price text. Gold has a range (price to price_max), others have one price.
export function getFinalPrice(pkg) {
  if (pkg.price_max) {
    return formatPrice(pkg.price) + ' – ' + formatPrice(pkg.price_max);
  }
  return formatPrice(pkg.price);
}

// Price, discount badge and "After Discount" label.
// The crossed-out price and "SAVE" only show if the package has them in the data.
function PriceBox({ pkg, isDark }) {
  const hasOriginalPrice = pkg.original_price && pkg.original_price > pkg.price;
  const savedAmount = hasOriginalPrice ? pkg.original_price - pkg.price : pkg.discount_amount;

  return (
    <div className="text-center">
      <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-gold-400 text-gold-500 bg-gold-400/10">
        Discount
      </span>

      {hasOriginalPrice && (
        <div className="mt-3 text-sm line-through text-charcoal-400">{formatPrice(pkg.original_price)}</div>
      )}

      <div className={'mt-3 font-serif text-3xl sm:text-4xl font-bold ' + (isDark ? 'text-gold-300' : 'text-charcoal-900')}>
        {getFinalPrice(pkg)}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-500">After Discount</div>

      {savedAmount > 0 && (
        <div className="mt-2 inline-block text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          SAVE {formatPrice(savedAmount)}
        </div>
      )}
      {pkg.discount_percent > 0 && (
        <div className="mt-2 ml-2 inline-block text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          {pkg.discount_percent}% OFF
        </div>
      )}
    </div>
  );
}

// Small info box, e.g. "More than 30 km from our studio..."
function NoteBox({ note, isDark }) {
  const color = isDark ? 'bg-gold-400/10 border-gold-400/30 text-gold-200' : 'bg-amber-50 border-amber-200 text-amber-900';
  return (
    <div className={'flex items-start gap-2 rounded-xl px-3 py-2 text-[11px] border ' + color}>
      <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>Note: {note}</span>
    </div>
  );
}

// Coverage days, album, pendrive and drone rows
function QuickFacts({ pkg, isDark }) {
  const details = pkg.details || {};
  const rows = [
    { label: 'Coverage', value: details.days },
    { label: 'Album', value: details.album },
    { label: 'Pendrive', value: details.pendrive },
    { label: 'Drone', value: details.drone },
  ];

  return (
    <div className={'space-y-1.5 text-xs rounded-xl p-3 ' + (isDark ? 'bg-white/5' : 'bg-ivory-100')}>
      {rows.map((row) =>
        row.value ? (
          <div key={row.label} className="flex justify-between gap-3">
            <span className={isDark ? 'text-charcoal-300' : 'text-charcoal-500'}>{row.label}</span>
            <span className="font-semibold text-right">{row.value}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

// Feature list with check icons.
// On mobile only the first 6 show until the user taps "View All Features".
function FeatureList({ features, isDark, canCollapse }) {
  const [showAll, setShowAll] = useState(false);
  const SHOW_FIRST = 6;

  return (
    <div>
      <ul className="space-y-2">
        {features.map((feature, index) => {
          const hideOnMobile = canCollapse && !showAll && index >= SHOW_FIRST;
          return (
            <li key={index} className={'items-start gap-2.5 text-sm ' + (hideOnMobile ? 'hidden md:flex' : 'flex')}>
              <Check className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
              <span className={isDark ? 'text-ivory-100' : 'text-charcoal-700'}>{feature}</span>
            </li>
          );
        })}
      </ul>

      {canCollapse && features.length > SHOW_FIRST && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="md:hidden mt-3 text-xs font-semibold text-gold-500 underline"
        >
          {showAll ? 'Show Fewer Features' : 'View All ' + features.length + ' Features'}
        </button>
      )}
    </div>
  );
}

// One package card
function PackageCard({ pkg, onViewDetails }) {
  const { openWizard } = useBooking();

  const isGold = pkg.name === 'Gold';
  const isDiamond = pkg.name === 'Diamond';

  // Card style: Diamond is dark, Gold has a gold border, Silver is plain white
  let cardStyle = 'bg-white text-charcoal-800 border border-gold-300/50 shadow-sm';
  if (isGold) cardStyle = 'bg-white text-charcoal-800 border-2 border-gold-400 shadow-xl';
  if (isDiamond) cardStyle = 'bg-charcoal-900 text-white border border-gold-400/60 shadow-xl';

  // Small label above the package name
  let label = pkg.badge;
  if (pkg.name === 'Silver') label = 'Entry Package';
  if (isDiamond) label = 'Ultimate Package';

  function handleBookNow() {
    openWizard(pkg.id, pkg.name, pkg.price, { price_max: pkg.price_max, features: pkg.features });
  }

  return (
    <div className={'scroll-animate relative h-full flex flex-col rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ' + cardStyle}>
      {isGold && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 gold-gradient-bg text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full whitespace-nowrap">
          Most Popular
        </div>
      )}

      {/* Name and description */}
      <div className="text-center pb-5 border-b border-gold-400/25">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-500">{label}</span>
        <h3 className={'font-serif text-3xl font-bold mt-1 ' + (isDiamond ? 'text-gold-300' : 'text-charcoal-900')}>{pkg.name}</h3>
        <p className={'text-sm mt-2 min-h-[40px] ' + (isDiamond ? 'text-charcoal-200' : 'text-charcoal-500')}>{pkg.description}</p>
      </div>

      {/* Price */}
      <div className="py-5 border-b border-gold-400/25">
        <PriceBox pkg={pkg} isDark={isDiamond} />
      </div>

      {/* Facts and features */}
      <div className="py-5 space-y-5 flex-1">
        <QuickFacts pkg={pkg} isDark={isDiamond} />
        <FeatureList features={pkg.features} isDark={isDiamond} canCollapse={true} />
      </div>

      {pkg.note && (
        <div className="mb-5">
          <NoteBox note={pkg.note} isDark={isDiamond} />
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleBookNow} className="gold-gradient-bg text-white font-semibold text-sm py-3 rounded-full">
          Book Now
        </button>
        <button
          onClick={() => onViewDetails(pkg)}
          className={'font-semibold text-sm py-3 rounded-full border ' + (isDiamond ? 'border-gold-400/60 text-gold-300' : 'border-charcoal-300 text-charcoal-800')}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

// Popup with all details of one package
function PackageDetailsModal({ pkg, onClose }) {
  const { openWizard } = useBooking();

  if (!pkg) return null;

  function handleBookNow() {
    onClose();
    openWizard(pkg.id, pkg.name, pkg.price, { price_max: pkg.price_max, features: pkg.features });
  }

  return (
    <div className="fixed inset-0 z-40 bg-charcoal-900/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-ivory-50 rounded-3xl border border-gold-400/40 shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-serif text-3xl font-bold text-charcoal-900">{pkg.name}</h3>
        {pkg.details && pkg.details.tier && (
          <p className="text-xs uppercase tracking-widest text-gold-600 mt-1">{pkg.details.tier}</p>
        )}
        <p className="text-sm text-charcoal-600 mt-3">{pkg.description}</p>

        <div className="my-5 py-5 border-y border-gold-300/40">
          <PriceBox pkg={pkg} isDark={false} />
        </div>

        <div className="space-y-5">
          <QuickFacts pkg={pkg} isDark={false} />
          <FeatureList features={pkg.features} isDark={false} canCollapse={false} />
          {pkg.note && <NoteBox note={pkg.note} isDark={false} />}
        </div>

        <button onClick={handleBookNow} className="mt-6 w-full gold-gradient-bg text-white font-semibold text-sm py-3 rounded-full">
          Book {pkg.name}
        </button>
      </div>
    </div>
  );
}

// The three cards side by side (1 column on mobile, 2 on tablet, 3 on desktop)
export function PackageGrid({ packages }) {
  const [selectedPackage, setSelectedPackage] = useState(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch pt-4">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onViewDetails={setSelectedPackage} />
        ))}
      </div>

      <PackageDetailsModal pkg={selectedPackage} onClose={() => setSelectedPackage(null)} />
    </>
  );
}
