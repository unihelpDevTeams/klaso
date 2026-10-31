import { sendEmailVerification } from 'firebase/auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
const verificationEmailsSent = new Set()

export async function verifyAdminAccess(user) {
  const tokenResult = await user.getIdTokenResult()
  const response = await fetch(`${API_URL}/api/admin/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenResult.token}`,
    },
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'Unable to verify admin access.')
  }

  if (Boolean(tokenResult.claims.admin) !== (result.isAdmin === true)) {
    await user.getIdToken(true)
  }

  if (result.emailVerificationRequired && !verificationEmailsSent.has(user.uid)) {
    verificationEmailsSent.add(user.uid)
    try {
      await sendEmailVerification(user)
    } catch (error) {
      verificationEmailsSent.delete(user.uid)
      throw error
    }
  }

  return {
    isAdmin: result.isAdmin === true,
    emailVerificationRequired: result.emailVerificationRequired === true,
  }
}
