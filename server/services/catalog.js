/**
 * Server catalog — pricing from shared; order line mapping stays here.
 */
export {
  PRODUCT_PRICING,
  getCatalogProduct,
  resolveUnitPrice,
  sizeWeight,
  nicePrice,
} from '../../shared/catalog.js'

import { resolveUnitPrice } from '../../shared/catalog.js'

/**
 * Map client line items to trusted catalog prices.
 * Returns { ok, items?, message? }
 */
export function priceOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    return { ok: false, message: 'Items are required' }
  }

  const items = []
  for (const item of rawItems) {
    const productId = String(item.productId || item.id || '').trim()
    const qty = Number(item.quantity ?? item.qty) || 1
    if (!productId) {
      return { ok: false, message: 'Each item needs a productId' }
    }
    if (qty < 1) {
      return { ok: false, message: 'Invalid quantity' }
    }
    const resolved = resolveUnitPrice(
      productId,
      String(item.size || item.unitSize || '').trim(),
    )
    if (!resolved) {
      return { ok: false, message: `Unknown product: ${productId}` }
    }
    items.push({
      productId,
      name: resolved.product.name,
      size: resolved.size === 'Default' ? '' : resolved.size,
      quantity: qty,
      price: resolved.price,
    })
  }

  return { ok: true, items }
}
