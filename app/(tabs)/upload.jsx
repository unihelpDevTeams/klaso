import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import Header from '../components/header'
import UploadScreen from '../upload'

export default function TabUploadScreen() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const unsubProfile = onSnapshot(
        userRef,
        (snap) => {
          setUserProfile(snap.data() || null)
          setLoading(false)
        },
        () => {
          setUserProfile(null)
          setLoading(false)
        }
      )

      return unsubProfile
    })

    return unsubscribe
  }, [])

  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.admin === true ||
    auth.currentUser?.email?.toLowerCase().includes('admin')

  const isTutor = userProfile?.role === 'tutor'
  const isApproved = userProfile?.approved === true || isAdmin

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#15803D" />
      </SafeAreaView>
    )
  }

  // If approved tutor or admin, show full upload studio
  if (isTutor || isAdmin) {
    return <UploadScreen />
  }

  // If student learner, show clean educator studio promo
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showBack={false} title="Creator Studio" subtitle="Educator course publishing" />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="videocam" size={44} color="#15803D" />
        </View>

        <Text style={styles.title}>Become a Klaso Educator</Text>
        <Text style={styles.description}>
          The creator studio is reserved for certified tutors and educators. You can teach WAEC, JAMB, or university courses, reach thousands of ambitious students, and earn directly from lessons and live 1-on-1 sessions.
        </Text>

        <View style={styles.perksCard}>
          <View style={styles.perkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#15803D" />
            <Text style={styles.perkText}>Set your own teaching schedule & rates</Text>
          </View>
          <View style={styles.perkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#15803D" />
            <Text style={styles.perkText}>Publish video courses & curriculum modules</Text>
          </View>
          <View style={styles.perkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#15803D" />
            <Text style={styles.perkText}>Receive direct student bookings & payouts</Text>
          </View>
        </View>

        <Pressable
          style={styles.primaryButton}
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
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 44,
    borderWidth: 2,
    height: 88,
    justifyContent: 'center',
    marginBottom: 20,
    width: 88,
  },
  title: {
    color: '#14351D',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: '#718178',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  perksCard: {
    backgroundColor: '#F5FAF5',
    borderColor: '#DFE7E1',
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
    color: '#14351D',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#15803D',
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
