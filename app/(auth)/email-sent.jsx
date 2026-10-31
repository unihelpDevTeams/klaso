import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'

export default function EmailSent() {
  const { email } = useLocalSearchParams()
  const { colors, isDark } = useTheme()
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
    } catch {
      setIsError(true)
      setStatusMessage('Could not resend email. Please try again in a few minutes.')
    } finally {
      setResending(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header
        showBack
        title="Check your email"
        subtitle="Password reset link sent"
        containerStyle={{ backgroundColor: colors.surface }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                { backgroundColor: isDark ? '#1C4A2A' : '#BBF7D0' },
              ]}
            >
              <Ionicons name="mail-unread-outline" size={48} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We&apos;ve sent a password reset link to:
          </Text>
          {email ? (
            <Text
              style={[
                styles.emailBadge,
                {
                  backgroundColor: isDark ? '#1C2920' : '#E8F5E9',
                  color: isDark ? '#4ADE80' : '#15803D',
                  borderColor: colors.border,
                },
              ]}
            >
              {email}
            </Text>
          ) : null}

          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: isDark ? '#1C2920' : '#F0FDF4',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
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
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
              resending && { opacity: 0.7 },
            ]}
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
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Back to Login
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  content: { alignItems: 'center' },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  emailBadge: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
    textAlign: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: { color: '#DC2626' },
  successText: { color: '#15803D' },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
