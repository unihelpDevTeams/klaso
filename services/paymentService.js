import { auth } from '../firebase/config'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

async function getAuthHeaders() {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Please sign in before continuing.')
  }

  const token = await user.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function initializePayment(tutorialId) {
  if (!tutorialId) {
    throw new Error('Tutorial information is missing.')
  }

  const headers = await getAuthHeaders()
  const response = await fetch(`${API_URL}/api/payments/initialize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tutorialId }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unable to start checkout.')
  }

  return data
}

export async function verifyPayment(txRef) {
  if (!txRef) {
    throw new Error('A transaction reference is required.')
  }

  const headers = await getAuthHeaders()
  const response = await fetch(`${API_URL}/api/payments/verify?reference=${encodeURIComponent(txRef)}`, {
    method: 'GET',
    headers,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unable to verify payment.')
  }

  return data
}

export async function checkTutorialPurchase(tutorialId) {
  if (!tutorialId) {
    return { hasAccess: false, purchased: false }
  }

  const user = auth.currentUser
  if (!user) {
    return { hasAccess: false, purchased: false }
  }

  const token = await user.getIdToken()
  const response = await fetch(`${API_URL}/api/purchases?tutorialId=${encodeURIComponent(tutorialId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unable to check purchase access.')
  }

  return {
    hasAccess: Boolean(data.hasAccess || data.purchased),
    purchased: Boolean(data.hasAccess || data.purchased),
    ...data,
  }
}

export async function getMyPurchases() {
  const user = auth.currentUser
  if (!user) {
    return []
  }

  const token = await user.getIdToken()
  const response = await fetch(`${API_URL}/api/purchases/my-purchases`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unable to fetch your purchases.')
  }

  return Array.isArray(data.purchases) ? data.purchases : []
}
