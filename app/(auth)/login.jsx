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
import Header from '../components/header'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header showBack title="Log In" subtitle="Welcome back to Klaso" containerStyle={styles.headerContainer} />

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
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={12} color="#15803D" />
              <Text style={styles.badgeText}>WELCOME BACK</Text>
            </View>
            <Text style={styles.title}>Continue Your Learning</Text>
            <Text style={styles.subtitle}>Pick up where you left off with courses & tutors.</Text>
          </View>

          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrap, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={18} color="#8A9B8E" style={styles.leftIcon} />
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v)
                    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }))
                  }}
                  placeholder="name@example.com"
                  placeholderTextColor="#8A9B8E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={18} color="#8A9B8E" style={styles.leftIcon} />
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }))
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#8A9B8E"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#718178"
                  />
                </Pressable>
              </View>
              {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}
            </View>

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {!!errors.form && (
              <View style={styles.bannerError}>
                <Ionicons name="warning-outline" size={18} color="#DC2626" />
                <Text style={styles.bannerErrorText}>{errors.form}</Text>
              </View>
            )}

            {/* Login Button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Log In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <Pressable style={styles.socialButton} onPress={() => handleSocialLogin('Google')}>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </Pressable>

              <Pressable style={styles.socialButton} onPress={() => handleSocialLogin('Apple')}>
                <Ionicons name="logo-apple" size={18} color="#14351D" />
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom Switch */}
          <View style={styles.bottomPrompt}>
            <Text style={styles.promptText}>Don&apos;t have an account yet?</Text>
            <Pressable onPress={() => router.push('/(auth)/SignUp')}>
              <Text style={styles.linkText}> Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  headerContainer: { backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 },

  heading: { marginTop: 12, marginBottom: 24 },
  badge: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 140,
  },
  badgeText: { color: '#15803D', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: '#14351D', fontSize: 26, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: '#718178', fontSize: 14, marginTop: 6, lineHeight: 20 },

  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { color: '#14351D', fontSize: 13, fontWeight: '700' },

  inputWrap: {
    alignItems: 'center',
    backgroundColor: '#F7FAF7',
    borderColor: '#DFE7E1',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  input: { color: '#14351D', flex: 1, fontSize: 14, paddingVertical: 12 },
  leftIcon: { marginRight: 10 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  error: { color: '#EF4444', fontSize: 12, fontWeight: '600' },

  forgotButton: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: '#15803D', fontSize: 13, fontWeight: '700' },

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
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 6 },
  dividerLine: { backgroundColor: '#E8EFEA', flex: 1, height: 1 },
  dividerText: { color: '#8A9B8E', fontSize: 12, fontWeight: '600' },

  socialButtons: { gap: 10 },
  socialButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DFE7E1',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 48,
    justifyContent: 'center',
  },
  socialButtonText: { color: '#14351D', fontSize: 14, fontWeight: '700' },

  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  promptText: { color: '#718178', fontSize: 14 },
  linkText: { color: '#15803D', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
})
