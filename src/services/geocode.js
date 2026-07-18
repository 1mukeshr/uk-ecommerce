/**
 * Address lookup helpers (PahadLink-style).
 * Prefer Google Geocoding/Places when VITE_GOOGLE_MAPS_API_KEY is set;
 * otherwise OpenStreetMap Nominatim + India Post pincode API.
 */

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
}

function mapsKey() {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
}

function findComponent(components, ...types) {
  const hit = (components || []).find((c) =>
    types.some((t) => c.types.includes(t))
  )
  return hit?.long_name || ''
}

function fromGoogleResult(result) {
  const components = result.address_components || []
  const streetNumber = findComponent(components, 'street_number')
  const road = findComponent(components, 'route', 'street_address')
  const premise = findComponent(components, 'premise', 'subpremise')
  const area = findComponent(
    components,
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'sublocality_level_2'
  )
  const city = findComponent(
    components,
    'locality',
    'postal_town',
    'administrative_area_level_2'
  )
  const state = findComponent(components, 'administrative_area_level_1')
  const pin = findComponent(components, 'postal_code')
    .replace(/\D/g, '')
    .slice(0, 6)
  const line1 =
    [streetNumber, road || premise, !road && area ? area : '']
      .filter(Boolean)
      .join(', ') ||
    [premise, area].filter(Boolean).join(', ') ||
    area ||
    city
  const label =
    [area || road || city, city !== (area || road) ? city : '', state, pin]
      .filter(Boolean)
      .join(', ') || result.formatted_address
  const fullAddress = result.formatted_address || label

  const loc = result.geometry?.location

  return {
    label,
    fullAddress,
    line1: line1 || fullAddress,
    area,
    city,
    state,
    pin,
    lat: typeof loc?.lat === 'number' ? loc.lat : undefined,
    lng: typeof loc?.lng === 'number' ? loc.lng : undefined,
    source: 'google',
  }
}

function fromNominatim(data) {
  const a = data.address || {}
  const house = a.house_number || ''
  const building = a.building || ''
  const road =
    a.road || a.pedestrian || a.residential || a.path || a.footway || ''
  const area =
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.city_district ||
    a.village ||
    a.hamlet ||
    a.locality ||
    ''
  const city =
    a.city ||
    a.town ||
    a.municipality ||
    a.county ||
    a.state_district ||
    a.district ||
    ''
  const state = a.state || ''
  const pin = String(a.postcode || '')
    .replace(/\D/g, '')
    .slice(0, 6)
  const line1 =
    [house, road || building, !road && area ? area : '']
      .filter(Boolean)
      .join(', ') ||
    [building, area].filter(Boolean).join(', ') ||
    area ||
    city
  const label =
    [area || road || city, city && city !== area ? city : '', state, pin]
      .filter(Boolean)
      .join(', ') || data.display_name
  const fullAddress = data.display_name || label

  return {
    label,
    fullAddress,
    line1: line1 || fullAddress,
    area,
    city,
    state,
    pin,
    lat: data.lat != null ? Number(data.lat) : undefined,
    lng: data.lon != null ? Number(data.lon) : undefined,
    source: 'nominatim',
  }
}

/** Fill gaps so GPS saves always carry a usable checkout address */
export function completeAddressFields(place = {}) {
  const fullAddress = String(place.fullAddress || place.label || '').trim()
  let line1 = String(place.line1 || '').trim()
  let area = String(place.area || '').trim()
  let city = String(place.city || '').trim()
  let state = String(place.state || '').trim()
  let pin = String(place.pin || '')
    .replace(/\D/g, '')
    .slice(0, 6)

  if (!line1 && fullAddress) {
    line1 = fullAddress.split(',').slice(0, 2).join(',').trim()
  }

  if ((!city || !state || !pin) && fullAddress) {
    const parts = fullAddress
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (!city && parts.length >= 2) {
      city = parts[parts.length - 3] || parts[parts.length - 2] || city
    }
    if (!area && parts.length >= 3) {
      area = parts[1] || area
    }
    if (!pin) {
      const pinHit = fullAddress.match(/\b(\d{6})\b/)
      if (pinHit) pin = pinHit[1]
    }
  }

  const label =
    String(place.label || '').trim() ||
    [line1 || area, city, pin].filter(Boolean).join(', ') ||
    fullAddress ||
    'Current location'

  return {
    ...place,
    label,
    fullAddress: fullAddress || label,
    line1: line1 || area || city || label,
    area,
    city,
    state,
    pin,
  }
}

/** Reverse geocode GPS → full structured address */
export async function reverseGeocode(latitude, longitude) {
  const key = mapsKey()
  if (key) {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${latitude},${longitude}&language=en&region=in&key=${key}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'OK' && data.results?.[0]) {
          return completeAddressFields({
            ...fromGoogleResult(data.results[0]),
            lat: latitude,
            lng: longitude,
            source: 'gps',
          })
        }
      }
    } catch {
      // fall through
    }
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18` +
      `&accept-language=en-IN,en`
    const res = await fetch(url, { headers: NOMINATIM_HEADERS })
    if (res.ok) {
      const data = await res.json()
      return completeAddressFields({
        ...fromNominatim(data),
        lat: latitude,
        lng: longitude,
        source: 'gps',
      })
    }
  } catch {
    // fallback below
  }

  return completeAddressFields({
    label: 'Current location',
    fullAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    line1: 'Current location',
    area: '',
    city: '',
    state: '',
    pin: '',
    lat: latitude,
    lng: longitude,
    source: 'gps',
  })
}

/** Live place / address search (India) */
export async function searchPlaces(query, { signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  if (/^\d{6}$/.test(q)) {
    return lookupPincode(q, { signal })
  }

  const key = mapsKey()
  if (key) {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(q)}&components=country:in&key=${key}`
      // Browser CORS blocks Places Autocomplete REST — skip to Nominatim for web
    } catch {
      // ignore
    }
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&q=${encodeURIComponent(q)}` +
      `&countrycodes=in&addressdetails=1&limit=8`
    const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((item) => ({
      ...fromNominatim(item),
      source: 'search',
    }))
  } catch (err) {
    if (err?.name === 'AbortError') return []
    return []
  }
}

/** Resolve Indian pincode → city / state / area options */
export async function lookupPincode(pin, { signal } = {}) {
  const code = String(pin || '').replace(/\D/g, '').slice(0, 6)
  if (!/^\d{6}$/.test(code)) return []

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
      signal,
    })
    if (res.ok) {
      const data = await res.json()
      const entry = Array.isArray(data) ? data[0] : null
      if (entry?.Status === 'Success' && Array.isArray(entry.PostOffice)) {
        return entry.PostOffice.slice(0, 10).map((po) => {
          const area = po.Name || ''
          const city = po.Block || po.District || ''
          const state = po.State || ''
          const label = [area, city, state].filter(Boolean).join(', ')
          return {
            label,
            fullAddress: `${area}, ${city}, ${state} ${code}`,
            line1: area,
            area,
            city: po.District || city,
            state,
            pin: code,
            source: 'pincode',
          }
        })
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return []
  }

  // Nominatim fallback for pincode
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&postalcode=${code}&country=India&addressdetails=1&limit=5`
    const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...fromNominatim(item),
      pin: code,
      source: 'pincode',
    }))
  } catch (err) {
    if (err?.name === 'AbortError') return []
    return []
  }
}
