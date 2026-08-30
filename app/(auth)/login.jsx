import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Header from '../components/header'
import { auth } from '../../firebase/config'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function validate() {
    const nextErrors = {}
    const normalizedEmail = email.trim()

    if (!normalizedEmail) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = 'Enter a valid email address.'
    if (!password) nextErrors.password = 'Password is required.'
    else if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit() {
    setSubmitted(false)
    if (!validate()) return

    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      router.replace('/(tabs)')
    } catch (error) {
      const message = error.code === 'auth/invalid-credential'
        ? 'The email or password is incorrect.'
        : error.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Unable to log in right now. Please try again.'
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Header showBack title="Log in" subtitle="Pick up where you left off" containerStyle={styles.headerContainer} />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Log in to keep learning.</Text>
            <Text style={styles.subtitle}>Pick up where you left off with Klaso.</Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Email address"
              value={email}
              onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: undefined })) }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })) }}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((visible) => !visible)}
            />
            <Pressable style={styles.forgotButton} onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
            {!!errors.form && <Text style={styles.error}>{errors.form}</Text>}
            {submitted && <Text style={styles.success}>Logged in successfully.</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Logging in...' : 'Log in'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          <View style={styles.bottomPrompt}>
            <Text style={styles.promptText}>New to Klaso?</Text>
            <Pressable onPress={() => router.push('/(auth)/SignUp')}>
              <Text style={styles.linkText}> Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({ label, error, rightIcon, onRightIconPress, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <TextInput {...inputProps} style={styles.input} placeholderTextColor="#8A9B8E" />
        {rightIcon && (
          <Pressable accessibilityLabel="Toggle password visibility" onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={21} color="#5D6D61" />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  flex: { flex: 1 },
  headerContainer: { backgroundColor: '#F5FAF5', borderBottomWidth: 0, paddingTop: 12 },
  container: { flexGrow: 1, padding: 24 },
  heading: { marginTop: 38, marginBottom: 34 },
  eyebrow: { color: '#57a0ff', fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 12 },
  title: { color: '#14351D', fontSize: 32, fontWeight: '800', lineHeight: 38 },
  subtitle: { color: '#5D6D61', fontSize: 16, marginTop: 10 },
  form: { gap: 20 },
  fieldGroup: { gap: 7 },
  label: { color: '#14351D', fontSize: 14, fontWeight: '700' },
  inputWrap: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D7E4D9', borderRadius: 12, borderWidth: 1, flexDirection: 'row', minHeight: 54, paddingHorizontal: 16 },
  input: { color: '#14351D', flex: 1, fontSize: 16, paddingVertical: 14 },
  inputError: { borderColor: '#C24141' },
  error: { color: '#B42318', fontSize: 13 },
  forgotButton: { alignSelf: 'flex-end', marginTop: -8 },
  linkText: { color: '#57a0ff', fontSize: 14, fontWeight: '700' },
  success: { color: '#57a0ff', fontSize: 13 },
  primaryButton: { alignItems: 'center', backgroundColor: '#57a0ff', borderRadius: 14, flexDirection: 'row', gap: 10, height: 56, justifyContent: 'center', marginTop: 2 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 38 },
  promptText: { color: '#5D6D61', fontSize: 14 },
  pressed: { opacity: 0.72 },
})