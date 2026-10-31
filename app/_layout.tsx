import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { onAuthStateChanged } from 'firebase/auth'
import React, { useEffect, useState } from 'react'
import { auth } from '../firebase/config'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

SplashScreen.preventAutoHideAsync().catch((error) => {
  console.error('Unable to keep the native splash screen visible:', error)
})

function RootNavigator() {
  const segments = useSegments()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const { isDark } = useTheme()

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

  useEffect(() => {
    if (!ready) return

    SplashScreen.hideAsync().catch((error) => {
      console.error('Unable to hide the native splash screen:', error)
    })
  }, [ready])

  if (!ready) return null

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course-details" options={{ presentation: 'card' }} />
        <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen name="screens/lesson" options={{ presentation: 'card' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  )
}
