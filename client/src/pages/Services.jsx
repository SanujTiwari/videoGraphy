import React, { useEffect, useState } from 'react';
import { ServiceCard } from '../components/ServiceCard';
import { PageHeader } from '../components/PageHeader';
import { apiRequest } from '../api';
export const Services = () => {
    const [services, setServices] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => {
        apiRequest('/services').then((d) => setServices(d.services || [])).catch((e) => setError(e.message));
    }, []);
    return (<>
      <PageHeader eyebrow="What We Do" title="Our Services" subtitle="Photography, cinematography, drones, live streaming, albums and more."/>
      <section className="max-w-7xl mx-auto px-4 py-16">
        {error && <p className="text-center text-red-600 text-sm mb-6">Could not load services: {error}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s) => (<ServiceCard key={s.id} id={s.id} title={s.title} category={s.category} description={s.description} starting_price={s.starting_price} duration_hours={s.duration_hours} image_url={s.image_url} features={s.features || []}/>))}
        </div>
      </section>
    </>);
};
