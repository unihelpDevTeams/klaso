import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { auth } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { colors, isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const nextErrors = {}
    const normalizedEmail = email.trim()

    if (!normalizedEmail) nextErrors.email = 'Email address is required.'
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = 'Please enter a valid email address.'

    if (!password) nextErrors.password = 'Password is required.'
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate() || loading) return

    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      router.replace('/(tabs)')
    } catch (error) {
      console.log('Login error:', error)
      const message =
        error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found'
          ? 'Incorrect email address or password. Please try again.'
          : error.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Please wait a moment.'
          : error.message || 'Unable to log in right now. Please try again.'
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    Alert.alert(
      `${provider} Sign In`,
      `For development and production build, native ${provider} OAuth credentials are used. For now, you can sign in directly with your email and password.`,
      [{ text: 'OK' }]
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header
        showBack
        title="Log In"
        subtitle="Welcome back to Klaso"
        containerStyle={{ backgroundColor: colors.surface }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                WELCOME BACK
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Continue Your Learning</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Pick up where you left off with courses & tutors.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  errors.email && styles.inputError,
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
                  onChangeText={(v) => {
                    setEmail(v)
                    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }))
                  }}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
              {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  errors.password && styles.inputError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.leftIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }))
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: colors.text }]}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
              {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotButton}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </Pressable>

            {/* General Form Error Banner */}
            {!!errors.form && (
              <View style={styles.bannerError}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.bannerErrorText}>{errors.form}</Text>
              </View>
            )}

            {/* Sign In Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Log In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                OR CONTINUE WITH
              </Text>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
            </View>

            {/* Social OAuth Buttons */}
            <View style={styles.socialButtons}>
              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSocialLogin('Google')}
              >
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={[styles.socialButtonText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom Switch */}
          <View style={styles.bottomPrompt}>
            <Text style={[styles.promptText, { color: colors.textMuted }]}>
              Don&apos;t have an account yet?
            </Text>
            <Pressable onPress={() => router.push('/(auth)/SignUp')}>
              <Text style={[styles.linkText, { color: colors.primary }]}> Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 },

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
    width: 140,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.4 },
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

  forgotButton: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, fontWeight: '700' },

  bannerError: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  bannerErrorText: { color: '#991B1B', flex: 1, fontSize: 13, fontWeight: '600' },

  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 6 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: '600' },

  socialButtons: { gap: 10 },
  socialButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 48,
    justifyContent: 'center',
  },
  socialButtonText: { fontSize: 14, fontWeight: '700' },

  bottomPrompt: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  promptText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '800' },
})
