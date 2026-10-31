import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const { colors, isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setError('Please enter your email address.')
      return
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await sendPasswordResetEmail(auth, normalizedEmail)
      setSent(true)
      router.push({ pathname: '/(auth)/email-sent', params: { email: normalizedEmail } })
    } catch (requestError) {
      const message =
        requestError.code === 'auth/user-not-found'
          ? 'No account was found with that email.'
          : 'Unable to reset your password right now. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Header
          showBack
          title="Reset Password"
          subtitle="Recover your account"
          containerStyle={{ backgroundColor: colors.surface }}
        />

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? '#14331C' : '#F0FDF4',
                  borderColor: isDark ? '#1C4A2A' : '#BBF7D0',
                },
              ]}
            >
              <Ionicons name="key-outline" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                PASSWORD RECOVERY
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Forgot your password?</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Enter your email and we’ll send you a password reset link to regain access.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  error && styles.inputError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.leftIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value)
                    setError('')
                    setSent(false)
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text }]}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            {sent && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.successText, { color: colors.primary }]}>
                  Reset link sent! Check your email inbox.
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={loading}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.backLink}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Back to Login
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 20 },
  heading: { marginTop: 12, marginBottom: 24 },
  badge: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 170,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20 },

  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },

  inputWrap: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 12 },
  leftIcon: { marginRight: 10 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  error: { color: '#EF4444', fontSize: 12, fontWeight: '600' },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successText: { fontSize: 13, fontWeight: '700' },

  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  backLink: { alignItems: 'center', marginTop: 'auto', paddingTop: 30 },
  linkText: { fontSize: 14, fontWeight: '800' },
})
