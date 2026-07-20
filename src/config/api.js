import { setRuntimeFirebaseConfig } from '../lib/firebase'

/**
 * Resolve API base URL + optional Firebase web config for browser calls.
 * Priority:
 * - Vite DEV / localhost / LAN IP → /api (Vite proxy)
 * - runtime-config.json (GitHub Pages; can update without rebuild)
 * - VITE_* (build-time)
 *
 * Firebase config is stored on globalThis (not a shared module binding) so
 * Vite/Rolldown minification cannot collide the getter with React internals.
 */
let runtimeApiUrl = ''

/** localhost, loopback, RFC1918 LAN, and *.local */
export function isLocalOrLanHost(hostname = '') {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return false
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
    return true
  }
  if (host.endsWith('.local')) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  return false
}

const useViteApiProxy = () => {
  if (typeof window === 'undefined') return false
  // Always use relative /api during `vite` on this machine or LAN
  if (import.meta.env.DEV) return true
  return isLocalOrLanHost(window.location.hostname)
}

function normalizeApiUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/$/, '')
}

function collectApiCandidates(data) {
  const list = []
  const push = (value) => {
    const url = normalizeApiUrl(value)
    if (url && !list.includes(url)) list.push(url)
  }
  if (Array.isArray(data?.apiUrls)) {
    data.apiUrls.forEach(push)
  }
  push(data?.apiUrl)
  push(import.meta.env.VITE_API_URL)
  return list
}

async function probeApiHealth(apiBase) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${apiBase}/health?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
    })
    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    return Boolean(data?.ok || data?.service)
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

async function pickHealthyApiUrl(candidates) {
  if (!candidates.length) return ''
  for (const url of candidates) {
    // Prefer first reachable host so Pages can fall back when a tunnel dies
    // eslint-disable-next-line no-await-in-loop
    if (await probeApiHealth(url)) return url
  }
  // Keep first configured URL so errors still show a concrete host
  return candidates[0]
}

function pickFirebase(data) {
  if (!data || typeof data !== 'object') return null
  const src = data.firebase && typeof data.firebase === 'object' ? data.firebase : data
  const apiKey = String(src.apiKey || src.VITE_FIREBASE_API_KEY || '').trim()
  const appId = String(src.appId || src.VITE_FIREBASE_APP_ID || '').trim()
  const authDomain = String(
    src.authDomain || src.VITE_FIREBASE_AUTH_DOMAIN || '',
  ).trim()
  const projectId = String(
    src.projectId || src.VITE_FIREBASE_PROJECT_ID || '',
  ).trim()
  if (!apiKey || !appId || !authDomain || !projectId) return null
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: String(
      src.storageBucket || src.VITE_FIREBASE_STORAGE_BUCKET || '',
    ).trim(),
    messagingSenderId: String(
      src.messagingSenderId || src.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    ).trim(),
    appId,
    measurementId: String(
      src.measurementId || src.VITE_FIREBASE_MEASUREMENT_ID || '',
    ).trim(),
  }
}

export async function loadRuntimeConfig() {
  if (typeof window === 'undefined') return
  // Local / LAN Vite always uses the proxy - skip remote runtime URLs
  if (useViteApiProxy()) {
    runtimeApiUrl = ''
    setRuntimeFirebaseConfig(null)
    return
  }
  try {
    const base = import.meta.env.BASE_URL || '/'
    const url = new URL('runtime-config.json', window.location.origin + base).toString()
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const candidates = collectApiCandidates(data)
    runtimeApiUrl = await pickHealthyApiUrl(candidates)
    setRuntimeFirebaseConfig(pickFirebase(data))
  } catch {
    // optional file
  }
}

function detectApiBase() {
  if (useViteApiProxy()) return '/api'

  // Prefer runtime-config so Pages can switch API hosts without a rebuild
  if (runtimeApiUrl) return runtimeApiUrl

  const fromEnv = normalizeApiUrl(import.meta.env.VITE_API_URL)
  if (fromEnv) return fromEnv

  if (typeof window !== 'undefined' && /\.github\.io$/i.test(window.location.hostname)) {
    return ''
  }

  return '/api'
}

export const getApiBaseUrl = () => detectApiBase()

export function getRuntimeFirebaseConfig() {
  if (typeof globalThis === 'undefined') return null
  return globalThis.__PAHADLINK_FIREBASE__ || null
}

export const API_BASE_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL || '/api'
)
