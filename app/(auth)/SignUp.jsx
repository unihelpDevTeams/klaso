import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  Alert,
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
import { auth, db } from '../../firebase/config'
import { verifyAdminAccess } from '../../firebase/adminAccess'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SUBJECTS = [
  'Mathematics',
  'Science (Biology/Chemistry/Physics)',
  'Languages (English & Literature)',
  'Computer Science & Coding',
  'Economics & Business',
  'General Academics',
]

export default function SignUp() {
  const { colors, isDark } = useTheme()
  const [selectedRole, setSelectedRole] = useState('student') // 'student' | 'tutor'

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Tutor specific fields
    subject: 'Mathematics',
    qualification: '',
    hourlyRate: '3500',
    bio: '',
    // Student specific field
    targetExam: 'WAEC / JAMB',
  })

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
    if (!normalizedEmail) nextErrors.email = 'Email address is required.'
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = 'Please enter a valid email address.'

    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'

    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password.'
    else if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.'

    if (selectedRole === 'tutor') {
      if (!form.qualification.trim()) {
        nextErrors.qualification = 'Highest degree or qualification is required.'
      }
      if (!form.hourlyRate.trim() || isNaN(Number(form.hourlyRate)) || Number(form.hourlyRate) <= 0) {
        nextErrors.hourlyRate = 'Please enter a valid hourly rate (in Naira).'
      }
      if (!form.bio.trim() || form.bio.trim().length < 15) {
        nextErrors.bio = 'Brief teaching bio must be at least 15 characters.'
      }
    }

    if (!acceptedTerms) nextErrors.terms = 'You must accept the terms to continue.'

    setErrors(nextErrors)
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      qualification: true,
      hourlyRate: true,
      bio: true,
      terms: true,
    })
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate() || loading) return

    setLoading(true)
    try {
      const email = form.email.trim()
      const credential = await createUserWithEmailAndPassword(auth, email, form.password)
      const displayName = form.name.trim()
      await updateProfile(credential.user, { displayName })

      let isEmailAdmin = false
      let emailVerificationRequired = false
      try {
        const adminVerification = await verifyAdminAccess(credential.user)
        isEmailAdmin = adminVerification.isAdmin
        emailVerificationRequired = adminVerification.emailVerificationRequired
      } catch (verificationError) {
        console.error('Unable to verify configured admin access:', verificationError)
      }
      const role = isEmailAdmin ? 'admin' : selectedRole

      const userData = {
        uid: credential.user.uid,
        displayName,
        email: credential.user.email,
        role,
        admin: isEmailAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      if (role === 'tutor') {
        userData.subject = form.subject
        userData.qualification = form.qualification.trim()
        userData.hourlyRate = Number(form.hourlyRate.trim())
        userData.bio = form.bio.trim()
        userData.specialty = `${form.subject} Specialist`
        userData.approved = isEmailAdmin ? true : false // Needs admin review unless admin
        userData.rating = 5.0
        userData.reviewsCount = 0
        userData.experience = 'Newly Verified Tutor'
      } else {
        userData.targetExam = form.targetExam
        userData.streakCount = 1
        userData.enrolledCount = 0
        userData.certificatesCount = 0
      }

      await setDoc(doc(db, 'users', credential.user.uid), userData)

      if (emailVerificationRequired) {
        Alert.alert(
          'Verify your admin email',
          'We sent a verification link to your configured admin email. Verify it, then sign in again to activate admin access.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        )
      } else {
        router.replace('/(tabs)')
      }
    } catch (error) {
      console.log('Sign up error:', error)
      const message =
        error.code === 'auth/email-already-in-use'
          ? 'An account already exists with this email address.'
          : error.code === 'auth/weak-password'
          ? 'Password is too weak. Use a mix of letters, numbers, and symbols.'
          : error.message || 'Unable to create your account. Please try again.'
      setErrors((prev) => ({ ...prev, form: message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header showBack title="Create Account" subtitle="Join the Klaso Academy" containerStyle={{ backgroundColor: colors.surface }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title */}
          <View style={styles.headingWrap}>
            <Text style={[styles.title, { color: colors.text }]}>Start Your Learning Journey</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Choose your account type to personalize your experience.</Text>
          </View>

          {/* Account Role Selector */}
          <Text style={[styles.roleSectionLabel, { color: colors.text }]}>Select Account Type</Text>
          <View style={styles.roleSelectorRow}>
            {/* Student Role Card */}
            <Pressable
              style={[
                styles.roleCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedRole === 'student' && {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={() => setSelectedRole('student')}
            >
              <View
                style={[
                  styles.roleIconBox,
                  { backgroundColor: colors.borderSubtle },
                  selectedRole === 'student' && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="school"
                  size={24}
                  color={selectedRole === 'student' ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.roleTitle, { color: selectedRole === 'student' ? colors.primary : colors.text }]}>
                Student
              </Text>
              <Text style={[styles.roleSub, { color: colors.textMuted }]}>Learn, practice & book tutors</Text>
              <View
                style={[
                  styles.radioDot,
                  { borderColor: selectedRole === 'student' ? colors.primary : colors.border },
                ]}
              >
                {selectedRole === 'student' && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </Pressable>

            {/* Tutor Role Card */}
            <Pressable
              style={[
                styles.roleCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedRole === 'tutor' && {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={() => setSelectedRole('tutor')}
            >
              <View
                style={[
                  styles.roleIconBox,
                  { backgroundColor: colors.borderSubtle },
                  selectedRole === 'tutor' && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="easel"
                  size={24}
                  color={selectedRole === 'tutor' ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.roleTitle, { color: selectedRole === 'tutor' ? colors.primary : colors.text }]}>
                Tutor
              </Text>
              <Text style={[styles.roleSub, { color: colors.textMuted }]}>Teach, mentor & earn income</Text>
              <View
                style={[
                  styles.radioDot,
                  { borderColor: selectedRole === 'tutor' ? colors.primary : colors.border },
                ]}
              >
                {selectedRole === 'tutor' && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <Field
              label="Full Name"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              onBlur={() => handleBlur('name')}
              placeholder="e.g. Chiamaka Okafor"
              error={errors.name}
              isTouched={touched.name}
              isValid={touched.name && !errors.name && form.name.trim().length > 0}
              leftIcon="person-outline"
            />

            <Field
              label="Email Address"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              onBlur={() => handleBlur('email')}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              isTouched={touched.email}
              isValid={touched.email && !errors.email && form.email.trim().length > 0}
              leftIcon="mail-outline"
            />

            {/* Tutor specific inputs */}
            {selectedRole === 'tutor' && (
              <View
                style={[
                  styles.tutorExtraBox,
                  { backgroundColor: colors.primaryMint, borderColor: colors.border },
                ]}
              >
                <View style={styles.tutorHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.tutorHeaderTitle, { color: colors.primary }]}>Tutor Teaching Profile</Text>
                </View>

                {/* Subject Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Primary Teaching Subject</Text>
                  <View style={styles.subjectPillsRow}>
                    {SUBJECTS.map((sub) => {
                      const isSubSelected = form.subject === sub
                      return (
                        <Pressable
                          key={sub}
                          style={[
                            styles.subjectPill,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            isSubSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => updateField('subject', sub)}
                        >
                          <Text
                            style={[
                              styles.subjectPillText,
                              { color: isSubSelected ? '#FFFFFF' : colors.textSecondary },
                            ]}
                          >
                            {sub}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>

                <Field
                  label="Highest Qualification / Alma Mater"
                  value={form.qualification}
                  onChangeText={(v) => updateField('qualification', v)}
                  onBlur={() => handleBlur('qualification')}
                  placeholder="e.g. B.Sc. Mathematics, UNILAG"
                  error={errors.qualification}
                  isTouched={touched.qualification}
                  isValid={touched.qualification && !errors.qualification && form.qualification.trim().length > 0}
                  leftIcon="school-outline"
                />

                <Field
                  label="Hourly Rate (₦ Naira)"
                  value={form.hourlyRate}
                  onChangeText={(v) => updateField('hourlyRate', v)}
                  onBlur={() => handleBlur('hourlyRate')}
                  placeholder="e.g. 3500"
                  keyboardType="numeric"
                  error={errors.hourlyRate}
                  isTouched={touched.hourlyRate}
                  isValid={touched.hourlyRate && !errors.hourlyRate && Number(form.hourlyRate) > 0}
                  leftIcon="cash-outline"
                />

                <Field
                  label="Brief Teaching Bio & Approach"
                  value={form.bio}
                  onChangeText={(v) => updateField('bio', v)}
                  onBlur={() => handleBlur('bio')}
                  placeholder="Explain your teaching philosophy, past student successes, and exam preparation strategies..."
                  multiline
                  numberOfLines={3}
                  error={errors.bio}
                  isTouched={touched.bio}
                  isValid={touched.bio && !errors.bio && form.bio.trim().length >= 15}
                  leftIcon="document-text-outline"
                  inputStyle={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
                />
              </View>
            )}

            {/* Student specific inputs */}
            {selectedRole === 'student' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Primary Target Exam / Learning Goal</Text>
                <View style={styles.subjectPillsRow}>
                  {['WAEC / WASSCE', 'JAMB / UTME', 'University Courses', 'General Skills'].map((exam) => {
                    const isExamSelected = form.targetExam === exam
                    return (
                      <Pressable
                        key={exam}
                        style={[
                          styles.subjectPill,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isExamSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => updateField('targetExam', exam)}
                      >
                        <Text
                          style={[
                            styles.subjectPillText,
                            { color: isExamSelected ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          {exam}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )}

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
              label="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              isTouched={touched.confirmPassword}
              isValid={
                touched.confirmPassword &&
                !errors.confirmPassword &&
                form.confirmPassword.length > 0 &&
                form.confirmPassword === form.password
              }
              leftIcon="shield-checkmark-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword((v) => !v)}
            />

            {/* Terms checkbox */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              onPress={() => {
                setAcceptedTerms((v) => !v)
                setErrors((c) => ({ ...c, terms: undefined }))
              }}
              style={styles.termsRow}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: acceptedTerms ? colors.primary : colors.card,
                    borderColor: touched.terms && errors.terms
                      ? colors.danger
                      : acceptedTerms
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.termsText, { color: colors.textMuted }]}>
                I agree to Klaso&apos;s{' '}
                <Text style={[styles.termsHighlight, { color: colors.primary }]}>Terms of Service</Text> and{' '}
                <Text style={[styles.termsHighlight, { color: colors.primary }]}>Privacy Policy</Text>.
              </Text>
            </Pressable>

            {!!errors.terms && (
              <View style={styles.inlineErrorRow}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={[styles.error, { color: colors.danger }]}>{errors.terms}</Text>
              </View>
            )}

            {!!errors.form && (
              <View style={[styles.bannerError, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={[styles.bannerErrorText, { color: colors.danger }]}>{errors.form}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                pressed && styles.pressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {selectedRole === 'tutor' ? 'Register as Tutor' : 'Create Student Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          {/* Bottom Login Link */}
          <View style={styles.bottomPrompt}>
            <Text style={[styles.promptText, { color: colors.textMuted }]}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.linkText, { color: colors.primary }]}> Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({
  label,
  error,
  isTouched,
  isValid,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onBlur,
  inputStyle,
  ...inputProps
}) {
  const { colors } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
          },
          isFocused && { borderColor: colors.primary },
          isTouched && error && { borderColor: colors.danger, backgroundColor: colors.dangerLight },
          isTouched && isValid && { borderColor: colors.primary },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={isTouched && error ? colors.danger : isFocused ? colors.primary : colors.textMuted}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...inputProps}
          style={[styles.input, { color: colors.text }, inputStyle]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false)
            if (onBlur) onBlur(e)
          }}
        />

        {isTouched && isValid && (
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.statusIcon} />
        )}

        {isTouched && error && (
          <Ionicons name="alert-circle" size={18} color={colors.danger} style={styles.statusIcon} />
        )}

        {rightIcon && (
          <Pressable accessibilityLabel="Toggle visibility" onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {isTouched && !!error && (
        <View style={styles.inlineErrorRow}>
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 },

  headingWrap: { marginBottom: 20, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },

  roleSectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    padding: 14,
    position: 'relative',
  },
  roleIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginBottom: 10,
    width: 42,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  roleSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  radioDot: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 18,
  },
  radioInner: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },

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
  statusIcon: { marginLeft: 6, marginRight: 4 },

  inlineErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  error: { fontSize: 12, fontWeight: '600' },

  bannerError: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  bannerErrorText: { flex: 1, fontSize: 13, fontWeight: '600' },

  tutorExtraBox: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  tutorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  tutorHeaderTitle: { fontSize: 14, fontWeight: '800' },
  subjectPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  subjectPill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  termsRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 6 },
  checkbox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  termsText: { flex: 1, fontSize: 12, lineHeight: 18 },
  termsHighlight: { fontWeight: '700' },

  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  promptText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
})
