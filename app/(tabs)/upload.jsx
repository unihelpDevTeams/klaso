import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { onIdTokenChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import { verifyAdminAccess } from '../../firebase/adminAccess'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'
import UploadScreen from '../upload'

export default function TabUploadScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isConfiguredAdmin, setIsConfiguredAdmin] = useState(false)

  useEffect(() => {
    let unsubscribeProfile = () => {}
    let authChangeId = 0

    const unsubscribe = onIdTokenChanged(auth, (user) => {
      const currentChangeId = ++authChangeId
      unsubscribeProfile()
      setIsConfiguredAdmin(false)

      if (!user) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      verifyAdminAccess(user)
        .then(({ isAdmin }) => {
          if (currentChangeId === authChangeId) {
            setIsConfiguredAdmin(isAdmin)
          }
        })
        .catch((error) => {
          console.error('Unable to verify admin access:', error)
        })

      const userRef = doc(db, 'users', user.uid)
      unsubscribeProfile = onSnapshot(
        userRef,
        (snap) => {
          setUserProfile(snap.data() || null)
          setLoading(false)
        },
        (error) => {
          console.error('Unable to verify creator access:', error)
          setUserProfile(null)
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribe()
      unsubscribeProfile()
    }
  }, [])

  const isAdmin = isConfiguredAdmin
  const isApprovedTutor =
    userProfile?.role === 'tutor' && userProfile?.approved === true

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  // If approved tutor or admin, show full upload studio
  if (isApprovedTutor || isAdmin) {
    return <UploadScreen />
  }

  // If student learner, show clean educator studio promo
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header showBack={false} title="Creator Studio" subtitle="Educator course publishing" />

      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? '#14331C' : '#F0FDF4',
              borderColor: isDark ? '#1C4A2A' : '#BBF7D0',
            },
          ]}
        >
          <Ionicons name="videocam" size={44} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Become a Klaso Educator</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          The creator studio is reserved for certified tutors and educators. You can teach WAEC, JAMB, or university courses, reach thousands of ambitious students, and earn directly from lessons and live 1-on-1 sessions.
        </Text>

        <View
          style={[
            styles.perksCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.perkRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.perkText, { color: colors.text }]}>
              Set your own teaching schedule & rates
            </Text>
          </View>
          <View style={styles.perkRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.perkText, { color: colors.text }]}>
              Publish video courses & curriculum modules
            </Text>
          </View>
          <View style={styles.perkRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.perkText, { color: colors.text }]}>
              Receive direct student bookings & payouts
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/become-tutor')}
          accessibilityLabel="Apply to Become a Tutor"
        >
          <Ionicons name="school" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Apply as Tutor</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 44,
    borderWidth: 2,
    height: 88,
    justifyContent: 'center',
    marginBottom: 20,
    width: 88,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  perksCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 28,
    padding: 16,
    width: '100%',
  },
  perkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  perkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
