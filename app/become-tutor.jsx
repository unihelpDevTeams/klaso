import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const tutorBenefits = [
  'Set your own teaching schedule',
  'Earn from live sessions and lessons',
  'Grow your profile with verified expertise',
]

export default function BecomeTutorScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#14351D" />
          </Pressable>
          <Text style={styles.headerTitle}>Tutor signup</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Teach on Klaso</Text>
          <Text style={styles.title}>Share your expertise and grow your teaching income.</Text>

          {tutorBenefits.map((item) => (
            <View key={item} style={styles.benefitRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={16} color="#57a0ff" />
              </View>
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Profile details</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput placeholder="Enter your full name" placeholderTextColor="#8A9B8E" style={styles.input} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Subject expertise</Text>
            <TextInput placeholder="Math, Biology, English..." placeholderTextColor="#8A9B8E" style={styles.input} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Tell students about your teaching background"
              placeholderTextColor="#8A9B8E"
              style={[styles.input, styles.textArea]}
            />
          </View>
        </View>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Submit application</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  container: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 24, paddingTop: 12 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { color: '#14351D', fontSize: 18, fontWeight: '800' },
  placeholder: { width: 40 },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  eyebrow: { color: '#57a0ff', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: '#14351D', fontSize: 28, fontWeight: '800', lineHeight: 34, marginTop: 12 },
  benefitRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 18 },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  benefitText: { color: '#294734', flex: 1, fontSize: 15, lineHeight: 22 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginTop: 22,
    padding: 18,
  },
  sectionTitle: { color: '#14351D', fontSize: 18, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 16 },
  label: { color: '#14351D', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#F5F7F5',
    borderColor: '#E6ECE7',
    borderRadius: 12,
    borderWidth: 1,
    color: '#14351D',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderRadius: 16,
    marginTop: 20,
    paddingVertical: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
})
