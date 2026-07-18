import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../config'
import PageLoader from '../layout/PageLoader'

/** Redirect guests to login; optionally require specific roles */
const ProtectedRoute = ({ children, roles, intent }) => {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader label="Checking your account" />
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`
    const resolvedIntent =
      intent ||
      (location.pathname.startsWith('/checkout') ? 'checkout' : 'auth')

    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{ from, intent: resolvedIntent }}
      />
    )
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return children
}

export default ProtectedRoute
