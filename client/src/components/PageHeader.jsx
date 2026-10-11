import React from 'react';
export const PageHeader = ({ eyebrow, title, subtitle }) => (<section className="bg-charcoal-900 text-white py-12 sm:py-20 px-4 text-center">
    <span className="text-xs font-bold uppercase tracking-widest text-gold-400">{eyebrow}</span>
    <h1 className="font-serif text-4xl sm:text-5xl font-bold mt-3">{title}</h1>
    {subtitle && <p className="max-w-2xl mx-auto mt-4 text-sm text-charcoal-300">{subtitle}</p>}
  </section>);
