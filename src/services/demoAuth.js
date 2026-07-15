/**
 * Browser/localStorage auth for static hosts (GitHub Pages).
 * Used when the Express API is not available.
 */
import { ROLES, STORAGE } from '../config'

const USERS_KEY = 'pahadlink_demo_users'

const readUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const writeUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const toSafeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role || ROLES.CUSTOMER,
  isActive: user.isActive !== false,
})

const makeToken = (userId) =>
  `demo.${btoa(unescape(encodeURIComponent(String(userId))))}.${Date.now()}`

const authResponse = (user) => ({
  token: makeToken(user.id),
  user: toSafeUser(user),
})

async function hashPassword(password) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(`pahadlink:${password}`)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Fallback for rare environments without SubtleCrypto
  return `plain:${password}`
}

function ensureSeedUsers(users) {
  if (users.some((u) => u.username === 'demo')) return users
  return [
    ...users,
    {
      id: 'demo-user',
      name: 'Demo Shopper',
      email: 'demo@pahadlink.com',
      username: 'demo',
      // password: demo123 (hashed on first register path; store sync seed hash for demo123)
      passwordHash: null,
      role: ROLES.CUSTOMER,
      isActive: true,
      seedPassword: 'demo123',
    },
  ]
}

async function matchPassword(user, password) {
  if (user.seedPassword && user.seedPassword === password) return true
  if (!user.passwordHash) return false
  const hash = await hashPassword(password)
  return hash === user.passwordHash
}

export function isStaticDemoHost() {
  if (import.meta.env.VITE_DEMO_AUTH === 'true') return true
  if (typeof window === 'undefined') return false
  return /\.github\.io$/i.test(window.location.hostname)
}

export async function demoRegister(payload) {
  const name = String(payload.name || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const username = String(payload.username || '').trim().toLowerCase()
  const password = String(payload.password || '')

  if (!name || !email || !username || !password) {
    throw new Error('Name, email, username and password are required')
  }
  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters')
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  let users = ensureSeedUsers(readUsers())
  if (users.some((u) => u.email === email || u.username === username)) {
    throw new Error('Email or username already registered')
  }

  const user = {
    id: `u_${Date.now()}`,
    name,
    email,
    username,
    passwordHash: await hashPassword(password),
    role: ROLES.CUSTOMER,
    isActive: true,
  }

  users = [...users, user]
  writeUsers(users)
  return authResponse(user)
}

export async function demoLogin(payload) {
  const username = String(payload.username || '').trim().toLowerCase()
  const password = String(payload.password || '')

  if (!username || !password) {
    throw new Error('Username and password are required')
  }

  const users = ensureSeedUsers(readUsers())
  writeUsers(users)

  const user = users.find((u) => u.username === username || u.email === username)
  if (!user || !(await matchPassword(user, password))) {
    throw new Error('Invalid username or password')
  }
  if (user.isActive === false) {
    throw new Error('Account is deactivated')
  }

  return authResponse(user)
}

export async function demoFetchMe() {
  const token = localStorage.getItem(STORAGE.TOKEN)
  if (!token || !token.startsWith('demo.')) {
    throw new Error('Not authenticated')
  }

  let userId = ''
  try {
    userId = decodeURIComponent(escape(atob(token.split('.')[1])))
  } catch {
    throw new Error('Not authenticated')
  }

  const users = ensureSeedUsers(readUsers())
  const user = users.find((u) => String(u.id) === String(userId))
  if (!user) throw new Error('Not authenticated')
  return toSafeUser(user)
}

export async function demoForgotPassword(email) {
  if (!String(email || '').trim()) {
    throw new Error('Email is required')
  }
  return {
    message:
      'If an account exists with that email, reset instructions have been sent. (Demo: use Register to create a new account in this browser.)',
  }
}

export async function demoResetPassword() {
  throw new Error('Password reset links are not available in the GitHub Pages demo. Please register again.')
}

export async function demoGoogleLogin() {
  let users = ensureSeedUsers(readUsers())
  let user = users.find((u) => u.username === 'google.demo')
  if (!user) {
    user = {
      id: 'google-demo',
      name: 'Google Demo',
      email: 'google.demo@pahadlink.com',
      username: 'google.demo',
      passwordHash: await hashPassword(`google-${Date.now()}`),
      role: ROLES.CUSTOMER,
      isActive: true,
    }
    users = [...users, user]
    writeUsers(users)
  }
  return {
    ...authResponse(user),
    message: 'Signed in with demo Google account',
  }
}
