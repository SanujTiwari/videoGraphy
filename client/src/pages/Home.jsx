import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Play, Star, CheckCircle, ChevronRight, HelpCircle, ArrowRight } from 'lucide-react';
import { PackageGrid } from '../components/PackageCard';
import { ServiceCard } from '../components/ServiceCard';
import { LightboxModal } from '../components/LightboxModal';
import { useBooking } from '../context/BookingContext';
import { apiRequest } from '../api';

export const Home = () => {
    const { openWizard } = useBooking();
    const [packages, setPackages] = useState([]);
    const [services, setServices] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [activeLightboxItem, setActiveLightboxItem] = useState(null);

    useEffect(() => {
        apiRequest('/packages').then((d) => setPackages(d.packages || [])).catch(() => { });
        apiRequest('/services').then((d) => setServices(d.services || [])).catch(() => { });
        apiRequest('/reviews').then((d) => setReviews(d.reviews || [])).catch(() => { });
    }, []);

    const samplePortfolio = [
        {
            id: 1,
            title: 'Royal Baraat Entry at Taj Udaivilas',
            category: 'Royal Wedding',
            media_type: 'photo',
            url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
            description: 'Grand royal Barat entry with traditional dhol beats and floral fireworks.',
        },
        {
            id: 2,
            title: 'Cinematic Pre-Wedding Sunset Film',
            category: 'Pre-wedding',
            media_type: 'photo',
            url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
            description: 'Romantic sunset portraits at Neemrana Fort Palace.',
        },
        {
            id: 3,
            title: 'Vibrant Haldi Ceremony Rituals',
            category: 'Haldi',
            media_type: 'photo',
            url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80',
            description: 'Raw joyful candid moments as turmeric petal confetti fills the air.',
        },
        {
            id: 4,
            title: '4K Aerial Drone Venue Overview',
            category: 'Drone Aerial',
            media_type: 'photo',
            url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
            description: 'Stunning 4K high-altitude aerial view of wedding palace lawns.',
        },
    ];

    return (
      <div className="space-y-24 pb-16">
      
        {/* HERO SECTION */}
        <section className="relative min-h-[92vh] flex items-center justify-start overflow-hidden text-white">
          {/* Background Image with Warm Cinematic Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=90"
              alt="Wedding Cinematography"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/90 via-charcoal-900/75 to-charcoal-900/50"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 pt-16 sm:pt-24 pb-12">
            
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-gold-400/30 text-gold-300 text-xs font-semibold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Premium Wedding Photography & Cinematography</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl max-w-4xl font-normal leading-[1.1] text-white">
              Capturing Eternal Memories with{' '}
              <span className="gold-gradient-text italic font-serif">Cinematic Elegance</span>
            </h1>

            {/* Short, Simple, Beautiful Description */}
            <p className="max-w-xl text-white/90 text-sm sm:text-base leading-relaxed font-light">
              From grand royal Baraats to intimate pre-wedding films, we craft timeless visual masterpieces tailored to your wedding story.
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => openWizard()}
                className="w-full sm:w-auto gold-gradient-bg text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full transition-all shadow-gold-glow flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Book Your Event Now</span>
              </button>

              <Link
                to="/packages"
                className="w-full sm:w-auto bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/30 text-white font-semibold text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full transition-all flex items-center justify-center gap-2 hover:scale-105"
              >
                <span>Explore Packages</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                to="/portfolio"
                className="w-full sm:w-auto bg-white/5 hover:bg-white/15 text-gold-200 hover:text-white border border-gold-400/20 font-semibold text-xs sm:text-sm tracking-wider uppercase px-6 py-4 rounded-full transition-all flex items-center justify-center gap-2"
              >
                <span>View Portfolio</span>
              </Link>
            </div>

            {/* 4 Key Milestone Statistics Badges */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 border-t border-white/15 max-w-4xl">
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">850+</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-gold-300 mt-1">Royal Weddings</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">15+</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-gold-300 mt-1">Years Experience</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">100%</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-gold-300 mt-1">Client Delight</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">4K UHD</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-gold-300 mt-1">Cinema Rig</div>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURED PORTFOLIO GRID */}
        <section id="portfolio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-600 gold-gradient-text">Visual Masterpieces</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">Featured Wedding Portfolio</h2>
            <p className="text-xs sm:text-sm text-charcoal-600">Click any photograph to view high-resolution details.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {samplePortfolio.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveLightboxItem(item)}
                className="group cursor-pointer relative h-80 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500"
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                  <span className="text-[10px] font-bold uppercase tracking-widest gold-gradient-bg px-3 py-1 rounded-full w-max shadow-md">
                    {item.category}
                  </span>
                  <div>
                    <h4 className="font-serif text-lg font-bold group-hover:text-gold-300 transition-colors">{item.title}</h4>
                    <p className="text-xs opacity-80 mt-1 line-clamp-2">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View Full Portfolio Button */}
          <div className="mt-10 text-center">
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-gold-400 text-charcoal-900 hover:text-white hover:gold-gradient-bg font-semibold text-xs tracking-wider uppercase transition-all shadow-sm"
            >
              <span>Explore Complete Portfolio Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      {/* POPULAR PACKAGES SHOWCASE */}
      <section id="packages" className="scroll-animate max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-600 gold-gradient-text">Transparent Pricing</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">Popular Wedding Packages</h2>
          <p className="text-xs sm:text-sm text-charcoal-600">Choose from our Silver, Gold or Diamond packages and customize freely.</p>
        </div>

        <PackageGrid packages={packages.slice(0, 3)}/>
      </section>

      {/* SERVICES OVERVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-600 gold-gradient-text">Full Spectrum Coverage</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">Dedicated Photography & Media Services</h2>
          <p className="text-xs sm:text-sm text-charcoal-600">From 4K drones to multi-cam live streams and luxury flush mount albums.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.slice(0, 6).map((srv) => (<ServiceCard key={srv.id} id={srv.id} title={srv.title} category={srv.category} description={srv.description} starting_price={srv.starting_price} duration_hours={srv.duration_hours} image_url={srv.image_url} features={srv.features || []}/>))}
        </div>
      </section>

      {/* WHY CHOOSE ANMOL VIDEOGRAPHY */}
      <section className="scroll-animate bg-charcoal-900 text-white py-20 rounded-3xl max-w-7xl mx-auto px-6 sm:px-12 border border-gold-400/30 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-400">Why Anmol VideoGraphy</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
              Uncompromising Quality for Your <span className="gold-gradient-text">Once-in-a-Lifetime</span> Wedding
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-300 leading-relaxed">
              We combine state-of-the-art cinema gear with deep cultural understanding to capture every emotion, smile, and ritual tear flawlessly.
            </p>

            <div className="space-y-4 pt-2">
              {[
            { title: '4K Cinema Optics & Drones', desc: 'Sony FX3 cinema bodies, prime lenses, and DJI Mavic 3 Cine drones.' },
            { title: 'Instant Booking Notifications', desc: 'Studio manager receives real-time SMS, email & WhatsApp alerts for every booking.' },
            { title: 'Preserved Package Pricing', desc: 'Agreed quotations are locked in database transactions.' },
            { title: 'Handmade Velvet Flush Albums', desc: 'Archival metallic paper albums designed to last generations.' },
        ].map((item, idx) => (<div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full gold-gradient-bg flex items-center justify-center text-white shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4"/>
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-gold-300">{item.title}</h5>
                    <p className="text-xs text-charcoal-400">{item.desc}</p>
                  </div>
                </div>))}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-gold-400/40 shadow-gold-glow">
            <img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=80" alt="Anmol Master Camera Crew" className="w-full h-auto object-cover"/>
          </div>
        </div>
      </section>

      {/* CUSTOMER TESTIMONIALS */}
      {reviews.length > 0 && (<section className="scroll-animate max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-600 gold-gradient-text">Happy Couples</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">What Couples Say About Anmol VideoGraphy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.slice(0, 3).map((rev) => (<div key={rev.id} className="bg-white p-6 rounded-3xl border border-gold-300/40 shadow-sm space-y-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(rev.rating)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-amber-400"/>))}
                </div>
                <h4 className="font-serif font-bold text-base text-charcoal-900">"{rev.title}"</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed min-h-[60px]">"{rev.comment}"</p>
                <div className="pt-3 border-t border-gold-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-charcoal-800">{rev.customer_name}</span>
                  <span className="text-gold-600 font-semibold">{rev.event_type}</span>
                </div>
              </div>))}
          </div>
        </section>)}

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="scroll-animate max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-600 gold-gradient-text">Got Questions?</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {[
            { q: 'How early should we book Anmol VideoGraphy for our wedding?', a: 'We recommend booking 3 to 6 months in advance for auspicious wedding dates to guarantee date availability and crew allocation.' },
            { q: 'What is the required advance deposit to confirm a booking?', a: 'A 30% advance deposit is required to lock your wedding date in our official calendar. The remaining balance is payable on or before event completion.' },
            { q: 'Can we customize our selected package with extra drone or albums?', a: 'Yes! Our multi-step booking wizard allows complete customization with optional add-ons like extra candid photographers, drones, Jimmy Jib cranes, or parent albums.' },
            { q: 'How do we track our booking request after submission?', a: 'You receive a unique Booking Reference Code (e.g. #AV-2026-1001). You can track live status, payment receipts, and download PDF invoices anytime on our Track Booking page.' },
        ].map((faq, i) => (<div key={i} className="bg-white p-6 rounded-2xl border border-gold-200 shadow-sm space-y-2">
              <h4 className="font-serif font-bold text-base text-charcoal-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gold-500 shrink-0"/> {faq.q}
              </h4>
              <p className="text-xs text-charcoal-600 leading-relaxed pl-7">{faq.a}</p>
            </div>))}
        </div>
      </section>

      {/* LIGHTBOX MODAL */}
      <LightboxModal item={activeLightboxItem} onClose={() => setActiveLightboxItem(null)}/>

    </div>);
};
