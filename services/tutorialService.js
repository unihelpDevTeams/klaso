import { auth } from '../firebase/config'

const API_URL = String(process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '')

export async function deleteTutorTutorial(courseId) {
  if (!API_URL) {
    throw new Error('Backend URL is not configured. Set EXPO_PUBLIC_API_URL in the Klaso app environment.')
  }
  if (!courseId) {
    throw new Error('Tutorial information is missing.')
  }

  const user = auth.currentUser
  if (!user) {
    throw new Error('Please sign in before deleting a tutorial.')
  }

  const token = await user.getIdToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(
      `${API_URL}/api/tutor/tutorials/${encodeURIComponent(courseId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }
    )
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || `Unable to delete tutorial (${response.status}).`)
    }

    return {
      deletedMediaCount: Number(data.deletedMediaCount) || 0,
      deletedLessonCount: Number(data.deletedLessonCount) || 0,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tutorial media cleanup is taking too long. Retry deleting this tutorial.')
    }
    if (error instanceof TypeError) {
      throw new Error('Unable to reach the Klaso server. Check your connection and try again.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
