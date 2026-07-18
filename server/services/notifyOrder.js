import { sendMail, getAdminNotifyEmail } from './mail.js'
import {
  orderConfirmationEmail,
  paymentSuccessfulEmail,
  adminNewPaidOrderEmail,
} from './orderEmails.js'

/** Customer: order received / confirmed */
export async function notifyOrderConfirmed(order) {
  const { subject, html } = orderConfirmationEmail(order)
  return sendMail({ to: order.customerEmail, subject, html })
}

/** Customer: payment successful (optional step in PahadLink-style flow) */
export async function notifyPaymentSuccessful(order) {
  const { subject, html } = paymentSuccessfulEmail(order)
  return sendMail({ to: order.customerEmail, subject, html })
}

/** Admin: new paid order with full details */
export async function notifyAdminNewPaidOrder(order) {
  const { subject, html } = adminNewPaidOrderEmail(order)
  return sendMail({ to: getAdminNotifyEmail(), subject, html })
}

/**
 * When payment becomes paid: admin + customer payment emails.
 * Safe to call multiple times only if you gate on previous status.
 */
export async function notifyPaymentCompleted(order) {
  await Promise.allSettled([
    notifyAdminNewPaidOrder(order),
    notifyPaymentSuccessful(order),
  ])
}
