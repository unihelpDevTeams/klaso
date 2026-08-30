import { Stack, useRouter, useSegments } from 'expo-router'
import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from '../firebase/config'

export default function RootLayout() {
  const segments = useSegments()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const inAuthGroup = segments[0] === '(auth)'

      if (user && inAuthGroup) {
        router.replace('/(tabs)')
      } else if (!user && segments[0] === '(tabs)') {
        router.replace('/(auth)/onboarding')
      }

      setReady(true)
    })

    return unsubscribe
  }, [router, segments])

  if (!ready) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
