import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { UserIcon, GoogleIcon } from '../../components/icons'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordField from '../../components/auth/PasswordField'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../config'

function resolveReturnPath(from) {
  if (!from) return ROUTES.HOME
  if (typeof from === 'string') return from
  if (typeof from === 'object' && from.pathname) {
    return `${from.pathname}${from.search || ''}${from.hash || ''}`
  }
  return ROUTES.HOME
}

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, setError } = useAuth()
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const from = resolveReturnPath(location.state?.from)
  const isCheckoutIntent =
    location.state?.intent === 'checkout' || from.startsWith(ROUTES.CHECKOUT)

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const goAfterAuth = () => {
    navigate(from, { replace: true })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      await login({ username: form.username, password: form.password })
      goAfterAuth()
    } catch (err) {
      setMessage(err.message)
      setError?.(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogle = async () => {
    setMessage('')
    setSubmitting(true)
    try {
      await loginWithGoogle()
      goAfterAuth()
    } catch (err) {
      setMessage(err.message || 'Google sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        isCheckoutIntent
          ? 'Sign in to complete your order'
          : 'Sign in to continue shopping'
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {isCheckoutIntent && (
          <p className="auth-alert auth-alert--info" role="status">
            Please log in to continue with checkout.
          </p>
        )}
        {message && <p className="auth-alert auth-alert--error">{message}</p>}

        <div className="form-field">
          <div className="input-wrapper">
            <UserIcon className="input-icon" size={18} />
            <input
              type="text"
              placeholder="Username or email"
              id="username"
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={onChange}
              required
            />
            <label htmlFor="username">Username</label>
          </div>
        </div>

        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={form.password}
          onChange={onChange}
        />

        <div className="form-footer">
          <label className="remember-me">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={onChange}
            />
            <span>Remember me</span>
          </label>
          <Link to={ROUTES.FORGOT_PASSWORD} className="forgot-link">
            Forgot password?
          </Link>
        </div>

        <button className="btn-submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <button
          className="btn-google"
          type="button"
          onClick={onGoogle}
          disabled={submitting}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <Link
            to={ROUTES.REGISTER}
            state={{ from, intent: location.state?.intent }}
          >
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login
