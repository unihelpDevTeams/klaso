import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { db } from '../firebase/config'

export default function AdminPanel() {
  const router = useRouter()
  const [pendingTutors, setPendingTutors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPendingTutors = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'tutor'))
        const snapshot = await getDocs(q)
        const list = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((user) => user.approved !== true)

        setPendingTutors(list)
      } catch (error) {
        console.log('Failed to load pending tutors', error)
      } finally {
        setLoading(false)
      }
    }

    loadPendingTutors()
  }, [])

  const approveTutor = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        approved: true,
        approvedAt: new Date(),
      })

      setPendingTutors((current) => current.filter((user) => user.id !== userId))
    } catch (error) {
      console.log('Failed to approve tutor', error)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#14351D" />
        </Pressable>
        <Text style={styles.headerTitle}>Admin panel</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending tutor approvals</Text>
          <Text style={styles.summaryValue}>{pendingTutors.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#57a0ff" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : pendingTutors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="shield-checkmark-outline" size={34} color="#57a0ff" />
            <Text style={styles.emptyTitle}>No pending tutor requests</Text>
            <Text style={styles.emptyText}>New tutor applications will appear here for review.</Text>
          </View>
        ) : (
          pendingTutors.map((user) => (
            <View key={user.id} style={styles.card}>
              <View style={styles.userRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user.displayName || 'T').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.name}>{user.displayName || 'Tutor applicant'}</Text>
                  <Text style={styles.email}>{user.email || 'No email'}</Text>
                </View>
              </View>

              <Text style={styles.subject}>{user.subject || 'Subject not provided'}</Text>
              <Text style={styles.bio}>{user.bio || 'No bio provided yet.'}</Text>

              <Pressable style={styles.approveButton} onPress={() => approveTutor(user.id)}>
                <Text style={styles.approveText}>Approve tutor</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  headerRow: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { color: '#14351D', fontSize: 20, fontWeight: '800' },
  placeholder: { width: 40 },
  container: { padding: 18, paddingBottom: 40 },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 18,
    padding: 18,
  },
  summaryLabel: { color: '#718178', fontSize: 12, textTransform: 'uppercase' },
  summaryValue: { color: '#14351D', fontSize: 30, fontWeight: '800', marginTop: 6 },
  loadingWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  loadingText: { color: '#718178', fontSize: 14, marginTop: 12 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  emptyTitle: { color: '#14351D', fontSize: 18, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#718178', fontSize: 14, marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    padding: 16,
  },
  userRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: { color: '#14351D', fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1 },
  name: { color: '#14351D', fontSize: 17, fontWeight: '800' },
  email: { color: '#718178', fontSize: 12, marginTop: 2 },
  subject: { color: '#57a0ff', fontSize: 13, fontWeight: '700', marginTop: 14 },
  bio: { color: '#5D6D61', fontSize: 14, lineHeight: 20, marginTop: 8 },
  approveButton: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 12,
  },
  approveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
})
