/**
 * Pricing calculation and validation helper.
 * Enforces authoritative business rules across admin updates, public display, and booking creation.
 */

function roundCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round(Number(val));
}

function roundPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Number(Number(val).toFixed(2));
}

/**
 * Validates and computes exact pricing according to business rules:
 * - pricing_mode: 'auto' | 'manual'
 * - original_price: positive number or null
 * - discount_type: 'percentage' | 'fixed'
 * - discount_value: number
 * - discount_enabled: boolean / number (1 or 0)
 * - final_price (or price): positive number
 * - discount_start_date, discount_end_date: optional ISO/date strings
 */
function calculateAuthoritativePricing(input) {
  const mode = input.pricing_mode === 'manual' ? 'manual' : 'auto';
  const discountEnabled = Boolean(input.discount_enabled === true || input.discount_enabled === 1 || input.discount_enabled === '1');
  const discountType = input.discount_type === 'fixed' ? 'fixed' : 'percentage';

  let originalPrice = input.original_price !== '' && input.original_price !== null && input.original_price !== undefined
    ? Number(input.original_price)
    : null;

  if (originalPrice !== null && (isNaN(originalPrice) || originalPrice <= 0)) {
    throw new Error('Original price must be greater than zero.');
  }

  // Check date validity if supplied
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  let isDateActive = true;
  if (input.discount_start_date && input.discount_start_date > todayStr) {
    isDateActive = false;
  }
  if (input.discount_end_date && input.discount_end_date < todayStr) {
    isDateActive = false;
  }

  const effectiveDiscountActive = discountEnabled && isDateActive;

  let finalPrice = 0;
  let discountAmount = 0;
  let discountPercent = 0;
  let discountValue = Number(input.discount_value) || 0;

  if (mode === 'auto') {
    // Automatic Pricing:
    // Admin enters original_price and discount (percent or fixed).
    if (originalPrice === null || originalPrice <= 0) {
      // If no original price is given, regular fixed price applies
      finalPrice = roundCurrency(input.price !== undefined ? input.price : input.final_price);
      if (finalPrice <= 0) throw new Error('Package final price must be greater than zero.');
      originalPrice = null;
      discountAmount = null;
      discountPercent = null;
    } else {
      if (!effectiveDiscountActive) {
        // Discount disabled or expired: final price equals original price
        finalPrice = roundCurrency(originalPrice);
        discountAmount = null;
        discountPercent = null;
      } else {
        if (discountType === 'percentage') {
          if (discountValue < 0 || discountValue > 100) {
            throw new Error('Percentage discount must be between 0% and 100%.');
          }
          discountPercent = roundPercent(discountValue);
          discountAmount = roundCurrency((originalPrice * discountPercent) / 100);
          finalPrice = Math.max(0, originalPrice - discountAmount);
        } else {
          // Fixed amount discount
          if (discountValue < 0) {
            throw new Error('Discount amount cannot be negative.');
          }
          if (discountValue > originalPrice) {
            throw new Error('Fixed discount cannot exceed the original price.');
          }
          discountAmount = roundCurrency(discountValue);
          discountPercent = originalPrice > 0 ? roundPercent((discountAmount / originalPrice) * 100) : 0;
          finalPrice = Math.max(0, originalPrice - discountAmount);
        }
      }
    }
  } else {
    // Manual Pricing:
    // Admin enters original_price and exact final_price.
    const rawFinal = input.final_price !== undefined ? input.final_price : input.price;
    finalPrice = roundCurrency(rawFinal);
    if (finalPrice <= 0) {
      throw new Error('Final price must be greater than zero.');
    }

    if (originalPrice !== null && originalPrice > 0) {
      if (finalPrice > originalPrice) {
        throw new Error('Final price cannot exceed original price when original price is set.');
      }
      if (effectiveDiscountActive) {
        discountAmount = roundCurrency(originalPrice - finalPrice);
        discountPercent = roundPercent((discountAmount / originalPrice) * 100);
        discountValue = discountType === 'percentage' ? discountPercent : discountAmount;
      } else {
        discountAmount = null;
        discountPercent = null;
      }
    } else {
      originalPrice = null;
      discountAmount = null;
      discountPercent = null;
    }
  }

  return {
    pricing_mode: mode,
    price: finalPrice,
    original_price: originalPrice,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    discount_percent: discountPercent,
    discount_enabled: discountEnabled ? 1 : 0,
    discount_start_date: input.discount_start_date || null,
    discount_end_date: input.discount_end_date || null,
    is_discount_active: effectiveDiscountActive && discountAmount > 0,
  };
}

module.exports = {
  roundCurrency,
  roundPercent,
  calculateAuthoritativePricing,
};
