import jwt from 'jsonwebtoken'
import { ROLES } from '../models/User.js'
import { users } from '../services/users.js'

const JWT_SECRET = process.env.JWT_SECRET || 'pahadlink-dev-secret-change-me'

export function signToken(user) {
  const id = user._id?.toString?.() || user.id
  return jwt.sign(
    { id, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await users.findById(decoded.id)

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive account' })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

/** Attach user when a valid token is present; otherwise continue as guest */
export async function optionalProtect(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      req.user = null
      return next()
    }
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await users.findById(decoded.id)
    req.user = user && user.isActive ? user : null
  } catch {
    req.user = null
  }
  return next()
}

export function authorize(...allowedRoles) {
  const roles = allowedRoles.length ? allowedRoles : ROLES
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for this role' })
    }
    next()
  }
}

export { JWT_SECRET }
