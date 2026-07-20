const STORAGE_KEY = 'pahadlink_orders'

export const readOrders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export const saveOrder = (order) => {
  const list = readOrders()
  const next = [order, ...list.filter((item) => item.id !== order.id)].slice(
    0,
    40
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

/** Replace this user's cached orders with a fresh API snapshot */
export const syncOrdersForUser = (userOrEmail, apiOrders = []) => {
  const email =
    typeof userOrEmail === 'string'
      ? userOrEmail.trim().toLowerCase()
      : String(userOrEmail?.email || '')
          .trim()
          .toLowerCase()
  const userId =
    typeof userOrEmail === 'object' && userOrEmail
      ? userOrEmail.id || userOrEmail._id || null
      : null

  const others = readOrders().filter((order) => {
    const orderEmails = [order.userEmail, order.email]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
    const orderUserId = order.userId || null
    if (userId && orderUserId && String(orderUserId) === String(userId)) {
      return false
    }
    if (email && orderEmails.includes(email)) return false
    return true
  })

  const merged = [...(Array.isArray(apiOrders) ? apiOrders : []), ...others].slice(
    0,
    80
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return Array.isArray(apiOrders) ? apiOrders : []
}

/**
 * Return only orders belonging to the signed-in user (email / user id).
 * Never returns other customers' orders; empty if not identified.
 */
export const getOrdersForUser = (userOrEmail) => {
  const list = readOrders()
  const email =
    typeof userOrEmail === 'string'
      ? userOrEmail.trim().toLowerCase()
      : String(userOrEmail?.email || '')
          .trim()
          .toLowerCase()
  const userId =
    typeof userOrEmail === 'object' && userOrEmail
      ? userOrEmail.id || userOrEmail._id || null
      : null

  if (!email && !userId) return []

  return list
    .filter((order) => {
      const orderEmails = [order.userEmail, order.email]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
      const orderUserId = order.userId || null

      if (userId && orderUserId && String(orderUserId) === String(userId)) {
        return true
      }
      if (email && orderEmails.includes(email)) return true
      return false
    })
    .sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return tb - ta
    })
}
