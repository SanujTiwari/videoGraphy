import React, { useState, useEffect } from 'react';
import { apiRequest, SERVER_URL } from '../api';
import { LightboxModal } from '../components/LightboxModal';
import { PageHeader } from '../components/PageHeader';
import { Play } from 'lucide-react';

const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const ITEMS = [
    { id: 1, title: 'Royal Baraat Entry', category: 'Wedding', media_type: 'photo', url: u('photo-1519741497674-611481863552') },
    { id: 2, title: 'Sunset Pre-Wedding', category: 'Pre-wedding', media_type: 'photo', url: u('photo-1511285560929-80b456fea0bc') },
    { id: 3, title: 'Haldi Ceremony', category: 'Haldi', media_type: 'photo', url: u('photo-1537633552985-df8429e8048b') },
    { id: 4, title: 'Aerial Venue View', category: 'Drone', media_type: 'photo', url: u('photo-1508614589041-895b88991e3e') },
    { id: 5, title: 'Reception Evening', category: 'Reception', media_type: 'photo', url: u('photo-1516035069371-29a1b244cc32') },
    { id: 6, title: 'Mehendi Details', category: 'Mehendi', media_type: 'photo', url: u('photo-1492684223066-81342ee5ff30') },
];

export const Portfolio = () => {
    const [filter, setFilter] = useState('All');
    const [active, setActive] = useState(null);
    const [uploaded, setUploaded] = useState([]);

    // Media uploaded by the admin are shown first, then sample items
    useEffect(() => {
        apiRequest('/gallery')
            .then((data) => setUploaded((data.photos || []).map((p) => ({
                id: 'u' + p.id,
                title: p.title,
                category: p.category,
                media_type: p.media_type === 'video' ? 'video' : 'photo',
                url: p.image_url?.startsWith('http') ? p.image_url : (SERVER_URL + p.image_url)
            }))))
            .catch(() => {});
    }, []);

    const allItems = [...uploaded, ...ITEMS];
    const CATEGORIES = ['All', ...Array.from(new Set(allItems.map((i) => i.category)))];
    const shown = filter === 'All' ? allItems : allItems.filter((i) => i.category === filter);

    return (<>
      <PageHeader eyebrow="Visual Masterpieces" title="Portfolio & Films" subtitle="Browse our work by event category."/>
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((c) => (<button key={c} onClick={() => setFilter(c)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${filter === c ? 'gold-gradient-bg text-white border-transparent' : 'bg-white text-charcoal-700 border-gold-300 hover:bg-gold-50'}`}>
              {c}
            </button>))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shown.map((item) => {
            const isVideo = item.media_type === 'video';
            return (
              <button key={item.id} onClick={() => setActive(item)} className="group relative h-72 rounded-3xl overflow-hidden shadow-md text-left">
                {isVideo ? (
                  <video src={item.url} muted playsInline className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <img src={item.url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent"/>
                {isVideo && (
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                )}
                <div className="absolute bottom-0 p-5 text-white">
                  <span className="text-[10px] uppercase tracking-widest text-gold-300 font-bold">{item.category}</span>
                  <h3 className="font-serif font-bold text-lg">{item.title}</h3>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <LightboxModal item={active} onClose={() => setActive(null)}/>
    </>);
};
