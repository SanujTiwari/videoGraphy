import React, { createContext, useContext, useState } from 'react';
const initialDraft = {
    event_type: 'Wedding',
    package_id: null,
    package_name: '',
    package_price: 0,
    package_price_max: null,
    package_features: [],
    add_ons: [],
    event_date: '',
    event_start_time: '16:00',
    event_end_time: '23:00',
    venue: '',
    city: '',
    guest_count: 350,
    special_requirements: '',
    customer_name: '',
    customer_email: '',
    customer_mobile: '',
    coupon_code: '',
    discount_amount: 0,
};
// Holds the booking form data (selected package, dates, customer details...) for the whole site
const BookingContext = createContext(undefined);
export const BookingProvider = ({ children }) => {
    const [draft, setDraft] = useState(initialDraft);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const openWizard = (preselectedPackageId, packageName, packagePrice, extra) => {
        if (preselectedPackageId && packageName && packagePrice !== undefined) {
            setDraft((prev) => ({
                ...prev,
                package_id: preselectedPackageId,
                package_name: packageName,
                package_price: packagePrice,
                package_price_max: (extra && extra.price_max) || null,
                package_features: (extra && extra.features) || [],
            }));
        }
        setCurrentStep(1);
        setIsWizardOpen(true);
    };
    const closeWizard = () => {
        setIsWizardOpen(false);
    };
    const resetDraft = () => {
        setDraft(initialDraft);
        setCurrentStep(1);
    };
    const calculateTotals = () => {
        const pkgPrice = draft.package_price || 0;
        const addOnsTotal = draft.add_ons.reduce((acc, a) => acc + a.price * a.quantity, 0);
        const rawTotal = pkgPrice + addOnsTotal;
        const discount = draft.discount_amount || 0;
        const finalTotal = Math.max(0, rawTotal - discount);
        const advanceRequired = Math.round(finalTotal * 0.3); // 30% advance
        const balanceRemaining = finalTotal - advanceRequired;
        return { rawTotal, discount, finalTotal, advanceRequired, balanceRemaining };
    };
    return (<BookingContext.Provider value={{
            draft,
            setDraft,
            isWizardOpen,
            openWizard,
            closeWizard,
            currentStep,
            setCurrentStep,
            calculateTotals,
            resetDraft,
        }}>
      {children}
    </BookingContext.Provider>);
};
export const useBooking = () => {
    const context = useContext(BookingContext);
    if (!context)
        throw new Error('useBooking must be used within BookingProvider');
    return context;
};
