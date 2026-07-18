import { Router } from 'express'
import Order, {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  buildOrderNumber,
} from '../models/Order.js'
import { protect, authorize, optionalProtect } from '../middleware/auth.js'
import {
  notifyOrderConfirmed,
  notifyPaymentCompleted,
} from '../services/notifyOrder.js'
import {
  applyCoupon,
  buildOrderTotals,
  normalizeCouponCode,
} from '../services/coupons.js'

const router = Router()

const PAYMENT_METHODS = ['cod', 'upi', 'card']

function fireAndForget(promise) {
  Promise.resolve(promise).catch((err) => {
    console.error('[orders] notification error:', err.message)
  })
}

async function isFirstOrderEmail(email) {
  const clean = String(email || '').trim().toLowerCase()
  if (!clean) return true
  const prior = await Order.countDocuments({ customerEmail: clean })
  return prior === 0
}

/** Admin: list all orders */
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, q } = req.query
    const filter = {}

    if (status && ORDER_STATUSES.includes(status)) {
      filter.status = status
    }

    if (q) {
      const text = String(q).trim()
      filter.$or = [
        { orderNumber: new RegExp(text, 'i') },
        { customerName: new RegExp(text, 'i') },
        { customerEmail: new RegExp(text, 'i') },
        { customerPhone: new RegExp(text, 'i') },
      ]
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json({ orders: orders.map((o) => o.toSafeJSON()) })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load orders' })
  }
})

/** Admin: order stats */
router.get('/stats', protect, authorize('admin'), async (_req, res) => {
  try {
    const [total, pending, confirmed, shipped, delivered, cancelled, revenue] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'confirmed' }),
        Order.countDocuments({ status: 'shipped' }),
        Order.countDocuments({ status: 'delivered' }),
        Order.countDocuments({ status: 'cancelled' }),
        Order.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
      ])

    res.json({
      total,
      pending,
      confirmed,
      shipped,
      delivered,
      cancelled,
      revenue: revenue[0]?.total || 0,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load stats' })
  }
})

/**
 * Create order (guest or logged-in).
 * PahadLink-style emails:
 * 1) Always: customer order confirmation
 * 2) Online (upi/card): treat as paid → admin new paid order + customer payment success
 * 3) COD: stays pending until admin marks paid
 */
router.post('/', optionalProtect, async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      items,
      shippingAddress,
      notes,
      paymentStatus,
      paymentMethod,
      status,
      couponCode,
    } = req.body

    if (!customerName || !customerEmail || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        message: 'customerName, customerEmail and items are required',
      })
    }

    const cleanItems = items.map((item) => ({
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity ?? item.qty) || 1,
      price: Number(item.price) || 0,
    }))

    if (cleanItems.some((i) => !i.name || i.price < 0 || i.quantity < 1)) {
      return res.status(400).json({ message: 'Invalid order items' })
    }

    const itemsTotal = cleanItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    const email = String(customerEmail).trim().toLowerCase()
    const firstOrder = await isFirstOrderEmail(email)
    const requestedCode = normalizeCouponCode(couponCode)

    if (requestedCode) {
      const check = applyCoupon(itemsTotal, requestedCode, {
        isFirstOrder: firstOrder,
      })
      if (!check.ok) {
        return res.status(400).json({ message: check.message })
      }
    }

    const totals = buildOrderTotals(itemsTotal, requestedCode, {
      isFirstOrder: firstOrder,
    })

    const isAdmin = req.user?.role === 'admin'
    const method = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'cod'
    const onlinePaid = method === 'upi' || method === 'card'

    let nextPaymentStatus = 'pending'
    let nextStatus = 'pending'

    if (isAdmin && PAYMENT_STATUSES.includes(paymentStatus)) {
      nextPaymentStatus = paymentStatus
    } else if (onlinePaid) {
      nextPaymentStatus = 'paid'
    }

    if (isAdmin && ORDER_STATUSES.includes(status)) {
      nextStatus = status
    } else if (onlinePaid) {
      nextStatus = 'confirmed'
    }

    const order = await Order.create({
      orderNumber: buildOrderNumber(),
      user: req.user?._id || req.user?.id || null,
      customerName: String(customerName).trim(),
      customerEmail: email,
      customerPhone: String(customerPhone || '').trim(),
      items: cleanItems,
      itemsTotal: totals.itemsTotal,
      shippingFee: totals.shippingFee,
      discountAmount: totals.discountAmount,
      couponCode: totals.couponCode,
      totalAmount: totals.totalAmount,
      shippingAddress: shippingAddress || {},
      notes: String(notes || '').trim(),
      paymentMethod: method,
      status: nextStatus,
      paymentStatus: nextPaymentStatus,
    })

    // 1) Customer order confirmation (always)
    fireAndForget(notifyOrderConfirmed(order))

    // 2–4) After successful online payment → admin + customer payment emails
    if (order.paymentStatus === 'paid') {
      fireAndForget(notifyPaymentCompleted(order))
    }

    res.status(201).json({ order: order.toSafeJSON() })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create order' })
  }
})

/** Admin: update order status / payment */
router.patch('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const { status, paymentStatus, notes } = req.body
    const wasPaid = order.paymentStatus === 'paid'

    if (status && ORDER_STATUSES.includes(status)) {
      order.status = status
    }
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
      order.paymentStatus = paymentStatus
    }
    if (typeof notes === 'string') {
      order.notes = notes.trim()
    }

    await order.save()

    // COD (or any unpaid order) marked paid → admin + customer payment emails
    if (!wasPaid && order.paymentStatus === 'paid') {
      fireAndForget(notifyPaymentCompleted(order))
    }

    res.json({ message: 'Order updated', order: order.toSafeJSON() })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update order' })
  }
})

/** Admin: delete order */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json({ message: 'Order deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete order' })
  }
})

export default router
