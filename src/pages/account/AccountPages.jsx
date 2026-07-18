import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumb from '../../components/layout/Breadcrumb'
import Footer from '../../components/layout/Footer'
import {
  ArrowRightIcon,
  CloseIcon,
  LogOutIcon,
  MailIcon,
  PackageIcon,
  TruckIcon,
  UserIcon,
} from '../../components/icons'
import { ROUTES } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { getOrdersForUser } from '../../utils/ordersStorage'

const initialsFrom = (name, email) => {
  const source = (name || email || 'P').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const formatDateTime = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '-'
  }
}

const paymentLabel = (id) => {
  if (id === 'upi') return 'UPI'
  if (id === 'card') return 'Card'
  return 'Cash on delivery'
}

const statusClass = (status) => {
  const key = String(status || 'placed').toLowerCase()
  if (key.includes('deliver')) return 'is-delivered'
  if (key.includes('ship')) return 'is-shipped'
  if (key.includes('cancel')) return 'is-cancelled'
  return 'is-placed'
}

export const AccountPage = () => {
  const { user, logout } = useAuth()
  const initials = initialsFrom(user?.name, user?.email)

  return (
    <>
      <main className="account-page">
        <div className="breadcrumb-bar">
          <div className="container">
            <Breadcrumb items={[{ label: 'My account' }]} />
          </div>
        </div>

        <section className="account-shell">
          <div className="container account-shell__inner">
            <div className="account-card">
              <div className="account-card__hero">
                <span className="account-card__avatar" aria-hidden="true">
                  {initials}
                </span>
                <p className="account-card__kicker">Welcome back</p>
                <h1>{user?.name || 'My account'}</h1>
                <p className="account-card__lead">
                  Your PahadLink profile and shopping details in one place.
                </p>
              </div>

              <ul className="account-card__list">
                <li>
                  <span className="account-card__label">
                    <UserIcon size={14} />
                    Name
                  </span>
                  <strong>{user?.name || '-'}</strong>
                </li>
                <li>
                  <span className="account-card__label">
                    <MailIcon size={14} />
                    Email
                  </span>
                  <strong>{user?.email || '-'}</strong>
                </li>
                <li>
                  <span className="account-card__label">
                    <UserIcon size={14} />
                    Username
                  </span>
                  <strong>{user?.username || '-'}</strong>
                </li>
              </ul>

              <div className="account-card__quick">
                <Link to={ROUTES.ORDERS} className="account-card__quick-link">
                  <PackageIcon size={16} />
                  <span>
                    <strong>My orders</strong>
                    <em>Track deliveries</em>
                  </span>
                </Link>
                <Link to={ROUTES.SHOP} className="account-card__quick-link">
                  <TruckIcon size={16} />
                  <span>
                    <strong>Shop</strong>
                    <em>Browse products</em>
                  </span>
                </Link>
              </div>

              <div className="account-card__actions">
                <Link to={ROUTES.ORDERS} className="btn-hero-primary">
                  View my orders
                </Link>
                <button
                  type="button"
                  className="account-card__logout"
                  onClick={logout}
                >
                  <LogOutIcon size={15} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export const OrdersPage = () => {
  const { user } = useAuth()
  const [activeOrderId, setActiveOrderId] = useState(null)
  const orders = useMemo(() => getOrdersForUser(user), [user])

  const activeOrder = useMemo(
    () => orders.find((order) => order.id === activeOrderId) || null,
    [orders, activeOrderId]
  )

  useEffect(() => {
    if (!activeOrder) return undefined

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') setActiveOrderId(null)
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [activeOrder])

  const activeItems = activeOrder?.items || []
  const activeItemCount = activeItems.reduce(
    (sum, item) => sum + (item.qty || 1),
    0
  )

  const openOrderPopup = (orderId) => {
    setActiveOrderId(orderId)
  }

  const closeOrderPopup = () => setActiveOrderId(null)

  return (
    <>
      <main className="account-page orders-page">
        <div className="breadcrumb-bar">
          <div className="container">
            <Breadcrumb
              items={[
                { label: 'My account', to: ROUTES.ACCOUNT },
                { label: 'My orders' },
              ]}
            />
          </div>
        </div>

        <section className="orders-shell" aria-labelledby="orders-title">
          <div className="container orders-shell__inner">
            <header className="orders-head">
              <div className="orders-head__copy">
                <h1 id="orders-title">My orders</h1>
                <p>
                  {orders.length === 0
                    ? 'Track deliveries and revisit past hill finds here.'
                    : `${orders.length} order${orders.length === 1 ? '' : 's'} · ships in 24–48 hrs`}
                </p>
              </div>
              <Link to={ROUTES.SHOP} className="orders-head__shop">
                Continue shopping
                <ArrowRightIcon size={15} />
              </Link>
            </header>

            {orders.length === 0 ? (
              <div className="orders-empty">
                <span className="orders-empty__icon" aria-hidden="true">
                  <PackageIcon size={26} />
                </span>
                <h2>No orders yet</h2>
                <p>
                  When you place an order, it will show up here with status,
                  items, and delivery details.
                </p>
                <div className="orders-empty__actions">
                  <Link to={ROUTES.SHOP} className="btn-hero-primary">
                    Start shopping
                  </Link>
                  <Link to={ROUTES.ACCOUNT} className="orders-empty__ghost">
                    Back to account
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="orders-list">
                {orders.map((order) => {
                  const items = order.items || []
                  const preview = items.slice(0, 3)
                  const extra = Math.max(0, items.length - preview.length)
                  const itemCount = items.reduce(
                    (sum, item) => sum + (item.qty || 1),
                    0
                  )

                  return (
                    <li key={order.id} className="order-card">
                      <div className="order-card__main">
                        <div className="order-card__thumbs" aria-hidden="true">
                          {preview.map((item, idx) =>
                            item.image ? (
                              <img
                                key={`${order.id}-thumb-${item.id || idx}`}
                                src={item.image}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                style={{ zIndex: preview.length - idx }}
                              />
                            ) : (
                              <span
                                key={`${order.id}-thumb-${idx}`}
                                className="order-card__thumb-fallback"
                                style={{ zIndex: preview.length - idx }}
                              >
                                <PackageIcon size={14} />
                              </span>
                            )
                          )}
                          {extra > 0 && (
                            <span className="order-card__thumb-more">
                              +{extra}
                            </span>
                          )}
                        </div>

                        <div className="order-card__info">
                          <div className="order-card__top">
                            <div>
                              <span className="order-card__id">{order.id}</span>
                              <p className="order-card__date">
                                {formatDateTime(order.createdAt)}
                                {order.city
                                  ? ` · ${order.city}${
                                      order.state ? `, ${order.state}` : ''
                                    }`
                                  : ''}
                              </p>
                            </div>
                            <span
                              className={`order-card__status ${statusClass(
                                order.status
                              )}`}
                            >
                              {order.status || 'Placed'}
                            </span>
                          </div>

                          <ul className="order-card__names">
                            {preview.map((item, idx) => (
                              <li key={`${order.id}-name-${item.id || idx}`}>
                                {item.name}
                                {item.size ? ` · ${item.size}` : ''}
                                {(item.qty || 1) > 1
                                  ? ` ×${item.qty}`
                                  : ''}
                              </li>
                            ))}
                            {extra > 0 && (
                              <li>
                                <button
                                  type="button"
                                  className="order-card__names-more"
                                  onClick={() => openOrderPopup(order.id)}
                                >
                                  +{extra} more item
                                  {extra === 1 ? '' : 's'}
                                </button>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="order-card__foot">
                        <span>
                          {itemCount} item{itemCount === 1 ? '' : 's'}
                        </span>
                        <span>{paymentLabel(order.payment)}</span>
                        <strong>{formatPrice(order.total)}</strong>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </main>

      {activeOrder && (
        <div
          className="orders-detail-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="orders-detail-title"
        >
          <button
            type="button"
            className="orders-detail-popup__backdrop"
            aria-label="Close order details"
            onClick={closeOrderPopup}
          />
          <div className="orders-detail-popup__panel">
            <header className="orders-detail-popup__head">
              <div>
                <p className="orders-detail-popup__eyebrow">Order details</p>
                <h2 id="orders-detail-title">{activeOrder.id}</h2>
                <p className="orders-detail-popup__date">
                  {formatDateTime(activeOrder.createdAt)}
                </p>
              </div>
              <div className="orders-detail-popup__head-actions">
                <span
                  className={`order-card__status ${statusClass(
                    activeOrder.status
                  )}`}
                >
                  {activeOrder.status || 'Placed'}
                </span>
                <button
                  type="button"
                  className="orders-detail-popup__close"
                  aria-label="Close"
                  onClick={closeOrderPopup}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </header>

            <ul className="orders-detail-popup__items">
              {activeItems.map((item, idx) => (
                <li key={`${activeOrder.id}-popup-${item.id || idx}`}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="orders-detail-popup__fallback">
                      <PackageIcon size={16} />
                    </span>
                  )}
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.size ? `${item.size} · ` : ''}
                      Qty {item.qty || 1}
                    </span>
                  </div>
                  <em>{formatPrice(item.price * (item.qty || 1))}</em>
                </li>
              ))}
            </ul>

            <div className="orders-detail-popup__meta">
              <div>
                <span>Items</span>
                <strong>
                  {activeItemCount} item{activeItemCount === 1 ? '' : 's'}
                </strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{paymentLabel(activeOrder.payment)}</strong>
              </div>
              <div>
                <span>Ship to</span>
                <strong>
                  {activeOrder.city || '-'}
                  {activeOrder.state ? `, ${activeOrder.state}` : ''}
                </strong>
              </div>
              <div className="orders-detail-popup__total">
                <span>Total</span>
                <strong>{formatPrice(activeOrder.total)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
