import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'

const applicationSteps = [
  'Complete your teaching profile',
  'Submit it for administrator review',
  'Once approved, appear in tutor discovery',
]

export default function BecomeTutorScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()

  const [subject, setSubject] = useState('')
  const [education, setEducation] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [bio, setBio] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  const handleSubmitApplication = async () => {
    if (!auth.currentUser) {
      setSubmitError('Sign in before submitting your tutor application.')
      return
    }

    const parsedHourlyRate = Number(hourlyRate)
    const nextErrors = {
      subject: subject.trim() ? '' : 'Enter the subject you teach.',
      hourlyRate: Number.isFinite(parsedHourlyRate) && parsedHourlyRate > 0 ? '' : 'Enter a valid hourly rate.',
      bio: bio.trim().length >= 20 ? '' : 'Write at least 20 characters about your teaching experience.',
    }
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    setSubmitting(true)
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid)
      const profileSnapshot = await getDoc(userRef)
      if (!profileSnapshot.exists()) {
        throw new Error('Your account profile could not be found. Sign out and sign in again, then retry.')
      }

      const existingProfile = profileSnapshot.data()
      if (existingProfile.role === 'tutor') {
        Alert.alert(
          'Application Already Submitted',
          existingProfile.approved ? 'Your tutor profile is already active.' : 'Your application is already under review.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
        )
        return
      }
      if (existingProfile.role && existingProfile.role !== 'student') {
        throw new Error('Only student accounts can submit a tutor application.')
      }

      await updateDoc(userRef, {
        role: 'tutor',
        approved: false,
        subject: subject.trim(),
        education: education.trim(),
        hourlyRate: parsedHourlyRate,
        bio: bio.trim(),
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      Alert.alert(
        'Application submitted',
        'Your profile is now awaiting administrator review. You can check its status on your profile.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
      )
    } catch (err) {
      console.log('Error submitting tutor application:', err)
      setSubmitError(err.message || 'Unable to submit your application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: isDark ? '#1C2920' : '#FFFFFF', borderColor: colors.border },
            ]}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tutor application</Text>
          <View style={styles.placeholder} />
        </View>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Teach on Klaso</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Share what you know.
          </Text>
          <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>
            Create a tutor profile for review. Approved tutors can be discovered by learners.
          </Text>

          {applicationSteps.map((item, index) => (
            <View key={item} style={styles.benefitRow}>
              <View
                style={[
                  styles.checkCircle,
                  { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                ]}
              >
                <Text style={[styles.stepNumber, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.formCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Teaching Credentials
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Main subject</Text>
            <TextInput
              placeholder="For example, Mathematics or Biology"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.subject ? colors.danger : colors.border,
                  color: colors.text,
                },
              ]}
              value={subject}
              onChangeText={(value) => {
                setSubject(value)
                setErrors((current) => ({ ...current, subject: '' }))
              }}
            />
            {errors.subject ? <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.subject}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Qualification <Text style={{ color: colors.textMuted, fontWeight: '400' }}>Optional</Text></Text>
            <TextInput
              placeholder="Degree, certification, or institution"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={education}
              onChangeText={setEducation}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Hourly rate (₦)</Text>
            <TextInput
              placeholder="Enter your rate"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.hourlyRate ? colors.danger : colors.border,
                  color: colors.text,
                },
              ]}
              value={hourlyRate}
              onChangeText={(value) => {
                setHourlyRate(value)
                setErrors((current) => ({ ...current, hourlyRate: '' }))
              }}
            />
            {errors.hourlyRate ? <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.hourlyRate}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Teaching experience</Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Describe your teaching approach and relevant experience."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.bio ? colors.danger : colors.border,
                  color: colors.text,
                },
              ]}
              value={bio}
              onChangeText={(value) => {
                setBio(value)
                setErrors((current) => ({ ...current, bio: '' }))
              }}
            />
            {errors.bio ? <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.bio}</Text> : null}
          </View>
        </View>

        {submitError ? (
          <View style={[styles.errorNotice, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={[styles.errorNoticeText, { color: colors.danger }]}>{submitError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary },
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmitApplication}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Submit application</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 40, paddingTop: 12 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  placeholder: { width: 40 },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 23, fontWeight: '800', lineHeight: 29, marginTop: 8 },
  heroDescription: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  benefitRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 13 },
  checkCircle: {
    alignItems: 'center',
    borderRadius: 10,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  stepNumber: { fontSize: 11, fontWeight: '800' },
  benefitText: { flex: 1, fontSize: 12, lineHeight: 18 },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 112, textAlignVertical: 'top' },
  fieldError: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  errorNotice: { alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 14, padding: 12 },
  errorNoticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 20,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})
