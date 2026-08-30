import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
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

export default function ForgotPassword() {
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
    } catch (requestError) {
      const message = requestError.code === 'auth/user-not-found'
        ? 'No account was found with that email.'
        : 'Unable to reset your password right now. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Header showBack title="Reset password" subtitle="Recover your account" containerStyle={styles.headerContainer} />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PASSWORD HELP</Text>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>We’ll send a reset link to the email tied to your account.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
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
                style={[styles.input, error && styles.inputError]}
                placeholderTextColor="#8A9B8E"
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            {sent && (
              <Text style={styles.success}>
                A reset link has been sent. Check your inbox and follow the instructions.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Sending...' : 'Send reset link'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.backLink}>
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  flex: { flex: 1 },
  headerContainer: { backgroundColor: '#F5FAF5', borderBottomWidth: 0, paddingTop: 12 },
  container: { flexGrow: 1, padding: 24 },
  heading: { marginTop: 24, marginBottom: 30 },
  eyebrow: { color: '#57a0ff', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  title: { color: '#14351D', fontSize: 32, fontWeight: '800', lineHeight: 38 },
  subtitle: { color: '#5D6D61', fontSize: 16, marginTop: 10 },
  form: { gap: 18 },
  fieldGroup: { gap: 8 },
  label: { color: '#14351D', fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E4D9',
    borderRadius: 12,
    borderWidth: 1,
    color: '#14351D',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: { borderColor: '#C24141' },
  error: { color: '#B42318', fontSize: 13 },
  success: { color: '#57a0ff', fontSize: 13, lineHeight: 20 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#57a0ff',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  backLink: { alignItems: 'center', marginTop: 'auto', paddingTop: 30 },
  linkText: { color: '#57a0ff', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
})
