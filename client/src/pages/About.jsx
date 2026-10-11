import React from 'react';
import { Heart, Award, Camera, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
export const About = () => (<>
    <PageHeader eyebrow="Our Story" title="About Anmol VideoGraphy" subtitle="Fifteen years of turning wedding days into timeless films and photographs."/>
    <section className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-12 items-center">
      <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80" alt="Anmol VideoGraphy team at work" loading="lazy" className="rounded-3xl shadow-luxury w-full h-96 object-cover"/>
      <div className="space-y-4 text-charcoal-700 text-sm leading-relaxed">
        <h2 className="font-serif text-3xl font-bold text-charcoal-900">Stories told with cinematic elegance</h2>
        <p>Anmol VideoGraphy is a professional photography and videography studio specialising in weddings, pre-wedding films and family celebrations. Our crew blends candid storytelling with cinema-grade equipment to preserve every ritual, emotion and detail.</p>
        <p>Our mission is simple: deliver honest pricing, a stress-free booking experience, and memories you will cherish for generations.</p>
      </div>
    </section>
    <section className="max-w-6xl mx-auto px-4 pb-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { icon: Heart, t: 'Our Values', d: 'Authenticity, punctuality and respect for every family tradition.' },
        { icon: Award, t: '850+ Weddings', d: 'Trusted by couples across India and destination venues abroad.' },
        { icon: Camera, t: 'Pro Equipment', d: '4K cinema bodies, prime lenses, gimbals, drones and cranes.' },
        { icon: Users, t: 'Dedicated Team', d: 'Candid photographers, cinematographers, drone pilots and editors.' },
    ].map(({ icon: Icon, t, d }) => (<div key={t} className="bg-white border border-gold-300/40 rounded-3xl p-6 shadow-sm">
          <div className="w-11 h-11 rounded-full gold-gradient-bg text-white flex items-center justify-center mb-4"><Icon className="w-5 h-5"/></div>
          <h3 className="font-serif font-bold text-lg text-charcoal-900">{t}</h3>
          <p className="text-xs text-charcoal-600 mt-2">{d}</p>
        </div>))}
    </section>
  </>);
