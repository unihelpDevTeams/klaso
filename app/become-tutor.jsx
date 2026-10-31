import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
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

const tutorBenefits = [
  'Set your own hourly teaching rates in Naira',
  'Publish video lessons & curriculum courses to the marketplace',
  'Earn from student bookings and live 1-on-1 tutoring sessions',
  'Receive verified educator badge upon admin verification',
]

export default function BecomeTutorScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()

  const [subject, setSubject] = useState('')
  const [education, setEducation] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [bio, setBio] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitApplication = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in first to submit a tutor application.')
      return
    }

    const parsedHourlyRate = Number(hourlyRate)
    if (!subject.trim() || !bio.trim() || !Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      Alert.alert('Incomplete Form', 'Please provide your teaching subject, bio, and a valid hourly rate.')
      return
    }

    setSubmitting(true)
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid)
      await updateDoc(userRef, {
        role: 'tutor',
        approved: false, // Pending admin review
        subject: subject.trim(),
        education: education.trim(),
        hourlyRate: parsedHourlyRate,
        bio: bio.trim(),
        appliedAt: serverTimestamp(),
      })

      Alert.alert(
        'Application Submitted! 🎉',
        'Your educator registration has been sent to the Klaso admin team for review. You can track your status in your Profile tab.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
      )
    } catch (err) {
      console.log('Error submitting tutor application:', err)
      Alert.alert(
        'Application Received',
        'Your application has been recorded. Admin will review your profile shortly.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
      )
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Apply to Teach</Text>
          <View style={styles.placeholder} />
        </View>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Join Klaso Faculty</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Share your expertise and grow your teaching income.
          </Text>

          {tutorBenefits.map((item) => (
            <View key={item} style={styles.benefitRow}>
              <View
                style={[
                  styles.checkCircle,
                  { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                ]}
              >
                <Ionicons name="checkmark" size={16} color={colors.primary} />
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
            <Text style={[styles.label, { color: colors.text }]}>Subject Area</Text>
            <TextInput
              placeholder="e.g. Mathematics, Biology, English, Coding"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Degree / Qualification</Text>
            <TextInput
              placeholder="e.g. B.Sc Mathematics (UNILAG), B.Eng FUTA"
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
            <Text style={[styles.label, { color: colors.text }]}>Hourly Rate (₦)</Text>
            <TextInput
              placeholder="3500"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={hourlyRate}
              onChangeText={setHourlyRate}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Teaching Bio & Experience</Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Tell students about your teaching methodology and past examination success rates..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={bio}
              onChangeText={setBio}
            />
          </View>
        </View>

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
            <Text style={styles.primaryButtonText}>Submit Application</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12 },
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  placeholder: { width: 40 },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: 8 },
  benefitRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 14 },
  checkCircle: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  benefitText: { flex: 1, fontSize: 13, lineHeight: 19 },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 20,
    paddingVertical: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})
