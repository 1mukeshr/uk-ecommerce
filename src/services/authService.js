import api from './api'
import {
  isStaticDemoHost,
  demoRegister,
  demoLogin,
  demoFetchMe,
  demoForgotPassword,
  demoResetPassword,
  demoGoogleLogin,
} from './demoAuth'

export const ROLES = {
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
}

export async function registerUser(payload) {
  if (isStaticDemoHost()) return demoRegister(payload)
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function loginUser(payload) {
  if (isStaticDemoHost()) return demoLogin(payload)
  const { data } = await api.post('/auth/login', payload)
  return data
}

export async function fetchMe() {
  if (isStaticDemoHost()) return demoFetchMe()
  const { data } = await api.get('/auth/me')
  return data.user
}

export async function forgotPassword(email) {
  if (isStaticDemoHost()) return demoForgotPassword(email)
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token, password) {
  if (isStaticDemoHost()) return demoResetPassword(token, password)
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}

export async function googleLogin(credential) {
  if (isStaticDemoHost()) return demoGoogleLogin(credential)
  const { data } = await api.post('/auth/google', { credential })
  return data
}

export async function sendOtp(phone) {
  if (isStaticDemoHost()) {
    throw new Error('OTP login is not available on the GitHub Pages demo.')
  }
  const { data } = await api.post('/auth/otp/send', { phone })
  return data
}

export async function verifyOtp(phone, otp) {
  if (isStaticDemoHost()) {
    throw new Error('OTP login is not available on the GitHub Pages demo.')
  }
  const { data } = await api.post('/auth/otp/verify', { phone, otp })
  return data
}

export async function listUsers() {
  if (isStaticDemoHost()) {
    throw new Error('Admin user list is not available on the GitHub Pages demo.')
  }
  const { data } = await api.get('/auth/users')
  return data.users
}

export async function updateUserRole(userId, role) {
  if (isStaticDemoHost()) {
    throw new Error('Role updates are not available on the GitHub Pages demo.')
  }
  const { data } = await api.patch(`/auth/users/${userId}/role`, { role })
  return data
}
