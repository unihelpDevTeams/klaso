import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Header from '../components/header'
import { auth } from '../../firebase/config'

export default function EmailSent() {
  const { email } = useLocalSearchParams()
  const [resending, setResending] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const handleResend = async () => {
    if (!email) {
      setIsError(true)
      setStatusMessage('No email address provided. Please return to reset password.')
      return
    }

    setResending(true)
    setStatusMessage('')
    setIsError(false)

    try {
      await sendPasswordResetEmail(auth, String(email))
      setIsError(false)
      setStatusMessage('A new reset link has been sent to your email!')
    } catch (err) {
      setIsError(true)
      setStatusMessage('Could not resend email. Please try again in a few minutes.')
    } finally {
      setResending(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        showBack
        title="Check your email"
        subtitle="Password reset link sent"
        containerStyle={styles.headerContainer}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <View style={styles.iconInner}>
              <Ionicons name="mail-unread-outline" size={48} color="#15803D" />
            </View>
          </View>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a password reset link to:
          </Text>
          {email ? (
            <Text style={styles.emailBadge}>{email}</Text>
          ) : null}

          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={18} color="#15803D" />
            <Text style={styles.noticeText}>
              Didn&apos;t receive it? Check your spam or promotions folder, or click below to resend.
            </Text>
          </View>

          {statusMessage ? (
            <Text style={[styles.statusText, isError ? styles.errorText : styles.successText]}>
              {statusMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={handleResend}
            disabled={resending}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            {resending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Resend Email</Text>
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(auth)/login')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={18} color="#14351D" />
            <Text style={styles.secondaryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  headerContainer: { backgroundColor: '#F5FAF5', borderBottomWidth: 0, paddingTop: 12 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  content: { alignItems: 'center' },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#14351D',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#5D6D61',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  emailBadge: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: '#E8F4EB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E4D9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  noticeText: {
    color: '#5D6D61',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  statusText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  successText: { color: '#15803D' },
  errorText: { color: '#B42318' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    height: 54,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E4D9',
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.75 },
})
