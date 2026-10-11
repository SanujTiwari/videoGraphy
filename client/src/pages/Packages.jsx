import React, { useEffect, useState } from 'react';
import { PackageGrid } from '../components/PackageCard';
import { PackageComparison } from '../components/PackageComparison';
import { PageHeader } from '../components/PageHeader';
import { apiRequest } from '../api';
export const Packages = () => {
    const [packages, setPackages] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => {
        apiRequest('/packages/compare').then((d) => setPackages(d.packages || [])).catch((e) => setError(e.message));
    }, []);
    return (<>
      <PageHeader eyebrow="Transparent Pricing" title="Wedding Packages" subtitle="Silver, Gold and Diamond - choose your package and customise it while booking."/>
      <section className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {error && <p className="text-center text-red-600 text-sm">Could not load packages: {error}</p>}
        <PackageGrid packages={packages}/>
        <PackageComparison packages={packages}/>
      </section>
    </>);
};
