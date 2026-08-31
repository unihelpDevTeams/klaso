import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth } from '../../firebase/config'

const accountItems = [
  { label: 'Edit profile', icon: 'person-circle-outline' },
  { label: 'Saved lessons', icon: 'bookmark-outline' },
  { label: 'Notifications', icon: 'notifications-outline' },
  { label: 'Help & support', icon: 'help-circle-outline' },
]

export default function Profile() {
  const router = useRouter()
  const userName = auth.currentUser?.displayName || 'Student learner'
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SL'

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showBack={false} title="Profile" subtitle="Your learning account" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.email}>{auth.currentUser?.email || 'student@klaso.app'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/become-tutor')}>
          <Ionicons name="school-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Become a tutor</Text>
        </Pressable>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          {accountItems.map((item) => (
            <Pressable key={item.label} style={styles.listItem}>
              <View style={styles.listLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={18} color="#57a0ff" />
                </View>
                <Text style={styles.listText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#718178" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  content: { paddingHorizontal: 18, paddingBottom: 30, paddingTop: 16 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#E8F4EB',
    borderRadius: 20,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: { color: '#14351D', fontSize: 24, fontWeight: '800' },
  userInfo: { flex: 1 },
  greeting: { color: '#14351D', fontSize: 22, fontWeight: '800' },
  email: { color: '#718178', fontSize: 13, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flex: 1,
    paddingVertical: 16,
  },
  statValue: { color: '#14351D', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#718178', fontSize: 12, marginTop: 4 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#57a0ff',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginTop: 20,
    padding: 16,
  },
  sectionTitle: { color: '#14351D', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  listItem: {
    alignItems: 'center',
    borderColor: '#EDEFEF',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  listLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  listText: { color: '#14351D', fontSize: 15, fontWeight: '600' },
})