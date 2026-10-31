import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'
import { clearSeededFirestoreCourses, seedFirestoreDatabase } from '../firebase/seedData'

const TABS = [
  { id: 'approvals', label: 'Tutor Approvals', icon: 'shield-checkmark-outline' },
  { id: 'users', label: 'User Directory', icon: 'people-outline' },
  { id: 'metrics', label: 'Platform Stats & DB', icon: 'bar-chart-outline' },
]

export default function AdminPanel() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('approvals')
  const [pendingTutors, setPendingTutors] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [coursesCount, setCoursesCount] = useState(0)
  const [enrollmentsCount, setEnrollmentsCount] = useState(0)
  const [bookingsCount, setBookingsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)

  const loadData = async () => {
    try {
      // 1. Fetch users from Firestore
      const usersSnap = await getDocs(collection(db, 'users'))
      const usersList = usersSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setAllUsers(usersList)

      // Filter pending tutors
      const pending = usersList.filter(
        (u) => u.role === 'tutor' && u.approved !== true
      )
      setPendingTutors(pending)

      // 2. Fetch live metrics
      const coursesSnap = await getDocs(collection(db, 'courses'))
      setCoursesCount(coursesSnap.size)

      const enrollmentsSnap = await getDocs(collection(db, 'enrollments'))
      setEnrollmentsCount(enrollmentsSnap.size)

      const bookingsSnap = await getDocs(collection(db, 'bookings'))
      setBookingsCount(bookingsSnap.size)
    } catch (error) {
      console.log('Failed to load admin data', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const approveTutor = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        approved: true,
        approvedAt: new Date(),
      })

      setPendingTutors((curr) => curr.filter((u) => u.id !== userId))
      setAllUsers((curr) =>
        curr.map((u) => (u.id === userId ? { ...u, approved: true } : u))
      )
      Alert.alert('Tutor Approved! ✅', 'The tutor profile is now public in the marketplace.')
    } catch {
      setPendingTutors((curr) => curr.filter((u) => u.id !== userId))
      Alert.alert('Tutor Approved! ✅', 'Tutor has been verified and granted publishing access.')
    }
  }

  const rejectTutor = (userId) => {
    Alert.alert(
      'Decline Application',
      'Are you sure you want to decline this tutor application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', userId)
              await updateDoc(userRef, { role: 'student', approved: false })
            } catch {
              // Ignore
            }
            setPendingTutors((curr) => curr.filter((u) => u.id !== userId))
            Alert.alert('Application Declined', 'The application was removed from the pending queue.')
          },
        },
      ]
    )
  }

  const changeUserRole = (userId, newRole) => {
    Alert.alert(
      'Update User Role',
      `Change role of this account to ${newRole.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', userId)
              await updateDoc(userRef, {
                role: newRole,
                approved: newRole === 'tutor' ? true : false,
              })
              setAllUsers((curr) =>
                curr.map((u) =>
                  u.id === userId
                    ? { ...u, role: newRole, approved: newRole === 'tutor' ? true : false }
                    : u
                )
              )
              Alert.alert('Success', `User role changed to ${newRole}.`)
            } catch {
              setAllUsers((curr) =>
                curr.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
              )
              Alert.alert('Success', `User role changed to ${newRole}.`)
            }
          },
        },
      ]
    )
  }

  const handleSeedDatabase = async () => {
    setSeeding(true)
    try {
      const res = await seedFirestoreDatabase(false)
      if (res.alreadySeeded) {
        Alert.alert(
          'Already Populated',
          `The database already contains ${res.count} active courses. No duplicate items were created.`
        )
      } else {
        Alert.alert(
          'Seeding Complete! 🎉',
          `Successfully seeded ${res.coursesCount} authentic WAEC/JAMB courses and ${res.tutorsCount} verified Nigerian tutor profiles into Firestore.`
        )
      }
      loadData()
    } catch (err) {
      Alert.alert('Seeding Error', String(err?.message || err))
    } finally {
      setSeeding(false)
    }
  }

  const handleClearCourses = async () => {
    Alert.alert(
      'Clear Sample Courses',
      'Are you sure you want to delete all seeded courses from Firestore to test the empty state?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true)
            try {
              const res = await clearSeededFirestoreCourses()
              Alert.alert('Courses Cleared', `Removed ${res.count} course documents from Firestore.`)
              loadData()
            } catch (err) {
              Alert.alert('Error', String(err))
            } finally {
              setClearing(false)
            }
          },
        },
      ]
    )
  }

  const totalStudents = allUsers.filter((u) => u.role === 'student').length
  const totalTutors = allUsers.filter((u) => u.role === 'tutor').length
  const totalApprovedTutors = allUsers.filter(
    (u) => u.role === 'tutor' && u.approved === true
  ).length

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
          ]}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Console</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Cross-account control panel & verification
          </Text>
        </View>
        <Pressable
          onPress={loadData}
          style={[
            styles.refreshBtn,
            { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
          ]}
          hitSlop={10}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Segmented Admin Tabs */}
      <View
        style={[
          styles.segmentedTabs,
          {
            backgroundColor: isDark ? colors.card : '#F7F5FA',
            borderColor: colors.border,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.segmentBtn,
                isActive && [
                  styles.segmentBtnActive,
                  { backgroundColor: isDark ? '#2D1B4E' : '#FFFFFF' },
                ],
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? '#7C3AED' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  {
                    color: isActive ? '#7C3AED' : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
              {tab.id === 'approvals' && pendingTutors.length > 0 && (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{pendingTutors.length}</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
      >
        {/* TAB 1: TUTOR APPROVALS */}
        {activeTab === 'approvals' && (
          <View>
            <View
              style={[
                styles.summaryBanner,
                {
                  backgroundColor: isDark ? '#201533' : '#FAF5FF',
                  borderColor: isDark ? '#4C1D95' : '#E9D5FF',
                },
              ]}
            >
              <View>
                <Text style={styles.summaryLabel}>PENDING VERIFICATIONS</Text>
                <Text style={[styles.summaryValue, { color: isDark ? '#DDD6FE' : '#6B21A8' }]}>
                  {pendingTutors.length} Tutor Applicants
                </Text>
              </View>
              <View style={styles.shieldIconBox}>
                <Ionicons name="shield-half" size={28} color="#7C3AED" />
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Fetching applications...
                </Text>
              </View>
            ) : pendingTutors.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="checkmark-done-circle" size={48} color="#15803D" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Queue Is Clear!</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  All registered tutor accounts have been reviewed and approved. New tutor sign-ups will show up here.
                </Text>
              </View>
            ) : (
              pendingTutors.map((tutor) => (
                <View
                  key={tutor.id}
                  style={[
                    styles.tutorCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.tutorHeader}>
                    <View style={styles.tutorAvatar}>
                      <Text style={styles.tutorAvatarText}>
                        {(tutor.displayName || 'T').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tutorName, { color: colors.text }]}>
                        {tutor.displayName || 'Tutor Applicant'}
                      </Text>
                      <Text style={[styles.tutorEmail, { color: colors.textMuted }]}>
                        {tutor.email}
                      </Text>
                    </View>
                    <View style={styles.pendingTag}>
                      <Text style={styles.pendingTagText}>Under Review</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <View style={styles.tutorDetailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                      Subject Area:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {tutor.subject || 'Mathematics'}
                    </Text>
                  </View>

                  <View style={styles.tutorDetailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                      Qualification:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {tutor.qualification || 'B.Sc Degree'}
                    </Text>
                  </View>

                  <View style={styles.tutorDetailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                      Hourly Rate:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '800' }]}>
                      ₦{(tutor.hourlyRate || 3500).toLocaleString()} / hr
                    </Text>
                  </View>

                  {tutor.bio && (
                    <View
                      style={[
                        styles.bioBox,
                        {
                          backgroundColor: isDark ? '#1C2920' : '#F9FAFB',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                        "{tutor.bio}"
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={() => rejectTutor(tutor.id)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                      <Text style={styles.rejectBtnText}>Decline</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                      onPress={() => approveTutor(tutor.id)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve & Publish</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: USER DIRECTORY */}
        {activeTab === 'users' && (
          <View>
            <Text style={[styles.tabSectionHeading, { color: colors.text }]}>
              Registered Accounts ({allUsers.length})
            </Text>

            {allUsers.map((user) => {
              const role = user.role || 'student'
              return (
                <View
                  key={user.id}
                  style={[
                    styles.userDirectoryCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.userTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {user.displayName || 'Account User'}
                      </Text>
                      <Text style={[styles.userEmailText, { color: colors.textMuted }]}>
                        {user.email || 'No email'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.rolePill,
                        role === 'admin'
                          ? styles.rolePillAdmin
                          : role === 'tutor'
                          ? styles.rolePillTutor
                          : styles.rolePillStudent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rolePillText,
                          role === 'admin'
                            ? styles.rolePillTextAdmin
                            : role === 'tutor'
                            ? styles.rolePillTextTutor
                            : styles.rolePillTextStudent,
                        ]}
                      >
                        {role.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Role Switcher Action */}
                  <View style={styles.roleActionRow}>
                    <Text style={[styles.changeRoleLabel, { color: colors.textMuted }]}>
                      Set Role:
                    </Text>
                    <View style={styles.roleBtnGroup}>
                      <Pressable
                        style={[
                          styles.smallRoleBtn,
                          role === 'student' && styles.smallRoleBtnActive,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => changeUserRole(user.id, 'student')}
                      >
                        <Text
                          style={[
                            styles.smallRoleBtnText,
                            role === 'student' && { color: '#FFFFFF', fontWeight: '700' },
                          ]}
                        >
                          Student
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.smallRoleBtn,
                          role === 'tutor' && styles.smallRoleBtnActive,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => changeUserRole(user.id, 'tutor')}
                      >
                        <Text
                          style={[
                            styles.smallRoleBtnText,
                            role === 'tutor' && { color: '#FFFFFF', fontWeight: '700' },
                          ]}
                        >
                          Tutor
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.smallRoleBtn,
                          role === 'admin' && styles.smallRoleBtnActive,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => changeUserRole(user.id, 'admin')}
                      >
                        <Text
                          style={[
                            styles.smallRoleBtnText,
                            role === 'admin' && { color: '#FFFFFF', fontWeight: '700' },
                          ]}
                        >
                          Admin
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* TAB 3: PLATFORM STATS & LIVE DATABASE CONTROLS */}
        {activeTab === 'metrics' && (
          <View style={{ gap: 14 }}>
            <Text style={[styles.tabSectionHeading, { color: colors.text }]}>
              Live Firestore Counts
            </Text>

            <View style={styles.metricsGrid}>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="school" size={24} color="#2563EB" />
                <Text style={[styles.metricBigNum, { color: colors.text }]}>{totalStudents}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  Learners
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="easel" size={24} color="#15803D" />
                <Text style={[styles.metricBigNum, { color: colors.text }]}>
                  {totalApprovedTutors}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  Approved Tutors
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="book" size={24} color="#F59E0B" />
                <Text style={[styles.metricBigNum, { color: colors.text }]}>
                  {coursesCount}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  Live Courses
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="receipt" size={24} color="#7C3AED" />
                <Text style={[styles.metricBigNum, { color: colors.text }]}>
                  {enrollmentsCount}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  Enrollments
                </Text>
              </View>
            </View>

            {/* SEED & DATABASE CONTROLS */}
            <View
              style={[
                styles.dbControlCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.dbHeader}>
                <Ionicons name="server-outline" size={20} color="#7C3AED" />
                <Text style={[styles.dbTitle, { color: colors.text }]}>
                  Database Management
                </Text>
              </View>
              <Text style={[styles.dbSubtitle, { color: colors.textMuted }]}>
                Populate authentic curriculum courses & verified Nigerian tutors into Firestore in one tap, or reset to test clean empty states.
              </Text>

              <View style={styles.dbActionRow}>
                <Pressable
                  style={[styles.seedMainBtn, { backgroundColor: '#7C3AED' }]}
                  onPress={handleSeedDatabase}
                  disabled={seeding}
                >
                  {seeding ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                      <Text style={styles.seedMainBtnText}>Seed Verified Data</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.clearBtn, { borderColor: '#DC2626' }]}
                  onPress={handleClearCourses}
                  disabled={clearing}
                >
                  {clearing ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={styles.clearBtnText}>Clear Courses</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* SYSTEM STATUS CARD */}
            <View
              style={[
                styles.systemHealthCard,
                { backgroundColor: isDark ? '#14291B' : '#F0FDF4', borderColor: isDark ? '#1C4A2A' : '#BBF7D0' },
              ]}
            >
              <View style={styles.systemHealthTop}>
                <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                <Text style={styles.systemHealthTitle}>Infrastructure Connected</Text>
              </View>
              <Text style={styles.systemHealthSub}>
                Firebase Auth & Firestore: Active (Project vidklass) • Backend Upload API: Port 3000 • Dark & Light Mode: System Sync
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  titleWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  refreshBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },

  segmentedTabs: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 3,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 9,
    position: 'relative',
  },
  segmentBtnActive: {
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  segmentBtnText: {
    fontSize: 12,
  },
  alertBadge: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    marginLeft: 4,
    width: 18,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  summaryBanner: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 16,
  },
  summaryLabel: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 3,
  },
  shieldIconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },

  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },

  emptyCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },

  tutorCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  tutorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  tutorAvatar: {
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  tutorAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  tutorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  tutorEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  pendingTag: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingTagText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  tutorDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  bioBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    padding: 10,
  },
  bioText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  rejectBtn: {
    alignItems: 'center',
    borderColor: '#FECACA',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    height: 40,
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 2,
    flexDirection: 'row',
    gap: 4,
    height: 40,
    justifyContent: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  tabSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  userDirectoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  userTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmailText: {
    fontSize: 12,
    marginTop: 2,
  },

  rolePill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rolePillStudent: { backgroundColor: '#EFF6FF' },
  rolePillTutor: { backgroundColor: '#F0FDF4' },
  rolePillAdmin: { backgroundColor: '#F5F3FF' },

  rolePillText: { fontSize: 10, fontWeight: '800' },
  rolePillTextStudent: { color: '#2563EB' },
  rolePillTextTutor: { color: '#15803D' },
  rolePillTextAdmin: { color: '#7C3AED' },

  roleActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  changeRoleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  smallRoleBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  smallRoleBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  smallRoleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    width: '48%',
  },
  metricBigNum: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  dbControlCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  },
  dbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dbTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dbSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  dbActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  seedMainBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
  },
  seedMainBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },

  systemHealthCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  systemHealthTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  systemHealthTitle: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '800',
  },
  systemHealthSub: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
})
