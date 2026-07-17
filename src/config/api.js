/**
 * Resolve API base URL for browser calls.
 * Priority:
 * - localhost → /api (Vite proxy)
 * - runtime-config.json (GitHub Pages; can update without rebuild)
 * - VITE_API_URL (build-time)
 * - /api fallback
 */
let runtimeApiUrl = ''

const isLocalHost = () => {
  if (typeof window === 'undefined') return false
  return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
}

export async function loadRuntimeConfig() {
  if (typeof window === 'undefined') return
  // Local Vite always uses the proxy - skip remote runtime URLs
  if (isLocalHost()) {
    runtimeApiUrl = ''
    return
  }
  try {
    const base = import.meta.env.BASE_URL || '/'
    const url = new URL('runtime-config.json', window.location.origin + base).toString()
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    if (typeof data?.apiUrl === 'string' && data.apiUrl.trim()) {
      runtimeApiUrl = data.apiUrl.trim().replace(/\/$/, '')
    }
  } catch {
    // optional file
  }
}

function detectApiBase() {
  if (isLocalHost()) return '/api'

  // Prefer runtime-config so Pages can switch API hosts without a rebuild
  if (runtimeApiUrl) return runtimeApiUrl

  const fromEnv = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  if (typeof window !== 'undefined' && /\.github\.io$/i.test(window.location.hostname)) {
    return ''
  }

  return '/api'
}

export const getApiBaseUrl = () => detectApiBase()

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '')
