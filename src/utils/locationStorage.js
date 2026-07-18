import { STORAGE } from '../config'

export const LOCATION_EVENT = 'pahadlink:location'
export const ADDRESSES_EVENT = 'pahadlink:addresses'

export const ADDRESS_TAGS = ['Home', 'Work', 'Other']

export const INDIA_STATES = [
  'Uttarakhand',
  'Himachal Pradesh',
  'Delhi',
  'Uttar Pradesh',
  'Haryana',
  'Punjab',
  'Rajasthan',
  'Maharashtra',
  'Karnataka',
  'Other',
]

/** Normalize free-text state to checkout select value */
export function matchState(raw = '') {
  const text = String(raw).trim().toLowerCase()
  if (!text) return ''
  const hit = INDIA_STATES.find((s) => s.toLowerCase() === text)
  if (hit) return hit
  if (text.includes('delhi') || text === 'nct') return 'Delhi'
  if (text.includes('uttarakhand') || text.includes('ua') || text === 'uk') {
    return 'Uttarakhand'
  }
  if (text.includes('himachal')) return 'Himachal Pradesh'
  if (text.includes('uttar pradesh') || text === 'up') return 'Uttar Pradesh'
  return INDIA_STATES.includes(raw) ? raw : 'Other'
}

function makeId() {
  return `addr_${Date.now().toString(36)}_${Math.floor(Math.random() * 900 + 100)}`
}

export function normalizeLocation(input = {}) {
  const city = String(input.city || '').trim()
  const state = matchState(input.state || '')
  const pin = String(input.pin || input.pincode || '')
    .replace(/\D/g, '')
    .slice(0, 6)
  const line1 = String(input.line1 || input.address || '').trim()
  const area = String(input.area || input.landmark || '').trim()
  const fullAddress = String(input.fullAddress || '').trim()
  const tag = ADDRESS_TAGS.includes(input.tag) ? input.tag : 'Home'
  const name = String(input.name || '').trim()
  const phone = String(input.phone || '')
    .replace(/\D/g, '')
    .slice(0, 10)

  let label = String(input.label || '').trim()
  if (!label) {
    label =
      [line1 || area, city].filter(Boolean).join(', ') ||
      (pin ? `Pincode ${pin}` : 'Selected location')
  }

  return {
    id: input.id || null,
    tag,
    name,
    phone,
    label,
    fullAddress:
      fullAddress ||
      [line1, area, city, state, pin].filter(Boolean).join(', '),
    line1: line1 || area || city || label,
    area,
    city,
    state,
    pin,
    lat: typeof input.lat === 'number' ? input.lat : undefined,
    lng: typeof input.lng === 'number' ? input.lng : undefined,
    source: input.source || 'custom',
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
}

export function readLocation() {
  try {
    const raw = localStorage.getItem(STORAGE.LOCATION)
    return raw ? normalizeLocation(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveLocation(next) {
  const normalized = normalizeLocation(next)
  localStorage.setItem(STORAGE.LOCATION, JSON.stringify(normalized))
  window.dispatchEvent(
    new CustomEvent(LOCATION_EVENT, { detail: normalized })
  )
  return normalized
}

function emitAddresses(list) {
  window.dispatchEvent(new CustomEvent(ADDRESSES_EVENT, { detail: list }))
}

function writeAddresses(list) {
  localStorage.setItem(STORAGE.ADDRESSES, JSON.stringify(list))
  emitAddresses(list)
  return list
}

/** Migrate legacy single location / checkout address into the book */
function migrateAddressesIfNeeded(list) {
  if (list.length) return list

  const legacy = []
  const loc = readLocation()
  if (loc?.line1 || loc?.city || loc?.pin) {
    legacy.push(
      normalizeLocation({
        ...loc,
        id: makeId(),
        tag: 'Home',
        source: loc.source || 'migrated',
      })
    )
  }

  try {
    const raw = localStorage.getItem(STORAGE.CHECKOUT_ADDRESS)
    const checkout = raw ? JSON.parse(raw) : null
    if (checkout?.address || checkout?.city) {
      const candidate = normalizeLocation({
        id: makeId(),
        tag: 'Home',
        name: checkout.name || '',
        phone: checkout.phone || '',
        line1: checkout.address || '',
        area: checkout.landmark || '',
        city: checkout.city || '',
        state: checkout.state || '',
        pin: checkout.pincode || '',
        source: 'checkout',
      })
      const dup = legacy.some(
        (a) =>
          a.line1 === candidate.line1 &&
          a.city === candidate.city &&
          a.pin === candidate.pin
      )
      if (!dup) legacy.push(candidate)
    }
  } catch {
    /* ignore */
  }

  if (legacy.length) writeAddresses(legacy)
  return legacy
}

export function listAddresses() {
  try {
    const raw = localStorage.getItem(STORAGE.ADDRESSES)
    const parsed = raw ? JSON.parse(raw) : []
    const list = Array.isArray(parsed)
      ? parsed.map((item) => normalizeLocation(item)).filter((a) => a.line1 || a.city)
      : []
    return migrateAddressesIfNeeded(list)
  } catch {
    return migrateAddressesIfNeeded([])
  }
}

export function getAddressById(id) {
  if (!id) return null
  return listAddresses().find((a) => a.id === id) || null
}

/**
 * Create or update a saved delivery address, then select it as active.
 * @returns {object} saved address
 */
export function upsertAddress(input, { select = true } = {}) {
  const list = listAddresses()
  const base = normalizeLocation(input)
  const id = base.id || makeId()
  const next = {
    ...base,
    id,
    updatedAt: new Date().toISOString(),
  }

  const idx = list.findIndex((a) => a.id === id)
  const updated =
    idx >= 0
      ? list.map((a, i) => (i === idx ? next : a))
      : [next, ...list].slice(0, 12)

  writeAddresses(updated)
  if (select) saveLocation(next)
  return next
}

export function deleteAddress(id) {
  const list = listAddresses().filter((a) => a.id !== id)
  writeAddresses(list)

  const active = readLocation()
  if (active?.id === id) {
    if (list[0]) saveLocation(list[0])
    else {
      localStorage.removeItem(STORAGE.LOCATION)
      window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: null }))
    }
  }
  return list
}

/** Select a saved address as the active delivery location */
export function selectAddress(idOrAddress) {
  const address =
    typeof idOrAddress === 'string'
      ? getAddressById(idOrAddress)
      : normalizeLocation(idOrAddress)

  if (!address) return null

  // Ensure it exists in the book
  if (address.id && !getAddressById(address.id)) {
    return upsertAddress(address, { select: true })
  }

  return saveLocation(address)
}

/** Map saved location → checkout form fields */
export function locationToCheckoutFields(location) {
  if (!location) {
    return {
      address: '',
      city: '',
      state: '',
      pincode: '',
      name: '',
      phone: '',
      landmark: '',
      addressId: '',
      tag: 'Home',
    }
  }
  const loc = normalizeLocation(location)
  return {
    address: loc.line1 || loc.label || '',
    city: loc.city || '',
    state: loc.state || '',
    pincode: loc.pin || '',
    name: loc.name || '',
    phone: loc.phone || '',
    landmark: loc.area || '',
    addressId: loc.id || '',
    tag: loc.tag || 'Home',
  }
}
