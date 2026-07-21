/**
 * Server coupon helpers — domain rules from shared; order totals stay here.
 */
export {
  FREE_SHIP_AT,
  SHIPPING_FEE,
  COUPONS,
  normalizeCouponCode,
  calcShipping,
  applyCoupon,
} from '../../shared/coupons.js'

import { applyCoupon, calcShipping } from '../../shared/coupons.js'

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
