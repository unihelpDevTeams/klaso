import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth, db } from '../../firebase/config'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitted(false)
  }

  function validate() {
    const nextErrors = {}
    const normalizedEmail = form.email.trim()

    if (!form.name.trim()) nextErrors.name = 'Full name is required.'
    if (!normalizedEmail) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = 'Enter a valid email address.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters.'
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
    else if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.'
    if (!acceptedTerms) nextErrors.terms = 'Accept the terms to continue.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit() {
    setSubmitted(false)
    if (!validate()) return

    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      const displayName = form.name.trim()
      await updateProfile(credential.user, { displayName })
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        displayName,
        email: credential.user.email,
        role: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      router.replace('/(tabs)')
    } catch (error) {
      const message = error.code === 'auth/email-already-in-use'
        ? 'An account already exists with this email.'
        : error.code === 'auth/weak-password'
          ? 'Choose a stronger password.'
          : 'Unable to create your account right now. Please try again.'
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Header showBack title="Create account" subtitle="Start your journey" containerStyle={styles.headerContainer} />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>START YOUR JOURNEY</Text>
            <Text style={styles.title}>Create your Klaso account.</Text>
            <Text style={styles.subtitle}>A smarter way to reach your learning goals.</Text>
          </View>

          <View style={styles.form}>
            <Field label="Full name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Your full name" error={errors.name} />
            <Field label="Email address" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            <Field label="Password" value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="At least 8 characters" secureTextEntry={!showPassword} error={errors.password} rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowPassword((visible) => !visible)} />
            <Field label="Confirm password" value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} placeholder="Re-enter your password" secureTextEntry={!showConfirmPassword} error={errors.confirmPassword} rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowConfirmPassword((visible) => !visible)} />

            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => { setAcceptedTerms((accepted) => !accepted); setErrors((current) => ({ ...current, terms: undefined })) }} style={styles.termsRow}>
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>I agree to Klaso&apos;s Terms of Service and Privacy Policy.</Text>
            </Pressable>
            {!!errors.terms && <Text style={styles.error}>{errors.terms}</Text>}
            {!!errors.form && <Text style={styles.error}>{errors.form}</Text>}
            {submitted && <Text style={styles.success}>Your account details are valid and ready to submit.</Text>}
            <Pressable accessibilityRole="button" onPress={handleSubmit} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>{loading ? 'Creating account...' : 'Create account'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          <View style={styles.bottomPrompt}>
            <Text style={styles.promptText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}><Text style={styles.linkText}> Log in</Text></Pressable>
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
        {rightIcon && <Pressable accessibilityLabel="Toggle password visibility" onPress={onRightIconPress} hitSlop={10}><Ionicons name={rightIcon} size={20} color="#5D6D61" /></Pressable>}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24 },
  backButton: { alignSelf: 'flex-start', marginLeft: -8, padding: 8 },
  heading: { marginBottom: 26, marginTop: 20 },
  eyebrow: { color: '#57a0ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.3, marginBottom: 10 },
  title: { color: '#14351D', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#718178', fontSize: 15, marginTop: 8 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  label: { color: '#14351D', fontSize: 13, fontWeight: '700' },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: '#F7FAF7',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  input: { color: '#14351D', flex: 1, fontSize: 15, paddingVertical: 14 },
  inputError: { borderColor: '#C24141' },
  error: { color: '#B42318', fontSize: 12.5 },
  termsRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 4 },
  checkbox: {
    alignItems: 'center',
    borderColor: '#D6DED8',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 21,
    justifyContent: 'center',
    width: 21,
  },
  checkboxChecked: { backgroundColor: '#57a0ff', borderColor: '#57a0ff' },
  termsText: { color: '#718178', flex: 1, fontSize: 12.5, lineHeight: 18 },
  success: { color: '#57a0ff', fontSize: 12.5 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#57a0ff',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    height: 54,
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 26 },
  promptText: { color: '#718178', fontSize: 13.5 },
  linkText: { color: '#57a0ff', fontSize: 13.5, fontWeight: '700' },
  pressed: { opacity: 0.72 },
})