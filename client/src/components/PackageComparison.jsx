import React from 'react';
import { Check } from 'lucide-react';
import { getFinalPrice } from './PackageCard';

// Shows what each package adds compared to the one before it, plus a comparison table.
export function PackageComparison({ packages }) {
  if (packages.length === 0) return null;

  // Features of this package that the previous (cheaper) package does not have
  function getExtraFeatures(index) {
    if (index === 0) return packages[0].features;
    const previousFeatures = packages[index - 1].features;
    return packages[index].features.filter((feature) => !previousFeatures.includes(feature));
  }

  // Table rows: label + what to show for each package
  const rows = [
    { label: 'Price (After Discount)', getValue: (pkg) => getFinalPrice(pkg) },
    { label: 'Coverage', getValue: (pkg) => (pkg.details && pkg.details.days) || '-' },
    { label: 'Album', getValue: (pkg) => (pkg.details && pkg.details.album) || '-' },
    { label: 'Pendrive', getValue: (pkg) => (pkg.details && pkg.details.pendrive) || '-' },
    { label: 'Drone', getValue: (pkg) => (pkg.details && pkg.details.drone) || '-' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-gold-600">Compare Packages</span>
        <h2 className="font-serif text-3xl font-bold text-charcoal-900">{packages.map((pkg) => pkg.name).join(' → ')}</h2>
        <p className="text-sm text-charcoal-600">Each step up builds on the previous package.</p>
      </div>

      {/* What each package adds */}
      <div className="grid md:grid-cols-3 gap-5">
        {packages.map((pkg, index) => (
          <div key={pkg.id} className="rounded-2xl bg-white border border-gold-300/40 p-5">
            <h3 className="font-serif text-xl font-bold text-charcoal-900">{pkg.name}</h3>
            <p className="text-xs text-gold-600 font-semibold mt-1 mb-3">
              {index === 0 ? pkg.details && pkg.details.tier : packages[index - 1].name + ' + more'}
            </p>
            {index > 0 && <p className="text-[11px] uppercase tracking-wider text-charcoal-400 mb-2">Additional benefits</p>}
            <ul className="space-y-1.5">
              {getExtraFeatures(index).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-charcoal-700">
                  <Check className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" /> {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-3xl border border-gold-300/40 bg-white shadow-sm">
        <table className="w-full text-sm text-left min-w-[560px]">
          <thead className="bg-charcoal-900 text-gold-300">
            <tr>
              <th className="p-4 font-medium">Compare</th>
              {packages.map((pkg) => (
                <th key={pkg.id} className="p-4 font-serif">{pkg.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="p-4 font-semibold text-charcoal-800">{row.label}</td>
                {packages.map((pkg) => (
                  <td key={pkg.id} className="p-4 text-charcoal-700">{row.getValue(pkg)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
