import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs, router } from 'expo-router'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { auth, db } from '../../firebase/config'

export default function TabLayout() {
  const [userProfile, setUserProfile] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserProfile(null)
        setLoadingUser(false)
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const unsubscribeProfile = onSnapshot(
        userRef,
        (snapshot) => {
          setUserProfile(snapshot.data() || null)
          setLoadingUser(false)
        },
        () => {
          setUserProfile(null)
          setLoadingUser(false)
        }
      )

      return unsubscribeProfile
    })

    return unsubscribeAuth
  }, [])

  const isAdmin = userProfile?.role === 'admin' || userProfile?.admin === true || auth.currentUser?.email?.toLowerCase().includes('admin')
  const canCreateContent = !loadingUser && (isAdmin || (userProfile?.role === 'tutor' && userProfile?.approved === true))

  const handleUploadAction = () => {
    if (!canCreateContent) return
    router.push(isAdmin ? '/admin-panel' : '/upload')
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          height: 82,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#14351D',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 6,
          marginTop: 6,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarActiveTintColor: '#57a0ff',
        tabBarInactiveTintColor: '#8A9B8E',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
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
          href: canCreateContent ? undefined : null,
          title: '',
          tabBarButton: () =>
            canCreateContent ? (
              <Pressable
                onPress={handleUploadAction}
                accessibilityLabel={isAdmin ? 'Open admin panel' : 'Upload lesson'}
                style={styles.uploadButtonWrapper}
              >
                <View style={styles.uploadButton}>
                  <Ionicons name="add" size={30} color="#FFFFFF" />
                </View>
              </Pressable>
            ) : null,
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Purchases',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
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

const styles = StyleSheet.create({
  uploadButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 72,
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderRadius: 18,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 56,
  },
})