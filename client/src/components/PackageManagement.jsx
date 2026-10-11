import React, { useState, useEffect } from 'react';
import { Check, Plus, Trash2, ArrowUp, ArrowDown, Eye, AlertCircle, Sparkles, Tag, Shield, Percent, DollarSign, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const box = 'bg-white border border-gold-300/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6';
const inputClass = 'rounded-xl border border-gold-300/60 bg-white px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gold-400';
const labelClass = 'text-xs font-semibold text-charcoal-700 block mb-1';

// Single Package Editor with comprehensive A, B, C, D, E sections and Live Preview
export const PackageEditor = ({ pkg, onSaved }) => {
  // Local state initialized with package values
  const [formData, setFormData] = useState({
    name: pkg.name || '',
    badge: pkg.badge || '',
    description: pkg.description || '',
    image_url: pkg.image_url || '',
    coverage_hours: pkg.coverage_hours || 96,
    display_order: pkg.display_order || 1,
    status: pkg.status || 'active',

    // Pricing & Discounts
    pricing_mode: pkg.pricing_mode || 'auto', // 'auto' | 'manual'
    original_price: pkg.original_price ?? '',
    discount_type: pkg.discount_type || 'percentage', // 'percentage' | 'fixed'
    discount_value: pkg.discount_value ?? '',
    discount_enabled: pkg.discount_enabled !== 0,
    discount_start_date: pkg.discount_start_date || '',
    discount_end_date: pkg.discount_end_date || '',
    final_price: pkg.price ?? '',

    // Inclusions
    included_services: Array.isArray(pkg.included_services) ? [...pkg.included_services] : [],
    features: Array.isArray(pkg.features) ? [...pkg.features] : [],
    details: {
      tier: pkg.details?.tier || '',
      days: pkg.details?.days || '',
      album: pkg.details?.album || '',
      pendrive: pkg.details?.pendrive || '',
      drone: pkg.details?.drone || '',
    },

    // Resource Requirements for Availability System
    resource_reqs: pkg.resource_reqs || {
      photo_teams: 1,
      video_teams: 1,
      camera_kits: 2,
      drones: 0,
      drone_operators: 0,
      gimbals: 0,
    },

    // Policies
    travel_policy: pkg.travel_policy || pkg.note || 'Travel charges may apply for event locations more than 30 km from the studio.',
    extra_travel_charge: pkg.extra_travel_charge || '',
    advance_percentage: pkg.advance_percentage || 30,
    terms: pkg.terms || '',
  });

  const handleResourceReqChange = (key, val) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      resource_reqs: { ...prev.resource_reqs, [key]: Math.max(0, Number(val) || 0) },
    }));
  };

  const [newInclusion, setNewInclusion] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Sync if pkg changes from outside
  useEffect(() => {
    setFormData({
      name: pkg.name || '',
      badge: pkg.badge || '',
      description: pkg.description || '',
      image_url: pkg.image_url || '',
      coverage_hours: pkg.coverage_hours || 96,
      display_order: pkg.display_order || 1,
      status: pkg.status || 'active',
      pricing_mode: pkg.pricing_mode || 'auto',
      original_price: pkg.original_price ?? '',
      discount_type: pkg.discount_type || 'percentage',
      discount_value: pkg.discount_value ?? '',
      discount_enabled: pkg.discount_enabled !== 0,
      discount_start_date: pkg.discount_start_date || '',
      discount_end_date: pkg.discount_end_date || '',
      final_price: pkg.price ?? '',
      included_services: Array.isArray(pkg.included_services) ? [...pkg.included_services] : [],
      features: Array.isArray(pkg.features) ? [...pkg.features] : [],
      details: {
        tier: pkg.details?.tier || '',
        days: pkg.details?.days || '',
        album: pkg.details?.album || '',
        pendrive: pkg.details?.pendrive || '',
        drone: pkg.details?.drone || '',
      },
      travel_policy: pkg.travel_policy || pkg.note || 'Travel charges may apply for event locations more than 30 km from the studio.',
      extra_travel_charge: pkg.extra_travel_charge || '',
      advance_percentage: pkg.advance_percentage || 30,
      terms: pkg.terms || '',
    });
    setIsDirty(false);
  }, [pkg]);

  // Warn user before leaving if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Dynamic real-time calculation helper
  const calculateLivePricing = () => {
    const orig = formData.original_price !== '' && formData.original_price !== null ? Number(formData.original_price) : null;
    const mode = formData.pricing_mode;
    const isDiscEnabled = formData.discount_enabled;
    const dType = formData.discount_type;
    const dVal = Number(formData.discount_value) || 0;

    let final = Number(formData.final_price) || 0;
    let saved = 0;
    let percent = 0;
    let validationMsg = '';

    if (mode === 'auto') {
      if (orig && orig > 0) {
        if (!isDiscEnabled) {
          final = orig;
          saved = 0;
          percent = 0;
        } else if (dType === 'percentage') {
          if (dVal < 0 || dVal > 100) {
            validationMsg = 'Percentage discount must be between 0 and 100';
          }
          percent = Math.min(100, Math.max(0, dVal));
          saved = Math.round((orig * percent) / 100);
          final = Math.max(0, orig - saved);
        } else {
          // Fixed
          if (dVal < 0) validationMsg = 'Discount amount cannot be negative';
          if (dVal > orig) validationMsg = 'Discount cannot exceed original price';
          saved = Math.min(orig, Math.max(0, dVal));
          percent = orig > 0 ? Number(((saved / orig) * 100).toFixed(2)) : 0;
          final = Math.max(0, orig - saved);
        }
      } else {
        // No original price: pure final price
        saved = 0;
        percent = 0;
      }
    } else {
      // Manual final price mode
      if (orig && orig > 0) {
        if (final > orig) {
          validationMsg = 'Final price cannot exceed original price';
        }
        if (isDiscEnabled && final < orig) {
          saved = Math.max(0, orig - final);
          percent = Number(((saved / orig) * 100).toFixed(2));
        } else {
          saved = 0;
          percent = 0;
        }
      } else {
        saved = 0;
        percent = 0;
      }
    }

    return {
      originalPrice: orig,
      finalPrice: Math.round(final),
      savedAmount: saved,
      discountPercent: percent,
      validationMsg,
      isDiscountActive: isDiscEnabled && saved > 0,
    };
  };

  const live = calculateLivePricing();

  const handleFieldChange = (field, value) => {
    setIsDirty(true);
    setSaveSuccess('');
    setSaveError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDetailChange = (detailKey, value) => {
    setIsDirty(true);
    setSaveSuccess('');
    setSaveError('');
    setFormData((prev) => ({
      ...prev,
      details: { ...prev.details, [detailKey]: value },
    }));
  };

  // Switch pricing mode
  const switchPricingMode = (newMode) => {
    setIsDirty(true);
    if (newMode === 'manual') {
      // Transitioning to manual: preserve current computed final price as the manual target
      setFormData((prev) => ({
        ...prev,
        pricing_mode: 'manual',
        final_price: live.finalPrice,
      }));
    } else {
      // Transitioning to auto: preserve current computed effective discount
      setFormData((prev) => ({
        ...prev,
        pricing_mode: 'auto',
        discount_value: prev.discount_type === 'percentage' ? live.discountPercent : live.savedAmount,
      }));
    }
  };

  // Add / Remove Inclusions
  const addService = () => {
    if (!newInclusion.trim()) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      included_services: [...prev.included_services, newInclusion.trim()],
    }));
    setNewInclusion('');
  };

  const removeService = (index) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      included_services: prev.included_services.filter((_, i) => i !== index),
    }));
  };

  // Add / Remove Features & Reorder
  const addFeature = () => {
    if (!newFeature.trim()) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, newFeature.trim()],
    }));
    setNewFeature('');
  };

  const removeFeature = (index) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const moveFeature = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= formData.features.length) return;
    setIsDirty(true);
    const updated = [...formData.features];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setFormData((prev) => ({ ...prev, features: updated }));
  };

  // Save changes to backend
  const handleSave = async () => {
    if (live.validationMsg) {
      setSaveError(live.validationMsg);
      return;
    }
    setIsBusy(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const payload = {
        name: formData.name,
        badge: formData.badge,
        description: formData.description,
        image_url: formData.image_url,
        coverage_hours: Number(formData.coverage_hours) || 96,
        display_order: Number(formData.display_order) || 1,
        status: formData.status,
        pricing_mode: formData.pricing_mode,
        original_price: formData.original_price === '' ? null : Number(formData.original_price),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value === '' ? 0 : Number(formData.discount_value),
        discount_enabled: formData.discount_enabled ? 1 : 0,
        discount_start_date: formData.discount_start_date || null,
        discount_end_date: formData.discount_end_date || null,
        price: live.finalPrice,
        final_price: live.finalPrice,
        included_services: formData.included_services,
        features: formData.features,
        details: formData.details,
        travel_policy: formData.travel_policy,
        note: formData.travel_policy,
        extra_travel_charge: formData.extra_travel_charge,
        advance_percentage: Number(formData.advance_percentage) || 30,
        terms: formData.terms,
        resource_reqs: formData.resource_reqs,
      };

      const res = await apiRequest(`/packages/admin/${pkg.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSaveSuccess('Package updated and saved successfully! ✓');
      setIsDirty(false);
      if (onSaved) onSaved(res.package || payload);
    } catch (err) {
      setSaveError(err.message || 'Failed to save package');
    } finally {
      setIsBusy(false);
    }
  };

  // Reset to original
  const handleReset = () => {
    if (window.confirm('Discard all unsaved changes for this package?')) {
      setIsDirty(false);
      setSaveSuccess('');
      setSaveError('');
      // Force reload by re-applying pkg
      setFormData({
        name: pkg.name || '',
        badge: pkg.badge || '',
        description: pkg.description || '',
        image_url: pkg.image_url || '',
        coverage_hours: pkg.coverage_hours || 96,
        display_order: pkg.display_order || 1,
        status: pkg.status || 'active',
        pricing_mode: pkg.pricing_mode || 'auto',
        original_price: pkg.original_price ?? '',
        discount_type: pkg.discount_type || 'percentage',
        discount_value: pkg.discount_value ?? '',
        discount_enabled: pkg.discount_enabled !== 0,
        discount_start_date: pkg.discount_start_date || '',
        discount_end_date: pkg.discount_end_date || '',
        final_price: pkg.price ?? '',
        included_services: Array.isArray(pkg.included_services) ? [...pkg.included_services] : [],
        features: Array.isArray(pkg.features) ? [...pkg.features] : [],
        details: {
          tier: pkg.details?.tier || '',
          days: pkg.details?.days || '',
          album: pkg.details?.album || '',
          pendrive: pkg.details?.pendrive || '',
          drone: pkg.details?.drone || '',
        },
        travel_policy: pkg.travel_policy || pkg.note || 'Travel charges may apply for event locations more than 30 km from the studio.',
        extra_travel_charge: pkg.extra_travel_charge || '',
        advance_percentage: pkg.advance_percentage || 30,
        terms: pkg.terms || '',
      });
    }
  };

  return (
    <div className={box}>
      {/* Header bar of package */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold-200/60 pb-5">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-gold-50 border border-gold-300 text-gold-700 flex items-center justify-center font-serif font-bold text-lg">
            {formData.name.charAt(0) || 'P'}
          </span>
          <div>
            <h3 className="font-serif text-2xl font-bold text-charcoal-900">{formData.name} Package</h3>
            <p className="text-xs text-charcoal-500">
              ID #{pkg.id} · Order: {formData.display_order} ·{' '}
              <span className={`font-semibold ${formData.status === 'active' ? 'text-green-600' : 'text-charcoal-400'}`}>
                {formData.status === 'active' ? '● Active on Website' : '○ Inactive / Hidden'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gold-400 text-gold-700 hover:bg-gold-50 rounded-full text-xs font-semibold transition"
          >
            <Eye className="w-3.5 h-3.5" /> Live Preview
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-6 py-2 gold-gradient-bg text-white rounded-full text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-60 transition"
          >
            {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isBusy ? 'Saving...' : 'Save Package'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {saveError}
        </div>
      )}

      {/* SECTION A: Package Information */}
      <div className="space-y-4">
        <h4 className="text-sm font-serif font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
          <Tag className="w-4 h-4 text-gold-600" /> A. Package Information
        </h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Package Name</label>
            <input
              type="text"
              className={inputClass}
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g. Silver, Gold, Diamond"
            />
          </div>
          <div>
            <label className={labelClass}>Badge / Ribbon Label</label>
            <input
              type="text"
              className={inputClass}
              value={formData.badge}
              onChange={(e) => handleFieldChange('badge', e.target.value)}
              placeholder="e.g. Entry Package, Most Popular"
            />
          </div>
          <div>
            <label className={labelClass}>Display Order</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={formData.display_order}
              onChange={(e) => handleFieldChange('display_order', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Status Visibility</label>
            <select
              className={inputClass}
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
            >
              <option value="active">Active (Visible on public site)</option>
              <option value="inactive">Inactive (Hidden from public site)</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={labelClass}>Short Tagline / Description</label>
            <textarea
              rows={2}
              className={inputClass}
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Short description displayed on package card header..."
            />
          </div>
        </div>
      </div>

      {/* SECTION B: Pricing and Discounts */}
      <div className="space-y-4 border-t border-gold-200/60 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-serif font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gold-600" /> B. Pricing &amp; Authoritative Discount Engine
          </h4>

          {/* Pricing Mode Toggle */}
          <div className="flex bg-gold-50 border border-gold-300/60 rounded-full p-1 text-xs">
            <button
              type="button"
              onClick={() => switchPricingMode('auto')}
              className={`px-3 py-1 rounded-full font-semibold transition ${
                formData.pricing_mode === 'auto' ? 'gold-gradient-bg text-white' : 'text-charcoal-700 hover:text-gold-700'
              }`}
            >
              ⚡ Automatic Pricing
            </button>
            <button
              type="button"
              onClick={() => switchPricingMode('manual')}
              className={`px-3 py-1 rounded-full font-semibold transition ${
                formData.pricing_mode === 'manual' ? 'gold-gradient-bg text-white' : 'text-charcoal-700 hover:text-gold-700'
              }`}
            >
              ✏️ Manual Final Price
            </button>
          </div>
        </div>

        {/* Pricing Fields Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* 1. Original Price */}
          <div>
            <label className={labelClass}>
              1. Original Price (₹)
              <span className="text-charcoal-400 font-normal"> (optional)</span>
            </label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="e.g. 26000"
              value={formData.original_price}
              onChange={(e) => handleFieldChange('original_price', e.target.value)}
            />
            <p className="text-[11px] text-charcoal-500 mt-1">Crossed out on website when discount is active.</p>
          </div>

          {/* 2. Discount Type / Mode specific */}
          {formData.pricing_mode === 'auto' ? (
            <>
              <div>
                <label className={labelClass}>2. Discount Type</label>
                <select
                  className={inputClass}
                  value={formData.discount_type}
                  onChange={(e) => handleFieldChange('discount_type', e.target.value)}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
                <p className="text-[11px] text-charcoal-500 mt-1">Select % off or direct ₹ discount.</p>
              </div>

              <div>
                <label className={labelClass}>
                  3. Discount Value ({formData.discount_type === 'percentage' ? '%' : '₹'})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    className={inputClass}
                    placeholder={formData.discount_type === 'percentage' ? 'e.g. 15' : 'e.g. 4000'}
                    value={formData.discount_value}
                    onChange={(e) => handleFieldChange('discount_value', e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-charcoal-400 font-bold pointer-events-none">
                    {formData.discount_type === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 mt-1">Calculates final price automatically.</p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Exact Final Price (₹) <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="number"
                min="1"
                className={`${inputClass} border-gold-500 font-bold text-base text-gold-900 bg-gold-50/30`}
                placeholder="e.g. 22000"
                value={formData.final_price}
                onChange={(e) => handleFieldChange('final_price', e.target.value)}
              />
              <p className="text-[11px] text-charcoal-500 mt-1">
                Admin sets exact price. System calculates effective discount % and ₹ amount automatically.
              </p>
            </div>
          )}

          {/* Final Price (display or editable) */}
          {formData.pricing_mode === 'auto' && (
            <div>
              <label className={labelClass}>6. Computed Final Price</label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-gold-50/50 font-bold text-base text-charcoal-900">
                {money(live.finalPrice)}
              </div>
              <p className="text-[11px] text-charcoal-500 mt-1">Exact price billed to customers.</p>
            </div>
          )}
        </div>

        {/* Date validity & Discount Toggle */}
        <div className="grid sm:grid-cols-3 gap-4 pt-2 items-center">
          <div>
            <label className={labelClass}>Discount Start Date (optional)</label>
            <input
              type="date"
              className={inputClass}
              value={formData.discount_start_date}
              onChange={(e) => handleFieldChange('discount_start_date', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Discount End Date (optional)</label>
            <input
              type="date"
              className={inputClass}
              value={formData.discount_end_date}
              onChange={(e) => handleFieldChange('discount_end_date', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.discount_enabled}
                onChange={(e) => handleFieldChange('discount_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-charcoal-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-charcoal-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
            </label>
            <span className="text-xs font-semibold text-charcoal-800">
              {formData.discount_enabled ? 'Discount Enabled' : 'Discount Disabled'}
            </span>
          </div>
        </div>

        {/* Real-time Pricing Summary Card */}
        <div className="bg-charcoal-900 text-white rounded-2xl p-5 border border-gold-400/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Real-Time Live Pricing Breakdown
            </span>
            <span className="text-xs font-mono text-charcoal-400">Mode: {formData.pricing_mode.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-2.5 rounded-xl bg-white/5">
              <p className="text-[11px] text-charcoal-400 uppercase">Original Price</p>
              <p className="font-serif text-lg font-bold text-white mt-0.5">
                {live.originalPrice ? money(live.originalPrice) : 'Not Set'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5">
              <p className="text-[11px] text-charcoal-400 uppercase">Effective Discount</p>
              <p className="font-serif text-lg font-bold text-emerald-400 mt-0.5">
                {live.isDiscountActive ? `${live.discountPercent}% OFF` : '0%'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5">
              <p className="text-[11px] text-charcoal-400 uppercase">You Save</p>
              <p className="font-serif text-lg font-bold text-emerald-400 mt-0.5">
                {live.isDiscountActive ? money(live.savedAmount) : '₹0'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-gold-400/20 border border-gold-400/40">
              <p className="text-[11px] text-gold-300 uppercase font-semibold">Final Billed Price</p>
              <p className="font-serif text-xl font-bold text-gold-300 mt-0.5">
                {money(live.finalPrice)}
              </p>
            </div>
          </div>

          {live.validationMsg && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {live.validationMsg}
            </p>
          )}
        </div>
      </div>

      {/* SECTION C: Package Inclusions */}
      <div className="space-y-4 border-t border-gold-200/60 pt-6">
        <h4 className="text-sm font-serif font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
          <Check className="w-4 h-4 text-gold-600" /> C. Package Inclusions &amp; Specifications
        </h4>

        {/* Quick Specs (Days, Album, Drone, Pendrive) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gold-50/40 p-4 rounded-2xl border border-gold-200/50">
          <div>
            <label className={labelClass}>Event Days Coverage</label>
            <input
              type="text"
              className={inputClass}
              value={formData.details.days}
              onChange={(e) => handleDetailChange('days', e.target.value)}
              placeholder="e.g. 4 Days Coverage"
            />
          </div>
          <div>
            <label className={labelClass}>Album Spec &amp; Photos</label>
            <input
              type="text"
              className={inputClass}
              value={formData.details.album}
              onChange={(e) => handleDetailChange('album', e.target.value)}
              placeholder="e.g. 30 Pages Album, Size 14×40"
            />
          </div>
          <div>
            <label className={labelClass}>Pendrive Storage</label>
            <input
              type="text"
              className={inputClass}
              value={formData.details.pendrive}
              onChange={(e) => handleDetailChange('pendrive', e.target.value)}
              placeholder="e.g. 1 Pendrive, 64 GB"
            />
          </div>
          <div>
            <label className={labelClass}>Drone Shoot Spec</label>
            <input
              type="text"
              className={inputClass}
              value={formData.details.drone}
              onChange={(e) => handleDetailChange('drone', e.target.value)}
              placeholder="e.g. 1 Day Drone Shoot (Baraat)"
            />
          </div>
        </div>

        {/* Feature List (Checklist on public cards) */}
        <div className="space-y-2">
          <label className={labelClass}>Features Checklist (Reorderable with buttons)</label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {formData.features.map((feat, index) => (
              <div key={index} className="flex items-center gap-2 bg-white border border-gold-200 p-2 rounded-xl text-xs">
                <span className="w-5 text-charcoal-400 font-mono text-[11px]">{index + 1}.</span>
                <span className="flex-1 font-medium text-charcoal-800">{feat}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveFeature(index, -1)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gold-50 rounded text-charcoal-600 disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFeature(index, 1)}
                    disabled={index === formData.features.length - 1}
                    className="p-1 hover:bg-gold-50 rounded text-charcoal-600 disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="p-1 hover:bg-red-50 text-red-600 rounded ml-1"
                    title="Delete feature"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Feature input */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              className={inputClass}
              placeholder="Type new feature or inclusion..."
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            />
        {/* SECTION C.2: Resource Requirements */}
        <div className="bg-charcoal-50 p-4 rounded-2xl border border-charcoal-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-600" /> Resource Requirements (For Availability Engine)
            </span>
            <span className="text-[11px] text-charcoal-500">Auto-checked upon customer booking &amp; approval</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-charcoal-700 block mb-1">Photo Teams</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.resource_reqs?.photo_teams ?? 1}
                onChange={(e) => handleResourceReqChange('photo_teams', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-charcoal-700 block mb-1">Video Teams</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.resource_reqs?.video_teams ?? 1}
                onChange={(e) => handleResourceReqChange('video_teams', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-charcoal-700 block mb-1">Camera Kits</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.resource_reqs?.camera_kits ?? 2}
                onChange={(e) => handleResourceReqChange('camera_kits', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-charcoal-700 block mb-1">Drones (Units)</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.resource_reqs?.drones ?? 0}
                onChange={(e) => handleResourceReqChange('drones', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-charcoal-700 block mb-1">Drone Pilot</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.resource_reqs?.drone_operators ?? 0}
                onChange={(e) => handleResourceReqChange('drone_operators', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-charcoal-700 block mb-1">Gimbal Rigs</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.resource_reqs?.gimbals ?? 0}
                onChange={(e) => handleResourceReqChange('gimbals', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: Travel and Booking Policies */}
      <div className="space-y-4 border-t border-gold-200/60 pt-6">
        <h4 className="text-sm font-serif font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold-600" /> D. Travel &amp; Booking Policies
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Travel Policy (Displayed on card note)</label>
            <textarea
              rows={2}
              className={inputClass}
              value={formData.travel_policy}
              onChange={(e) => handleFieldChange('travel_policy', e.target.value)}
              placeholder="e.g. Travel charges may apply for event locations more than 30 km from the studio."
            />
          </div>
          <div>
            <label className={labelClass}>Extra Travel Charge Rate (Configurable)</label>
            <input
              type="text"
              className={inputClass}
              value={formData.extra_travel_charge}
              onChange={(e) => handleFieldChange('extra_travel_charge', e.target.value)}
              placeholder="e.g. ₹25 per km beyond 30 km"
            />
          </div>
        </div>
      </div>

      {/* SECTION E: Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-200/60 pt-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || isBusy}
            className="px-4 py-2 rounded-full border border-charcoal-300 text-charcoal-600 hover:bg-charcoal-50 text-xs font-semibold disabled:opacity-40"
          >
            Reset Unsaved Changes
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-5 py-2.5 rounded-full border border-gold-400 text-gold-700 hover:bg-gold-50 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" /> Preview Website Card
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="px-7 py-2.5 rounded-full gold-gradient-bg text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-60 transition flex items-center gap-1.5"
          >
            {isBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isBusy ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Live Website Card Preview Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-ivory-50 border border-gold-300 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gold-200 pb-3">
              <span className="text-xs uppercase font-bold tracking-wider text-gold-700">
                Live Public Website Preview
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Preview Card */}
            <div
              className={`rounded-3xl p-6 border shadow-lg ${
                formData.name === 'Diamond'
                  ? 'bg-charcoal-900 text-white border-gold-400/60'
                  : formData.name === 'Gold'
                  ? 'bg-white text-charcoal-900 border-2 border-gold-400'
                  : 'bg-white text-charcoal-900 border-gold-300/60'
              }`}
            >
              {formData.badge && (
                <div className="text-center mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gold-500">
                    {formData.badge}
                  </span>
                </div>
              )}
              <h3
                className={`font-serif text-3xl font-bold text-center ${
                  formData.name === 'Diamond' ? 'text-gold-300' : 'text-charcoal-900'
                }`}
              >
                {formData.name}
              </h3>
              <p
                className={`text-xs text-center mt-1 mb-4 ${
                  formData.name === 'Diamond' ? 'text-charcoal-300' : 'text-charcoal-600'
                }`}
              >
                {formData.description}
              </p>

              {/* Price section */}
              <div className="text-center py-4 border-y border-gold-300/30 space-y-1">
                {live.isDiscountActive && live.originalPrice && (
                  <div className="text-xs line-through text-charcoal-400 font-medium">
                    {money(live.originalPrice)}
                  </div>
                )}
                <div
                  className={`font-serif text-3xl font-bold ${
                    formData.name === 'Diamond' ? 'text-gold-300' : 'text-charcoal-900'
                  }`}
                >
                  {money(live.finalPrice)}
                </div>
                {live.isDiscountActive && (
                  <div className="text-[10px] font-bold text-gold-500 uppercase tracking-widest">
                    After Discount
                  </div>
                )}
                {live.isDiscountActive && (
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
                      SAVE {money(live.savedAmount)}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
                      {live.discountPercent}% OFF
                    </span>
                  </div>
                )}
              </div>

              {/* Features list */}
              <div className="py-4 space-y-2">
                {formData.features.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />
                    <span className={formData.name === 'Diamond' ? 'text-charcoal-200' : 'text-charcoal-700'}>{f}</span>
                  </div>
                ))}
                {formData.features.length > 5 && (
                  <p className="text-[11px] text-gold-500 font-semibold pt-1">
                    + {formData.features.length - 5} more features on website
                  </p>
                )}
              </div>

              {/* Travel policy */}
              {formData.travel_policy && (
                <div className="p-2 rounded-xl bg-gold-400/10 border border-gold-400/20 text-[11px] text-gold-600 mb-4">
                  Note: {formData.travel_policy}
                </div>
              )}

              <button
                type="button"
                className="w-full py-2.5 rounded-full gold-gradient-bg text-white font-bold text-xs uppercase tracking-wider"
              >
                Book {formData.name}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-xs text-charcoal-500 hover:underline"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Full Packages Management Section for Admin Dashboard
export const PackageManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/packages/admin/all');
      setPackages(data.packages || []);
    } catch (err) {
      setError(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-900">
            Package Pricing &amp; Inclusions Management
          </h2>
          <p className="text-xs text-charcoal-500 mt-1">
            Configure exact prices, discount engines (Automatic or Manual), features, and live public website cards.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPackages}
          className="flex items-center gap-1.5 px-4 py-2 border border-gold-300 hover:bg-gold-50 rounded-full text-xs font-semibold text-charcoal-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
      {loading && <p className="text-sm text-charcoal-500">Loading package configurations...</p>}

      <div className="space-y-8">
        {packages.map((pkg) => (
          <PackageEditor key={pkg.id} pkg={pkg} onSaved={loadPackages} />
        ))}
      </div>
    </div>
  );
};
