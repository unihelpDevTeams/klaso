import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth, db } from '../../firebase/config'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }))
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
    setTouched({ name: true, email: true, password: true, confirmPassword: true, terms: true })
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate() || loading) return

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
      console.log('Sign up error:', error)
      const message = error.code === 'auth/email-already-in-use'
        ? 'An account already exists with this email.'
        : error.code === 'auth/weak-password'
          ? 'Choose a stronger password.'
          : 'Unable to create your account right now. Please try again.'
      setErrors((prev) => ({ ...prev, form: message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showBack title="Create account" subtitle="Start your journey" containerStyle={styles.headerContainer} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.container} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heading}>
           <Text style={styles.title}>Create your Klaso account</Text>
            <Text style={styles.subtitle}>A smarter way to reach your learning goals.</Text>
          </View>

          <View style={styles.form}>
            <Field 
              label="Full name" 
              value={form.name} 
              onChangeText={(v) => updateField('name', v)} 
              onBlur={() => handleBlur('name')}
              placeholder="e.g. Alex Morgan" 
              error={errors.name} 
              isTouched={touched.name}
              isValid={touched.name && !errors.name && form.name.trim().length > 0}
              leftIcon="person-outline"
            />
            
            <Field 
              label="Email address" 
              value={form.email} 
              onChangeText={(v) => updateField('email', v)} 
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com" 
              keyboardType="email-address" 
              autoCapitalize="none" 
              error={errors.email} 
              isTouched={touched.email}
              isValid={touched.email && !errors.email && form.email.trim().length > 0}
              leftIcon="mail-outline"
            />

            <Field 
              label="Password" 
              value={form.password} 
              onChangeText={(v) => updateField('password', v)} 
              onBlur={() => handleBlur('password')}
              placeholder="At least 8 characters" 
              secureTextEntry={!showPassword} 
              error={errors.password} 
              isTouched={touched.password}
              isValid={touched.password && !errors.password && form.password.length >= 8}
              leftIcon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'} 
              onRightIconPress={() => setShowPassword((v) => !v)} 
            />

            <Field 
              label="Confirm password" 
              value={form.confirmPassword} 
              onChangeText={(v) => updateField('confirmPassword', v)} 
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Re-enter your password" 
              secureTextEntry={!showConfirmPassword} 
              error={errors.confirmPassword} 
              isTouched={touched.confirmPassword}
              isValid={touched.confirmPassword && !errors.confirmPassword && form.confirmPassword.length > 0 && form.confirmPassword === form.password}
              leftIcon="shield-checkmark-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
              onRightIconPress={() => setShowConfirmPassword((v) => !v)} 
            />

            <Pressable 
              accessibilityRole="checkbox" 
              accessibilityState={{ checked: acceptedTerms }} 
              onPress={() => { 
                setAcceptedTerms((v) => !v); 
                setErrors((c) => ({ ...c, terms: undefined })) 
              }} 
              style={styles.termsRow}
            >
              <View style={[
                styles.checkbox, 
                acceptedTerms && styles.checkboxChecked,
                touched.terms && errors.terms && styles.checkboxError
              ]}>
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                I agree to Klaso&apos;s <Text style={styles.termsHighlight}>Terms of Service</Text> and <Text style={styles.termsHighlight}>Privacy Policy</Text>.
              </Text>
            </Pressable>

            {!!errors.terms && (
              <View style={styles.inlineErrorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.error}>{errors.terms}</Text>
              </View>
            )}

            {!!errors.form && (
              <View style={styles.bannerError}>
                <Ionicons name="warning-outline" size={18} color="#DC2626" />
                <Text style={styles.bannerErrorText}>{errors.form}</Text>
              </View>
            )}

            <Pressable 
              accessibilityRole="button" 
              onPress={handleSubmit} 
              disabled={loading}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.bottomPrompt}>
            <Text style={styles.promptText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.linkText}> Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({ label, error, isTouched, isValid, leftIcon, rightIcon, onRightIconPress, onBlur, ...inputProps }) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputWrap, 
        isFocused && styles.inputFocused,
        isTouched && error && styles.inputError,
        isTouched && isValid && styles.inputSuccess
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={18} 
            color={isTouched && error ? '#EF4444' : isFocused ? '#2563EB' : '#94A3B8'} 
            style={styles.leftIcon}
          />
        )}
        
        <TextInput 
          {...inputProps} 
          style={styles.input} 
          placeholderTextColor="#94A3B8"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false)
            if (onBlur) onBlur(e)
          }}
        />

        {isTouched && isValid && (
          <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.statusIcon} />
        )}
        
        {isTouched && error && (
          <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.statusIcon} />
        )}

        {rightIcon && (
          <Pressable accessibilityLabel="Toggle visibility" onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={18} color="#64748B" />
          </Pressable>
        )}
      </View>

      {isTouched && !!error && (
        <View style={styles.inlineErrorRow}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  headerContainer: { backgroundColor: '#FAFAFA' },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  
  heading: { marginBottom: 24, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  eyebrow: { color: '#2563EB', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 15, marginTop: 6 },
  
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  
  inputWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputFocused: { borderColor: '#2563EB', backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputSuccess: { borderColor: '#10B981' },
  
  input: { color: '#0F172A', flex: 1, fontSize: 15, paddingVertical: 12 },
  leftIcon: { marginRight: 10 },
  statusIcon: { marginLeft: 6, marginRight: 4 },
  
  inlineErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  error: { color: '#EF4444', fontSize: 12, fontWeight: '500' },
  
  bannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
  },
  bannerErrorText: { color: '#991B1B', fontSize: 13, flex: 1 },
  
  termsRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 6 },
  checkbox: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxError: { borderColor: '#EF4444' },
  termsText: { color: '#64748B', flex: 1, fontSize: 13, lineHeight: 18 },
  termsHighlight: { color: '#2563EB', fontWeight: '600' },
  
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  
  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  promptText: { color: '#64748B', fontSize: 14 },
  linkText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.85 },
})