import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import React, { forwardRef, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import { verifyAdminAccess } from '../../firebase/adminAccess'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTHER = 'Other'

const SUBJECTS = [
  'Mathematics',
  'Science (Biology/Chemistry/Physics)',
  'Languages (English & Literature)',
  'Computer Science & Coding',
  'Economics & Business',
  'General Academics',
]

const TARGET_EXAMS = [
  'WAEC / WASSCE',
  'NECO',
  'JAMB / UTME',
  'Post-UTME',
  'University courses',
  'IELTS / TOEFL',
  'Professional certification',
  'General skills',
]

const ROLE_COPY = {
  student: 'Learn, practise and book sessions with tutors.',
  tutor: 'Teach, mentor and earn. Your profile is reviewed before it goes live.',
}

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  subject: '',
  subjectOther: '',
  qualification: '',
  hourlyRate: '',
  bio: '',
  targetExam: '',
  targetExamOther: '',
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  if (password.length < 8) score = Math.min(score, 1)
  return { score, label: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score] }
}

function resolveChoice(choice, other) {
  return choice === OTHER ? other.trim() : choice
}

function validateForm(form, role, acceptedTerms) {
  const e = {}
  const email = form.email.trim()

  if (!form.name.trim()) e.name = 'Enter your full name.'
  else if (form.name.trim().length < 2) e.name = 'Name is too short.'

  if (!email) e.email = 'Enter your email address.'
  else if (!emailPattern.test(email)) e.email = 'Enter a valid email address.'

  if (!form.password) e.password = 'Create a password.'
  else if (form.password.length < 8) e.password = 'Use at least 8 characters.'

  if (!form.confirmPassword) e.confirmPassword = 'Re-enter your password.'
  else if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.'

  if (role === 'tutor') {
    if (!form.subject) e.subject = 'Select your main subject.'
    else if (form.subject === OTHER && !form.subjectOther.trim()) {
      e.subjectOther = 'Tell us which subject you teach.'
    }

    if (!form.qualification.trim()) e.qualification = 'Enter your highest qualification.'

    const rate = Number(form.hourlyRate)
    if (!form.hourlyRate) e.hourlyRate = 'Enter your hourly rate.'
    else if (!Number.isFinite(rate) || rate <= 0) e.hourlyRate = 'Enter a valid amount.'

    if (!form.bio.trim()) e.bio = 'Add a short teaching bio.'
    else if (form.bio.trim().length < 30) e.bio = 'Write at least 30 characters.'
  } else {
    if (!form.targetExam) e.targetExam = 'Select what you are preparing for.'
    else if (form.targetExam === OTHER && !form.targetExamOther.trim()) {
      e.targetExamOther = 'Tell us what you are preparing for.'
    }
  }

  if (!acceptedTerms) e.terms = 'Accept the terms to continue.'
  return e
}

function mapAuthError(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.'
    case 'auth/invalid-email':
      return 'That email address is not valid.'
    case 'auth/weak-password':
      return 'Choose a stronger password with letters, numbers and symbols.'
    case 'auth/network-request-failed':
      return 'No internet connection. Check your network and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    default:
      return 'We couldn’t create your account. Please try again.'
  }
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function SignUp() {
  const { colors, isDark } = useTheme()
  const [role, setRole] = useState('student')
  const [form, setForm] = useState(INITIAL_FORM)
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const emailRef = useRef(null)
  const rateRef = useRef(null)
  const bioRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)

  const errors = useMemo(() => validateForm(form, role, acceptedTerms), [form, role, acceptedTerms])
  const strength = useMemo(() => getPasswordStrength(form.password), [form.password])

  const isTutor = role === 'tutor'
  const showError = (field) => (touched[field] || submitAttempted) && errors[field]

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (formError) setFormError('')
  }

  function touch(field) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }))
  }

  async function handleSubmit() {
    if (loading) return
    setSubmitAttempted(true)

    if (Object.keys(errors).length > 0) {
      setFormError('Some details are missing or incorrect. Check the highlighted fields.')
      return
    }

    setLoading(true)
    setFormError('')
    let credential = null

    try {
      const email = form.email.trim().toLowerCase()
      const displayName = form.name.trim()

      credential = await createUserWithEmailAndPassword(auth, email, form.password)
      await updateProfile(credential.user, { displayName })

      let isEmailAdmin = false
      try {
        const adminVerification = await verifyAdminAccess(credential.user)
        isEmailAdmin = adminVerification.isAdmin
      } catch (verificationError) {
        console.error('Unable to verify configured admin access:', verificationError)
      }

      const resolvedRole = isEmailAdmin ? 'admin' : role

      const userData = {
        uid: credential.user.uid,
        displayName,
        email: credential.user.email,
        role: resolvedRole,
        admin: isEmailAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      if (isTutor) {
        userData.subject = resolveChoice(form.subject, form.subjectOther)
        userData.qualification = form.qualification.trim()
        userData.hourlyRate = Number(form.hourlyRate)
        userData.bio = form.bio.trim()
        userData.approved = isEmailAdmin // tutors need admin review unless the account is an admin
        userData.reviewsCount = 0
      } else {
        userData.targetExam = resolveChoice(form.targetExam, form.targetExamOther)
        userData.enrolledCount = 0
        userData.certificatesCount = 0
      }

      try {
        await setDoc(doc(db, 'users', credential.user.uid), userData)
      } catch (writeError) {
        // Avoid leaving an auth account without a profile document.
        await credential.user.delete().catch(() => {})
        throw writeError
      }

      let verificationEmailFailed = false
      try {
        await sendEmailVerification(credential.user)
      } catch (verificationError) {
        console.error('Unable to send email verification:', verificationError)
        verificationEmailFailed = true
      }

      router.replace({
        pathname: '/(auth)/verify-email',
        params: {
          email: credential.user.email || email,
          resendRequired: verificationEmailFailed ? 'true' : 'false',
        },
      })
    } catch (error) {
      console.log('Sign up error:', error)
      setFormError(mapAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header
        showBack
        title="Create account"
        subtitle="Join Klaso Academy"
        containerStyle={{ backgroundColor: colors.surface }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {/* Role selector */}
          <View style={[styles.segment, { backgroundColor: colors.borderSubtle }]}>
            {[
              { key: 'student', label: 'Student', icon: 'school-outline' },
              { key: 'tutor', label: 'Tutor', icon: 'easel-outline' },
            ].map((item) => {
              const active = role === item.key
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setRole(item.key)
                    setFormError('')
                  }}
                  style={[
                    styles.segmentItem,
                    active && {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? colors.text : colors.textMuted },
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={[styles.roleCaption, { color: colors.textMuted }]}>{ROLE_COPY[role]}</Text>

          {/* Account details */}
          <Section title="Your details" colors={colors}>
            <Field
              label="Full name"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              onBlur={() => touch('name')}
              placeholder="Chiamaka Okafor"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
              error={showError('name')}
              leftIcon="person-outline"
            />

            <Field
              ref={emailRef}
              label="Email address"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              onBlur={() => touch('email')}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              error={showError('email')}
              leftIcon="mail-outline"
            />
          </Section>

          {/* Role specific */}
          {isTutor ? (
            <Section title="Teaching profile" colors={colors}>
              <SelectField
                label="Main subject"
                placeholder="Select a subject"
                sheetTitle="Main subject"
                options={SUBJECTS}
                value={form.subject}
                onSelect={(v) => updateField('subject', v)}
                onTouched={() => touch('subject')}
                error={showError('subject')}
                leftIcon="book-outline"
                otherLabel="Your subject"
                otherPlaceholder="e.g. Further Mathematics"
                otherValue={form.subjectOther}
                onChangeOther={(v) => updateField('subjectOther', v)}
                onOtherBlur={() => touch('subjectOther')}
                otherError={showError('subjectOther')}
              />

              <Field
                label="Highest qualification"
                value={form.qualification}
                onChangeText={(v) => updateField('qualification', v)}
                onBlur={() => touch('qualification')}
                placeholder="B.Sc. Mathematics, University of Lagos"
                autoCapitalize="sentences"
                returnKeyType="next"
                onSubmitEditing={() => rateRef.current?.focus()}
                blurOnSubmit={false}
                error={showError('qualification')}
                leftIcon="ribbon-outline"
              />

              <Field
                ref={rateRef}
                label="Hourly rate"
                value={form.hourlyRate}
                onChangeText={(v) => updateField('hourlyRate', v.replace(/[^0-9]/g, ''))}
                onBlur={() => touch('hourlyRate')}
                placeholder="3500"
                keyboardType="number-pad"
                maxLength={7}
                prefix="₦"
                error={showError('hourlyRate')}
              />

              <Field
                ref={bioRef}
                label="Teaching bio"
                value={form.bio}
                onChangeText={(v) => updateField('bio', v)}
                onBlur={() => touch('bio')}
                placeholder="Your teaching approach, the exams you prepare students for, and results you've helped them achieve."
                multiline
                maxLength={400}
                autoCapitalize="sentences"
                error={showError('bio')}
                inputStyle={styles.bioInput}
                counter={`${form.bio.trim().length}/400`}
                alignTop
              />
            </Section>
          ) : (
            <Section title="Your learning goal" colors={colors}>
              <SelectField
                label="I'm preparing for"
                placeholder="Select an exam or goal"
                sheetTitle="What are you preparing for?"
                options={TARGET_EXAMS}
                value={form.targetExam}
                onSelect={(v) => updateField('targetExam', v)}
                onTouched={() => touch('targetExam')}
                error={showError('targetExam')}
                leftIcon="flag-outline"
                otherLabel="Your goal"
                otherPlaceholder="e.g. SAT, ICAN, Cambridge A-Levels"
                otherValue={form.targetExamOther}
                onChangeOther={(v) => updateField('targetExamOther', v)}
                onOtherBlur={() => touch('targetExamOther')}
                otherError={showError('targetExamOther')}
              />
            </Section>
          )}

          {/* Security */}
          <Section title="Security" colors={colors}>
            <View style={styles.fieldStack}>
              <Field
                ref={passwordRef}
                label="Password"
                value={form.password}
                onChangeText={(v) => updateField('password', v)}
                onBlur={() => touch('password')}
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
                error={showError('password')}
                leftIcon="lock-closed-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                rightLabel={showPassword ? 'Hide password' : 'Show password'}
                onRightIconPress={() => setShowPassword((v) => !v)}
              />
              {form.password.length > 0 && <StrengthMeter strength={strength} colors={colors} />}
            </View>

            <Field
              ref={confirmRef}
              label="Confirm password"
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              onBlur={() => touch('confirmPassword')}
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              error={showError('confirmPassword')}
              leftIcon="lock-closed-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              rightLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
              onRightIconPress={() => setShowConfirmPassword((v) => !v)}
            />
          </Section>

          {/* Terms */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            onPress={() => {
              setAcceptedTerms((v) => !v)
              touch('terms')
              if (formError) setFormError('')
            }}
            style={styles.termsRow}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: acceptedTerms ? colors.primary : colors.card,
                  borderColor: showError('terms')
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
              I agree to the{' '}
              {/* Hook these up with Linking.openURL once the pages are live. */}
              <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text> and{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>.
            </Text>
          </Pressable>
          {!!showError('terms') && (
            <Text style={[styles.errorText, styles.termsError, { color: colors.danger }]}>
              {errors.terms}
            </Text>
          )}

          {!!formError && (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.banner, { backgroundColor: colors.dangerLight }]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.bannerText, { color: colors.danger }]}>{formError}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isTutor ? 'Create tutor account' : 'Create student account'}
              </Text>
            )}
          </Pressable>

          <View style={styles.bottomPrompt}>
            <Text style={[styles.promptText, { color: colors.textMuted }]}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
              <Text style={[styles.linkText, { color: colors.primary }]}> Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Section({ title, colors, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

const Field = forwardRef(function Field(
  {
    label,
    error,
    leftIcon,
    rightIcon,
    rightLabel,
    onRightIconPress,
    prefix,
    counter,
    alignTop,
    onBlur,
    inputStyle,
    ...inputProps
  },
  ref
) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const hasError = !!error

  const borderColor = hasError ? colors.danger : focused ? colors.primary : colors.border
  const iconColor = hasError ? colors.danger : focused ? colors.primary : colors.textMuted

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.inputBg, borderColor },
          alignTop && styles.inputWrapTop,
        ]}
      >
        {!!leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={iconColor}
            style={[styles.leftIcon, alignTop && styles.leftIconTop]}
          />
        )}
        {!!prefix && <Text style={[styles.prefix, { color: colors.textSecondary }]}>{prefix}</Text>}

        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          style={[styles.input, { color: colors.text }, inputStyle]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />

        {!!rightIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightLabel || 'Toggle visibility'}
            onPress={onRightIconPress}
            hitSlop={10}
          >
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {(hasError || !!counter) && (
        <View style={styles.helperRow}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.errorText, { color: colors.danger, flex: 1 }]}
          >
            {hasError ? error : ''}
          </Text>
          {!!counter && <Text style={[styles.counter, { color: colors.textMuted }]}>{counter}</Text>}
        </View>
      )}
    </View>
  )
})

/**
 * Dropdown (bottom sheet) with an automatic "Other" option.
 * Choosing "Other" reveals a text input directly beneath the dropdown.
 */
function SelectField({
  label,
  placeholder,
  sheetTitle,
  options,
  value,
  onSelect,
  onTouched,
  error,
  leftIcon,
  otherLabel,
  otherPlaceholder,
  otherValue,
  onChangeOther,
  onOtherBlur,
  otherError,
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const allOptions = useMemo(() => [...options, OTHER], [options])
  const hasError = !!error

  function close() {
    setOpen(false)
    onTouched?.()
  }

  function choose(option) {
    onSelect(option)
    close()
  }

  return (
    <View style={styles.fieldStack}>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${value || placeholder}`}
          onPress={() => setOpen(true)}
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.inputBg,
              borderColor: hasError ? colors.danger : open ? colors.primary : colors.border,
            },
          ]}
        >
          {!!leftIcon && (
            <Ionicons
              name={leftIcon}
              size={18}
              color={hasError ? colors.danger : colors.textMuted}
              style={styles.leftIcon}
            />
          )}
          <Text
            numberOfLines={1}
            style={[styles.selectValue, { color: value ? colors.text : colors.textMuted }]}
          >
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
        {hasError && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
      </View>

      {value === OTHER && (
        <Field
          label={otherLabel}
          value={otherValue}
          onChangeText={onChangeOther}
          onBlur={onOtherBlur}
          placeholder={otherPlaceholder}
          autoCapitalize="sentences"
          autoFocus
          maxLength={60}
          error={otherError}
          leftIcon="create-outline"
        />
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{sheetTitle || label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <FlatList
              data={allOptions}
              keyExtractor={(item) => item}
              bounces={false}
              style={styles.sheetList}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />
              )}
              renderItem={({ item }) => {
                const selected = item === value
                return (
                  <Pressable
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    onPress={() => choose(item)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && { backgroundColor: colors.primaryLight },
                      pressed && !selected && { backgroundColor: colors.borderSubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: selected ? colors.primary : colors.text },
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item === OTHER ? 'Other (type your own)' : item}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

function StrengthMeter({ strength, colors }) {
  const color = strength.score <= 1 ? colors.danger : strength.score === 2 ? '#D97706' : colors.primary
  return (
    <View style={styles.strengthRow}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.strengthBar,
              { backgroundColor: step <= strength.score ? color : colors.borderSubtle },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{strength.label}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  // Role segmented control
  segment: {
    borderRadius: 12,
    flexDirection: 'row',
    padding: 4,
  },
  segmentItem: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    justifyContent: 'center',
  },
  segmentText: { fontSize: 15, fontWeight: '500' },
  segmentTextActive: { fontWeight: '700' },
  roleCaption: { fontSize: 13, lineHeight: 19, marginTop: 10 },

  // Sections
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionBody: { gap: 16, marginTop: 14 },

  // Fields
  fieldStack: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputWrapTop: { alignItems: 'flex-start' },
  leftIcon: { marginRight: 10 },
  leftIconTop: { marginTop: 15 },
  prefix: { fontSize: 15, fontWeight: '600', marginRight: 6 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  bioInput: { height: 110, paddingTop: 13, textAlignVertical: 'top' },
  selectValue: { flex: 1, fontSize: 15, paddingVertical: 12 },
  helperRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  errorText: { fontSize: 12, lineHeight: 16 },
  counter: { fontSize: 12, lineHeight: 16 },

  // Password strength
  strengthRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: -6 },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar: { borderRadius: 2, flex: 1, height: 4 },
  strengthLabel: { fontSize: 12, fontWeight: '600', minWidth: 52, textAlign: 'right' },

  // Terms
  termsRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 28 },
  checkbox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
  termsLink: { fontWeight: '600' },
  termsError: { marginLeft: 34, marginTop: 6 },

  // Banner
  banner: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    padding: 12,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // Primary action
  primaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  pressed: { opacity: 0.88 },

  bottomPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  promptText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '700' },

  // Bottom sheet
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingTop: 8,
  },
  sheetHandle: { alignSelf: 'center', borderRadius: 2, height: 4, marginBottom: 8, width: 36 },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetList: { flexGrow: 0 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  optionText: { flex: 1, fontSize: 15, paddingRight: 12 },
  optionTextSelected: { fontWeight: '700' },
})