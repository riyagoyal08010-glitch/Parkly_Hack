import { loadStripe } from '@stripe/stripe-js'
import { insforge } from './insforge'

let stripePromise = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

export async function createCheckoutSession({ bookingId, amount, parkingTitle, userEmail }) {
  const body = {
    booking_id: bookingId,
    amount,
    parking_title: parkingTitle,
    customer_email: userEmail,
    success_url: `${window.location.origin}/booking/${bookingId}?payment=success`,
    cancel_url: `${window.location.origin}/booking/${bookingId}?payment=cancelled`,
  }

  // Try SDK invoke first
  try {
    const { data, error } = await insforge.functions.invoke('create-stripe-session', { body })
    if (!error && data?.session_id) return data
    if (!error && data?.url) return data
  } catch (e) {
    console.warn('SDK invoke failed, trying direct fetch:', e)
  }

  // Fallback: direct fetch to functions URL
  const baseUrl = import.meta.env.VITE_INSFORGE_URL
  const appKey = new URL(baseUrl).hostname.split('.')[0]
  const functionsUrl = `https://${appKey}.functions.insforge.app/create-stripe-session`

  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create checkout session')
  }

  return res.json()
}
