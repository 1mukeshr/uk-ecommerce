import { STORAGE } from '../config'

export const DEFAULT_THEME = {
  primary: '#E62978',
  secondary: '#0A4F33',
}

const WHITE = { r: 255, g: 255, b: 255 }
const BLACK = { r: 0, g: 0, b: 0 }

export function normalizeHex(value = '') {
  let hex = String(value).trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(hex)) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (!/^[0-9a-f]{6}$/.test(hex)) return null
  return `#${hex.toUpperCase()}`
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const n = parseInt(normalized.slice(1), 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`
}

function mix(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function lighten(hex, amount = 0.16) {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(mix(rgb, WHITE, amount)) : hex
}

function darken(hex, amount = 0.16) {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(mix(rgb, BLACK, amount)) : hex
}

function softBg(hex, amount = 0.9) {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(mix(rgb, WHITE, amount)) : '#ffffff'
}

function glow(hex, alpha = 0.2) {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function buildThemeVars(theme = DEFAULT_THEME) {
  const primary = normalizeHex(theme.primary) || DEFAULT_THEME.primary
  const secondary = normalizeHex(theme.secondary) || DEFAULT_THEME.secondary

  return {
    '--primary': primary,
    '--primary-light': lighten(primary, 0.18),
    '--primary-dark': darken(primary, 0.16),
    '--primary-glow': glow(primary, 0.2),
    '--border-focus': primary,
    '--secondary': secondary,
    '--secondary-light': lighten(secondary, 0.18),
    '--secondary-dark': darken(secondary, 0.16),
    '--secondary-glow': glow(secondary, 0.16),
    '--secondary-soft': softBg(secondary, 0.9),
    '--success': secondary,
    '--success-bg': softBg(secondary, 0.9),
  }
}

export function applyTheme(theme = DEFAULT_THEME) {
  const next = {
    primary: normalizeHex(theme.primary) || DEFAULT_THEME.primary,
    secondary: normalizeHex(theme.secondary) || DEFAULT_THEME.secondary,
  }
  const root = document.documentElement
  const vars = buildThemeVars(next)
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) metaTheme.setAttribute('content', next.primary)

  return next
}

export function readStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE.THEME)
    if (!raw) return { ...DEFAULT_THEME }
    const parsed = JSON.parse(raw)
    return {
      primary: normalizeHex(parsed?.primary) || DEFAULT_THEME.primary,
      secondary: normalizeHex(parsed?.secondary) || DEFAULT_THEME.secondary,
    }
  } catch {
    return { ...DEFAULT_THEME }
  }
}

export function saveTheme(theme) {
  const next = applyTheme(theme)
  try {
    localStorage.setItem(STORAGE.THEME, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}

export function resetTheme() {
  try {
    localStorage.removeItem(STORAGE.THEME)
  } catch {
    /* ignore */
  }
  return applyTheme(DEFAULT_THEME)
}

/** Apply saved theme before first paint (call from main.jsx). */
export function bootstrapTheme() {
  return applyTheme(readStoredTheme())
}
