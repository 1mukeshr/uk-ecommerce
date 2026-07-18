/**
 * Coupon catalog + apply helpers (server).
 * Keep codes in sync with src/data/coupons.js for checkout UX.
 */

export const FREE_SHIP_AT = 499
export const SHIPPING_FEE = 49

export const COUPONS = {
  PAHAD15: {
    code: 'PAHAD15',
    type: 'percent',
    value: 15,
    minSubtotal: 0,
    firstOrderOnly: true,
    label: '15% off',
  },
  HILL50: {
    code: 'HILL50',
    type: 'flat',
    value: 50,
    minSubtotal: 499,
    firstOrderOnly: false,
    label: '₹50 off',
  },
}

export function normalizeCouponCode(raw = '') {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function calcShipping(subtotal) {
  const amount = Math.max(0, Number(subtotal) || 0)
  return amount >= FREE_SHIP_AT ? 0 : SHIPPING_FEE
}

/**
 * @returns {{
 *   ok: boolean,
 *   code?: string,
 *   label?: string,
 *   discount: number,
 *   message: string,
 * }}
 */
export function applyCoupon(subtotal, rawCode, { isFirstOrder = true } = {}) {
  const code = normalizeCouponCode(rawCode)
  const amount = Math.max(0, Number(subtotal) || 0)

  if (!code) {
    return { ok: false, discount: 0, message: 'Enter a coupon code' }
  }

  const coupon = COUPONS[code]
  if (!coupon) {
    return { ok: false, discount: 0, message: 'Invalid coupon code' }
  }

  if (amount < (coupon.minSubtotal || 0)) {
    return {
      ok: false,
      discount: 0,
      message: `Add items worth ₹${coupon.minSubtotal} to use ${coupon.code}`,
    }
  }

  if (coupon.firstOrderOnly && !isFirstOrder) {
    return {
      ok: false,
      discount: 0,
      message: `${coupon.code} is only for first orders`,
    }
  }

  let discount = 0
  if (coupon.type === 'percent') {
    discount = Math.round((amount * coupon.value) / 100)
  } else if (coupon.type === 'flat') {
    discount = coupon.value
  }

  discount = Math.min(discount, amount)
  if (discount <= 0) {
    return { ok: false, discount: 0, message: 'Coupon does not apply' }
  }

  return {
    ok: true,
    code: coupon.code,
    label: coupon.label,
    discount,
    message: `${coupon.label} applied`,
  }
}

export function buildOrderTotals(subtotal, rawCode, opts = {}) {
  const itemsTotal = Math.max(0, Number(subtotal) || 0)
  const coupon = applyCoupon(itemsTotal, rawCode, opts)
  const discountAmount = coupon.ok ? coupon.discount : 0
  const shippingFee = calcShipping(itemsTotal)
  const totalAmount = Math.max(0, itemsTotal - discountAmount + shippingFee)

  return {
    itemsTotal,
    discountAmount,
    shippingFee,
    totalAmount,
    couponCode: coupon.ok ? coupon.code : '',
    couponLabel: coupon.ok ? coupon.label : '',
    couponOk: coupon.ok,
    couponMessage: coupon.message,
  }
}
