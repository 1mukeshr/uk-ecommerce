import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronRightIcon,
  CloseIcon,
  DropdownIcon,
  LocateIcon,
  MapPinIcon,
  SearchIcon,
} from '../icons'
import { reverseGeocode, searchPlaces } from '../../services/geocode'
import {
  ADDRESSES_EVENT,
  ADDRESS_TAGS,
  INDIA_STATES,
  LOCATION_EVENT,
  deleteAddress,
  listAddresses,
  matchState,
  normalizeLocation,
  readLocation,
  selectAddress,
  upsertAddress,
} from '../../utils/locationStorage'

const MOBILE_MQ = '(max-width: 749px)'

const emptyManual = () => ({
  id: null,
  tag: 'Home',
  name: '',
  phone: '',
  line1: '',
  area: '',
  city: '',
  state: 'Uttarakhand',
  pin: '',
})

const placeTitle = (label = '') => label.split(',')[0].trim() || label

const placeSubtitle = (item) => {
  const parts = []
  if (item.area && item.area !== item.city) parts.push(item.area)
  if (item.city) parts.push(item.city)
  if (item.state) parts.push(item.state)
  if (item.pin) parts.push(item.pin)
  if (parts.length) return parts.join(' · ')
  if (item.fullAddress) return item.fullAddress
  if (item.label?.includes(',')) {
    return item.label.split(',').slice(1).join(',').trim()
  }
  return ''
}

const clearPanelTop = (el) => {
  if (!el) return
  el.style.top = ''
  el.style.maxHeight = ''
}

const PincodeBox = () => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState(readLocation)
  const [addresses, setAddresses] = useState(listAddresses)
  const [geoState, setGeoState] = useState('idle')
  const [geoError, setGeoError] = useState('')
  const [remoteResults, setRemoteResults] = useState([])
  const [searchState, setSearchState] = useState('idle')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState(emptyManual)
  const [manualError, setManualError] = useState('')
  const boxRef = useRef(null)
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const searchAbort = useRef(null)

  const closePanel = () => {
    setOpen(false)
    setQuery('')
    setGeoState('idle')
    setGeoError('')
    setRemoteResults([])
    setSearchState('idle')
    setManualMode(false)
    setManualError('')
    searchAbort.current?.abort()
  }

  const refreshAddresses = () => setAddresses(listAddresses())

  const commitSelect = (raw) => {
    const next = selectAddress(raw)
    setLocation(next)
    refreshAddresses()
    closePanel()
  }

  const commitSave = (raw) => {
    const next = upsertAddress(raw, { select: true })
    setLocation(next)
    refreshAddresses()
    closePanel()
  }

  useEffect(() => {
    const syncLoc = (e) => setLocation(e.detail || readLocation())
    const syncAddr = (e) => setAddresses(e.detail || listAddresses())
    window.addEventListener(LOCATION_EVENT, syncLoc)
    window.addEventListener(ADDRESSES_EVENT, syncAddr)
    return () => {
      window.removeEventListener(LOCATION_EVENT, syncLoc)
      window.removeEventListener(ADDRESSES_EVENT, syncAddr)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      clearPanelTop(panelRef.current)
      return undefined
    }

    const placePanel = () => {
      const box = boxRef.current
      const panel = panelRef.current
      if (!box || !panel) return

      if (!window.matchMedia(MOBILE_MQ).matches) {
        clearPanelTop(panel)
        return
      }

      const rect = box.getBoundingClientRect()
      const pad = 10
      const top = Math.round(rect.bottom + 8)
      const maxHeight = Math.max(200, Math.round(window.innerHeight - top - pad))

      panel.style.top = `${top}px`
      panel.style.maxHeight = `${maxHeight}px`
    }

    placePanel()
    window.addEventListener('resize', placePanel)
    window.addEventListener('scroll', placePanel, true)
    return () => {
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('scroll', placePanel, true)
      clearPanelTop(panelRef.current)
    }
  }, [open, manualMode, addresses.length])

  useEffect(() => {
    if (!open) return undefined

    const onDocClick = (e) => {
      if (!boxRef.current?.contains(e.target)) closePanel()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel()
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick, { passive: true })
    document.addEventListener('keydown', onKey)
    window.setTimeout(() => {
      if (!manualMode) inputRef.current?.focus()
    }, 60)

    const prev = document.body.style.overflow
    const mobile = window.matchMedia(MOBILE_MQ).matches
    if (mobile) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('pincode-sheet-open')
    }

    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      document.body.classList.remove('pincode-sheet-open')
    }
  }, [open, manualMode])

  useEffect(() => {
    if (!open || manualMode) return undefined
    const q = query.trim()
    if (q.length < 2) {
      setRemoteResults([])
      setSearchState('idle')
      return undefined
    }

    setSearchState('loading')
    searchAbort.current?.abort()
    const controller = new AbortController()
    searchAbort.current = controller

    const timer = window.setTimeout(async () => {
      try {
        const hits = await searchPlaces(q, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setRemoteResults(hits)
          setSearchState('idle')
        }
      } catch {
        if (!controller.signal.aborted) {
          setRemoteResults([])
          setSearchState('error')
        }
      }
    }, 320)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, open, manualMode])

  const showSearchResults = query.trim().length >= 2
  const listItems = showSearchResults ? remoteResults : []

  const openManual = (seed = {}) => {
    setManual({
      ...emptyManual(),
      id: seed.id || null,
      tag: seed.tag || 'Home',
      name: seed.name || '',
      phone: seed.phone || '',
      line1: seed.line1 || '',
      area: seed.area || '',
      city: seed.city || '',
      state: matchState(seed.state) || 'Uttarakhand',
      pin: seed.pin || '',
    })
    setManualError('')
    setManualMode(true)
  }

  const selectPlace = (item) => {
    openManual({
      ...normalizeLocation(item),
      id: null,
      tag: 'Home',
    })
  }

  const onSearchSubmit = (e) => {
    e.preventDefault()
    if (listItems[0]) {
      selectPlace(listItems[0])
      return
    }
    const q = query.trim()
    if (!q) return
    openManual({
      line1: /^\d{6}$/.test(q) ? '' : q,
      pin: /^\d{6}$/.test(q) ? q : '',
    })
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('error')
      setGeoError('Location is not supported on this device.')
      return
    }

    setGeoState('loading')
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const place = await reverseGeocode(latitude, longitude)
          const book = listAddresses()
          const existingGps = book.find((a) => a.source === 'gps')
          const hasHome = book.some((a) => a.tag === 'Home' && a.source !== 'gps')

          commitSave({
            ...place,
            id: existingGps?.id || null,
            tag: existingGps?.tag || (hasHome ? 'Other' : 'Home'),
            name: existingGps?.name || '',
            phone: existingGps?.phone || '',
            state: matchState(place.state) || existingGps?.state || '',
            source: 'gps',
          })
        } catch {
          setGeoState('error')
          setGeoError('Could not fetch address for your location.')
        } finally {
          setGeoState('idle')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoState('denied')
          setGeoError('Location permission denied. Search or add address manually.')
        } else {
          setGeoState('error')
          setGeoError('Could not fetch location. Try searching instead.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  const saveManual = (e) => {
    e.preventDefault()
    const line1 = manual.line1.trim()
    const city = manual.city.trim()
    const pin = manual.pin.replace(/\D/g, '').slice(0, 6)
    const phone = manual.phone.replace(/\D/g, '').slice(0, 10)

    if (line1.length < 4) {
      setManualError('Enter house / street / area (min 4 characters)')
      return
    }
    if (!city) {
      setManualError('City is required')
      return
    }
    if (pin && !/^\d{6}$/.test(pin)) {
      setManualError('Enter a valid 6-digit pincode')
      return
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setManualError('Enter a valid 10-digit mobile')
      return
    }

    commitSave({
      id: manual.id,
      tag: manual.tag,
      name: manual.name.trim(),
      phone,
      line1,
      area: manual.area.trim(),
      city,
      state: manual.state,
      pin,
      source: manual.id ? 'edit' : 'manual',
    })
  }

  const onEditAddress = (addr, e) => {
    e.stopPropagation()
    openManual(addr)
  }

  const onDeleteAddress = (addr, e) => {
    e.stopPropagation()
    if (!window.confirm(`Remove ${addr.tag || 'this'} address?`)) return
    deleteAddress(addr.id)
    refreshAddresses()
    setLocation(readLocation())
  }

  const displayLabel =
    location?.label ||
    location?.fullAddress ||
    (location?.pin ? `Pincode ${location.pin}` : 'Select location')

  const editing = Boolean(manual.id)

  return (
    <div className={`pincode-box${open ? ' is-open' : ''}`} ref={boxRef}>
      <button
        type="button"
        className="pincode-trigger"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MapPinIcon size={18} className="pincode-trigger-icon" />
        <span className="pincode-trigger-text">
          <span className="pincode-label">
            <span className="pincode-label__full">Delivery in 2-3 days</span>
            <span className="pincode-label__short">Delivery</span>
          </span>
          <span className="pincode-value-row">
            <span className="pincode-value">{displayLabel}</span>
            <DropdownIcon
              size={16}
              className={`pincode-trigger-chevron${open ? ' pincode-trigger-chevron--open' : ''}`}
            />
          </span>
        </span>
      </button>

      {open && (
        <div
          className="pincode-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Select delivery address"
        >
          <header className="pincode-panel__head">
            <h2>
              {manualMode
                ? editing
                  ? 'Edit address'
                  : 'Add new address'
                : 'Select delivery address'}
            </h2>
            <button
              type="button"
              className="pincode-panel__close"
              aria-label="Close"
              onClick={closePanel}
            >
              <CloseIcon size={16} />
            </button>
          </header>

          <div className="pincode-panel__body">
            {manualMode ? (
              <form className="pincode-manual" onSubmit={saveManual}>
                <div className="pincode-manual__top">
                  <button
                    type="button"
                    className="pincode-manual__back"
                    onClick={() => setManualMode(false)}
                  >
                    ← Back
                  </button>
                  <div
                    className="pincode-manual__tags"
                    role="group"
                    aria-label="Address type"
                  >
                    {ADDRESS_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`pincode-manual__tag${manual.tag === tag ? ' is-active' : ''}`}
                        onClick={() => setManual((p) => ({ ...p, tag }))}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pincode-manual__grid">
                  <label className="pincode-manual__field pincode-manual__field--full">
                    <span>Complete address</span>
                    <input
                      value={manual.line1}
                      onChange={(e) =>
                        setManual((p) => ({ ...p, line1: e.target.value }))
                      }
                      placeholder="House no., street, area"
                      autoFocus
                    />
                  </label>

                  <label className="pincode-manual__field pincode-manual__field--full">
                    <span>Landmark</span>
                    <input
                      value={manual.area}
                      onChange={(e) =>
                        setManual((p) => ({ ...p, area: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </label>

                  <label className="pincode-manual__field">
                    <span>City</span>
                    <input
                      value={manual.city}
                      onChange={(e) =>
                        setManual((p) => ({ ...p, city: e.target.value }))
                      }
                      placeholder="City"
                    />
                  </label>

                  <label className="pincode-manual__field">
                    <span>Pincode</span>
                    <input
                      value={manual.pin}
                      onChange={(e) =>
                        setManual((p) => ({
                          ...p,
                          pin: e.target.value.replace(/\D/g, '').slice(0, 6),
                        }))
                      }
                      inputMode="numeric"
                      placeholder="6 digit"
                    />
                  </label>

                  <label className="pincode-manual__field pincode-manual__field--full">
                    <span>State</span>
                    <select
                      value={manual.state}
                      onChange={(e) =>
                        setManual((p) => ({ ...p, state: e.target.value }))
                      }
                    >
                      {INDIA_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="pincode-manual__field">
                    <span>Name</span>
                    <input
                      value={manual.name}
                      onChange={(e) =>
                        setManual((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </label>

                  <label className="pincode-manual__field">
                    <span>Phone</span>
                    <input
                      value={manual.phone}
                      onChange={(e) =>
                        setManual((p) => ({
                          ...p,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        }))
                      }
                      inputMode="tel"
                      placeholder="Optional"
                    />
                  </label>
                </div>

                {manualError && (
                  <p className="pincode-manual__error">{manualError}</p>
                )}

                <button type="submit" className="pincode-manual__save">
                  {editing ? 'Update address' : 'Save & deliver here'}
                </button>
              </form>
            ) : (
              <>
                <form className="pincode-search" onSubmit={onSearchSubmit}>
                  <SearchIcon size={16} className="pincode-search__icon" />
                  <input
                    ref={inputRef}
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for area, street or pincode"
                    aria-label="Search for area, street or pincode"
                    autoComplete="off"
                  />
                  {query.trim() && (
                    <button
                      type="button"
                      className="pincode-search__clear"
                      aria-label="Clear search"
                      onClick={() => setQuery('')}
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </form>

                <button
                  type="button"
                  className="pincode-gps"
                  onClick={useCurrentLocation}
                  disabled={geoState === 'loading'}
                >
                  <span className="pincode-gps__icon" aria-hidden="true">
                    <LocateIcon size={18} />
                  </span>
                  <span className="pincode-gps__text">
                    <strong>
                      {geoState === 'loading'
                        ? 'Fetching complete address…'
                        : 'Use current location'}
                    </strong>
                    <span>Auto-detect and save delivery address</span>
                  </span>
                  <ChevronRightIcon size={16} className="pincode-gps__chevron" />
                </button>

                {geoError && <p className="pincode-gps__error">{geoError}</p>}

                <button
                  type="button"
                  className="pincode-manual-link"
                  onClick={() => openManual()}
                >
                  + Add new address
                </button>

                {addresses.length > 0 && !showSearchResults && (
                  <section className="pincode-section">
                    <p className="pincode-section__label">Saved addresses</p>
                    <ul className="pincode-results pincode-saved" role="listbox">
                      {addresses.map((addr) => {
                        const active = location?.id === addr.id
                        return (
                          <li key={addr.id}>
                            <div
                              className={`pincode-saved__card${active ? ' is-active' : ''}`}
                            >
                              <div className="pincode-saved__row">
                                <button
                                  type="button"
                                  className="pincode-saved__select"
                                  onClick={() => commitSelect(addr)}
                                >
                                  <MapPinIcon size={16} />
                                  <span className="pincode-saved__title">
                                    <em className="pincode-saved__tag">{addr.tag}</em>
                                    <span className="pincode-saved__line">
                                      {addr.line1 || placeTitle(addr.label)}
                                    </span>
                                  </span>
                                </button>
                                <div className="pincode-saved__actions">
                                  <button
                                    type="button"
                                    onClick={(e) => onEditAddress(addr, e)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="is-danger"
                                    onClick={(e) => onDeleteAddress(addr, e)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="pincode-saved__meta"
                                onClick={() => commitSelect(addr)}
                              >
                                {[addr.area, addr.city, addr.state, addr.pin]
                                  .filter(Boolean)
                                  .join(', ') || placeSubtitle(addr)}
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {showSearchResults && (
                  <section className="pincode-section">
                    <p className="pincode-section__label">
                      {searchState === 'loading'
                        ? 'Searching…'
                        : listItems.length
                          ? 'Search results'
                          : 'No results found'}
                    </p>

                    {listItems.length > 0 ? (
                      <ul className="pincode-results" role="listbox">
                        {listItems.map((item, index) => (
                          <li key={`${item.pin || 'x'}-${item.label}-${index}`}>
                            <button
                              type="button"
                              className="pincode-results__item"
                              onClick={() => selectPlace(item)}
                            >
                              <MapPinIcon size={16} />
                              <span>
                                <strong>{placeTitle(item.label)}</strong>
                                <em>
                                  {placeSubtitle(item) || item.fullAddress}
                                </em>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      searchState !== 'loading' && (
                        <p className="pincode-empty">
                          No match.{' '}
                          <button
                            type="button"
                            className="pincode-empty__link"
                            onClick={() =>
                              openManual({
                                line1: query.trim(),
                                pin: /^\d{6}$/.test(query.trim())
                                  ? query.trim()
                                  : '',
                              })
                            }
                          >
                            Add address manually
                          </button>
                        </p>
                      )
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PincodeBox
