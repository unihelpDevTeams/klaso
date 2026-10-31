import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { onIdTokenChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { verifyAdminAccess } from '../../firebase/adminAccess'
import { auth, db } from '../../firebase/config'

export default function TabLayout() {
  const { colors, isDark } = useTheme()
  const [canCreateLessons, setCanCreateLessons] = useState(false)

  useEffect(() => {
    let unsubscribeProfile = () => {}
    let authChangeId = 0

    const unsubscribeAuth = onIdTokenChanged(auth, (user) => {
      const currentChangeId = ++authChangeId
      unsubscribeProfile()
      setCanCreateLessons(false)

      if (!user) return

      verifyAdminAccess(user)
        .then(({ isAdmin }) => {
          if (currentChangeId === authChangeId) {
            setCanCreateLessons(isAdmin)
          }
        })
        .catch((error) => {
          console.error('Unable to verify admin access:', error)
        })

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          const userProfile = snapshot.data()
          const isApprovedTutor =
            userProfile?.role === 'tutor' && userProfile?.approved === true
          setCanCreateLessons((isAdmin) => isAdmin || isApprovedTutor)
        },
        (error) => {
          console.error('Unable to verify creator access:', error)
          setCanCreateLessons(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile()
    }
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          elevation: 8,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          marginHorizontal: 4,
        },
        tabBarIconStyle: {
          marginBottom: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tutors"
        options={{
          title: 'Tutors',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Creator',
          href: canCreateLessons ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          href: canCreateLessons ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Learning',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
