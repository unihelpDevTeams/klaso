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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
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

      const isEmailAdmin = email.toLowerCase().includes('admin') || email.toLowerCase().endsWith('@klaso.edu')
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

      router.replace('/(tabs)')
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header showBack title="Create Account" subtitle="Join the Klaso Academy" containerStyle={styles.headerContainer} />

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
            <Text style={styles.title}>Start Your Learning Journey</Text>
            <Text style={styles.subtitle}>Choose your account type to personalize your experience.</Text>
          </View>

          {/* Account Role Selector */}
          <Text style={styles.roleSectionLabel}>Select Account Type</Text>
          <View style={styles.roleSelectorRow}>
            {/* Student Role Card */}
            <Pressable
              style={[styles.roleCard, selectedRole === 'student' && styles.roleCardActive]}
              onPress={() => setSelectedRole('student')}
            >
              <View style={[styles.roleIconBox, selectedRole === 'student' && styles.roleIconBoxActive]}>
                <Ionicons
                  name="school"
                  size={24}
                  color={selectedRole === 'student' ? '#15803D' : '#718178'}
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'student' && styles.roleTitleActive]}>
                Student
              </Text>
              <Text style={styles.roleSub}>Learn, practice & book tutors</Text>
              <View style={[styles.radioDot, selectedRole === 'student' && styles.radioDotActive]}>
                {selectedRole === 'student' && <View style={styles.radioInner} />}
              </View>
            </Pressable>

            {/* Tutor Role Card */}
            <Pressable
              style={[styles.roleCard, selectedRole === 'tutor' && styles.roleCardActive]}
              onPress={() => setSelectedRole('tutor')}
            >
              <View style={[styles.roleIconBox, selectedRole === 'tutor' && styles.roleIconBoxActive]}>
                <Ionicons
                  name="easel"
                  size={24}
                  color={selectedRole === 'tutor' ? '#15803D' : '#718178'}
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'tutor' && styles.roleTitleActive]}>
                Tutor
              </Text>
              <Text style={styles.roleSub}>Teach, mentor & earn income</Text>
              <View style={[styles.radioDot, selectedRole === 'tutor' && styles.radioDotActive]}>
                {selectedRole === 'tutor' && <View style={styles.radioInner} />}
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
              <View style={styles.tutorExtraBox}>
                <View style={styles.tutorHeader}>
                  <Ionicons name="sparkles" size={16} color="#15803D" />
                  <Text style={styles.tutorHeaderTitle}>Tutor Teaching Profile</Text>
                </View>

                {/* Subject Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Primary Teaching Subject</Text>
                  <View style={styles.subjectPillsRow}>
                    {SUBJECTS.map((sub) => {
                      const isSubSelected = form.subject === sub
                      return (
                        <Pressable
                          key={sub}
                          style={[styles.subjectPill, isSubSelected && styles.subjectPillActive]}
                          onPress={() => updateField('subject', sub)}
                        >
                          <Text
                            style={[
                              styles.subjectPillText,
                              isSubSelected && styles.subjectPillTextActive,
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
                <Text style={styles.label}>Primary Target Exam / Learning Goal</Text>
                <View style={styles.subjectPillsRow}>
                  {['WAEC / WASSCE', 'JAMB / UTME', 'University Courses', 'General Skills'].map((exam) => {
                    const isExamSelected = form.targetExam === exam
                    return (
                      <Pressable
                        key={exam}
                        style={[styles.subjectPill, isExamSelected && styles.subjectPillActive]}
                        onPress={() => updateField('targetExam', exam)}
                      >
                        <Text
                          style={[
                            styles.subjectPillText,
                            isExamSelected && styles.subjectPillTextActive,
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
                  acceptedTerms && styles.checkboxChecked,
                  touched.terms && errors.terms && styles.checkboxError,
                ]}
              >
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                I agree to Klaso&apos;s{' '}
                <Text style={styles.termsHighlight}>Terms of Service</Text> and{' '}
                <Text style={styles.termsHighlight}>Privacy Policy</Text>.
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

            {/* Submit Button */}
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
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
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.inputFocused,
          isTouched && error && styles.inputError,
          isTouched && isValid && styles.inputSuccess,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={isTouched && error ? '#EF4444' : isFocused ? '#15803D' : '#8A9B8E'}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...inputProps}
          style={[styles.input, inputStyle]}
          placeholderTextColor="#8A9B8E"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false)
            if (onBlur) onBlur(e)
          }}
        />

        {isTouched && isValid && (
          <Ionicons name="checkmark-circle" size={18} color="#15803D" style={styles.statusIcon} />
        )}

        {isTouched && error && (
          <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.statusIcon} />
        )}

        {rightIcon && (
          <Pressable accessibilityLabel="Toggle visibility" onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={18} color="#718178" />
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
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  headerContainer: { backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 },

  headingWrap: { marginBottom: 20, marginTop: 8 },
  title: { color: '#14351D', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: '#718178', fontSize: 14, marginTop: 4, lineHeight: 20 },

  roleSectionLabel: {
    color: '#14351D',
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
    backgroundColor: '#F5FAF5',
    borderColor: '#DFE7E1',
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    padding: 14,
    position: 'relative',
  },
  roleCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#15803D',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  roleIconBox: {
    alignItems: 'center',
    backgroundColor: '#E8EFEA',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginBottom: 10,
    width: 42,
  },
  roleIconBoxActive: {
    backgroundColor: '#DCFCE7',
  },
  roleTitle: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
  },
  roleTitleActive: {
    color: '#15803D',
  },
  roleSub: {
    color: '#718178',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  radioDot: {
    alignItems: 'center',
    borderColor: '#CDE4D4',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 18,
  },
  radioDotActive: {
    borderColor: '#15803D',
  },
  radioInner: {
    backgroundColor: '#15803D',
    borderRadius: 5,
    height: 10,
    width: 10,
  },

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
  inputFocused: { borderColor: '#15803D', backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputSuccess: { borderColor: '#15803D' },

  input: { color: '#14351D', flex: 1, fontSize: 14, paddingVertical: 12 },
  leftIcon: { marginRight: 10 },
  statusIcon: { marginLeft: 6, marginRight: 4 },

  inlineErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  error: { color: '#EF4444', fontSize: 12, fontWeight: '600' },

  bannerError: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  bannerErrorText: { color: '#991B1B', flex: 1, fontSize: 13, fontWeight: '600' },

  tutorExtraBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
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
  tutorHeaderTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
  },
  subjectPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  subjectPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFE7E1',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  subjectPillActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  subjectPillText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  subjectPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  termsRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 6 },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxChecked: { backgroundColor: '#15803D', borderColor: '#15803D' },
  checkboxError: { borderColor: '#EF4444' },
  termsText: { color: '#718178', flex: 1, fontSize: 12, lineHeight: 18 },
  termsHighlight: { color: '#15803D', fontWeight: '700' },

  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  promptText: { color: '#718178', fontSize: 14 },
  linkText: { color: '#15803D', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
})
