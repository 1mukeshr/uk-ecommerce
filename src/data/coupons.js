/**
 * Frontend coupon helpers — re-export shared domain (server re-validates on order).
 */
export {
  FREE_SHIP_AT,
  SHIPPING_FEE,
  COUPONS,
  normalizeCouponCode,
  calcShipping,
  applyCoupon,
} from '@pahadlink/shared/coupons'
