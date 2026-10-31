import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import Header from '../components/header'

export default function Profile() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState(null)
  const [secretAdminUnlocked, setSecretAdminUnlocked] = useState(false)
  const [simulatedRole, setSimulatedRole] = useState(null) // Allows admin to preview other roles

  const adminTapCountRef = useRef(0)
  const adminTapTimerRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserProfile(null)
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
        setUserProfile(snapshot.data() || null)
      })

      return unsubscribeProfile
    })

    return () => {
      if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current)
      unsubscribe()
    }
  }, [])

  const currentRole =
    simulatedRole ||
    userProfile?.role ||
    (auth.currentUser?.email?.toLowerCase().includes('admin') ? 'admin' : 'student')

  const isRealAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.admin === true ||
    auth.currentUser?.email?.toLowerCase().includes('admin') ||
    secretAdminUnlocked

  const isTutor = currentRole === 'tutor'
  const isApproved = userProfile?.approved === true || isRealAdmin

  // Secret 3-tap gesture on avatar like in Unihelp
  const handleAvatarTap = () => {
    adminTapCountRef.current += 1
    if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current)

    if (adminTapCountRef.current >= 3) {
      adminTapCountRef.current = 0
      const nextState = !secretAdminUnlocked
      setSecretAdminUnlocked(nextState)
      Alert.alert(
        nextState ? 'Admin Mode Unlocked! 🛡️' : 'Admin Mode Deactivated',
        nextState
          ? 'You now have full administrative privileges to review tutors, manage content, and access the admin console from both student and tutor accounts.'
          : 'Reverted back to normal account permissions.'
      )
    } else {
      adminTapTimerRef.current = setTimeout(() => {
        adminTapCountRef.current = 0
      }, 1200)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your Klaso account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth)
            router.replace('/(auth)/login')
          } catch (error) {
            console.log('Failed to sign out', error)
          }
        },
      },
    ])
  }

  const handleSwitchAccountRole = async (newRole) => {
    if (!auth.currentUser) return
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid)
      await updateDoc(userRef, { role: newRole })
      Alert.alert('Role Updated', `Your account is now switched to ${newRole.toUpperCase()}.`)
    } catch {
      // Offline fallback
      setSimulatedRole(newRole)
    }
  }

  const userName = userProfile?.displayName || auth.currentUser?.displayName || 'Student Learner'
  const userEmail = auth.currentUser?.email || 'learner@klaso.app'

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header showBack={false} title="My Profile" subtitle="Manage your account & credentials" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.heroCard}>
          <Pressable
            style={styles.avatarWrap}
            onPress={handleAvatarTap}
            accessibilityLabel="Triple tap to unlock admin"
          >
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>
                {userName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('') || 'KL'}
              </Text>
            )}
            <View style={styles.tapHint}>
              <Ionicons
                name={isRealAdmin ? 'shield-checkmark' : 'sparkles'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </Pressable>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.greeting}>{userName}</Text>
              {isApproved && (
                <Ionicons name="checkmark-circle" size={18} color="#15803D" style={{ marginTop: 2 }} />
              )}
            </View>
            <Text style={styles.email}>{userEmail}</Text>

            {/* Role Badge */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.roleBadge,
                  isRealAdmin
                    ? styles.roleBadgeAdmin
                    : isTutor
                    ? styles.roleBadgeTutor
                    : styles.roleBadgeStudent,
                ]}
              >
                <Ionicons
                  name={isRealAdmin ? 'shield' : isTutor ? 'easel' : 'school'}
                  size={12}
                  color={isRealAdmin ? '#7C3AED' : isTutor ? '#15803D' : '#2563EB'}
                />
                <Text
                  style={[
                    styles.roleBadgeText,
                    isRealAdmin
                      ? styles.roleBadgeTextAdmin
                      : isTutor
                      ? styles.roleBadgeTextTutor
                      : styles.roleBadgeTextStudent,
                  ]}
                >
                  {isRealAdmin ? 'ADMINISTRATOR' : isTutor ? 'CERTIFIED TUTOR' : 'STUDENT LEARNER'}
                </Text>
              </View>

              {isTutor && !isApproved && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending Approval</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Notice for Pending Tutor */}
        {isTutor && !isApproved && (
          <View style={styles.noticeCard}>
            <Ionicons name="time-outline" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Application Under Review</Text>
              <Text style={styles.noticeSub}>
                Your tutor registration is currently being verified by the admin team. Once approved, your profile will be featured in the tutor marketplace!
              </Text>
            </View>
          </View>
        )}

        {/* Stats Section based on Role */}
        <View style={styles.statsRow}>
          {isTutor ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{userProfile?.reviewsCount || 0}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>★ {userProfile?.rating || '5.0'}</Text>
                <Text style={styles.statLabel}>Tutor Score</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>₦{userProfile?.hourlyRate?.toLocaleString() || '3,500'}</Text>
                <Text style={styles.statLabel}>Hourly Rate</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>Enrolled</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>🔥 5</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#15803D' }]}>12</Text>
                <Text style={styles.statLabel}>Certificates</Text>
              </View>
            </>
          )}
        </View>

        {/* ADMIN MANAGEMENT CONSOLE (Accessible from both accounts!) */}
        {isRealAdmin && (
          <View style={styles.adminSection}>
            <View style={styles.adminSectionHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#7C3AED" />
              <Text style={styles.adminSectionTitle}>Admin Controls (Active on both accounts)</Text>
            </View>

            <Pressable
              style={styles.adminConsoleBtn}
              onPress={() => router.push('/admin-panel')}
              accessibilityLabel="Open Admin Panel"
            >
              <View style={styles.adminBtnLeft}>
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                <View>
                  <Text style={styles.adminBtnTitle}>Open Admin Console</Text>
                  <Text style={styles.adminBtnSub}>Review tutor applications, verify identities & metrics</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>

            {/* Quick Role Tester for Admins */}
            <View style={styles.roleTesterCard}>
              <Text style={styles.roleTesterLabel}>Test App View Mode:</Text>
              <View style={styles.testerPillsRow}>
                <Pressable
                  style={[styles.testerPill, currentRole === 'student' && styles.testerPillActive]}
                  onPress={() => setSimulatedRole('student')}
                >
                  <Text
                    style={[
                      styles.testerPillText,
                      currentRole === 'student' && styles.testerPillTextActive,
                    ]}
                  >
                    Student Mode
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.testerPill, currentRole === 'tutor' && styles.testerPillActive]}
                  onPress={() => setSimulatedRole('tutor')}
                >
                  <Text
                    style={[
                      styles.testerPillText,
                      currentRole === 'tutor' && styles.testerPillTextActive,
                    ]}
                  >
                    Tutor Mode
                  </Text>
                </Pressable>
                {simulatedRole && (
                  <Pressable style={styles.resetPill} onPress={() => setSimulatedRole(null)}>
                    <Text style={styles.resetPillText}>Reset</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Action Menu List */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuGroupHeading}>Account Options</Text>

          <Pressable style={styles.menuRow} onPress={() => router.push('/edit-profile')}>
            <View style={styles.menuIconWrap}>
              <Ionicons name="person-circle-outline" size={20} color="#15803D" />
            </View>
            <Text style={styles.menuLabel}>Edit Profile & Details</Text>
            <Ionicons name="chevron-forward" size={18} color="#8A9B8E" />
          </Pressable>

          {isTutor && isApproved && (
            <Pressable style={styles.menuRow} onPress={() => router.push('/upload')}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="cloud-upload-outline" size={20} color="#15803D" />
              </View>
              <Text style={styles.menuLabel}>Upload New Course / Lesson</Text>
              <Ionicons name="chevron-forward" size={18} color="#8A9B8E" />
            </Pressable>
          )}

          {!isTutor && !isRealAdmin && (
            <Pressable style={styles.menuRow} onPress={() => router.push('/become-tutor')}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="easel-outline" size={20} color="#15803D" />
              </View>
              <Text style={styles.menuLabel}>Switch to Tutor Account</Text>
              <Ionicons name="chevron-forward" size={18} color="#8A9B8E" />
            </Pressable>
          )}

          <Pressable style={styles.menuRow} onPress={() => router.push('/(tabs)/purchases')}>
            <View style={styles.menuIconWrap}>
              <Ionicons name="bookmark-outline" size={20} color="#15803D" />
            </View>
            <Text style={styles.menuLabel}>Saved Courses & Wishlist</Text>
            <Ionicons name="chevron-forward" size={18} color="#8A9B8E" />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => Alert.alert('Notifications', 'All your course notifications are up to date.')}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="notifications-outline" size={20} color="#15803D" />
            </View>
            <Text style={styles.menuLabel}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={18} color="#8A9B8E" />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => Alert.alert('Support', 'Contact Klaso Support at support@klaso.edu')}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="help-circle-outline" size={20} color="#15803D" />
            </View>
            <Text style={styles.menuLabel}>Help & Support Center</Text>
            <Ionicons name="chevron-forward" size={18} color="#8A9B8E" />
          </Pressable>
        </View>

        {/* Log out button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>

        <Text style={styles.versionText}>Klaso Mobile v1.0.0 • Triple-tap avatar for Admin</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 18, paddingBottom: 40 },

  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    position: 'relative',
    width: 68,
  },
  avatarImg: {
    borderRadius: 34,
    height: 68,
    width: 68,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  tapHint: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    bottom: -2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 20,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  greeting: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    color: '#718178',
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  roleBadge: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeStudent: { backgroundColor: '#EFF6FF' },
  roleBadgeTutor: { backgroundColor: '#F0FDF4' },
  roleBadgeAdmin: { backgroundColor: '#F5F3FF' },

  roleBadgeText: { fontSize: 10, fontWeight: '800' },
  roleBadgeTextStudent: { color: '#2563EB' },
  roleBadgeTextTutor: { color: '#15803D' },
  roleBadgeTextAdmin: { color: '#7C3AED' },

  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: { color: '#D97706', fontSize: 10, fontWeight: '700' },

  noticeCard: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    padding: 14,
  },
  noticeTitle: { color: '#92400E', fontSize: 13, fontWeight: '800' },
  noticeSub: { color: '#B45309', fontSize: 12, lineHeight: 18, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#F7FAF7',
    borderColor: '#E8EFEA',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  statValue: {
    color: '#14351D',
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    color: '#718178',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  adminSection: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 18,
    padding: 14,
  },
  adminSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  adminSectionTitle: {
    color: '#6B21A8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  adminConsoleBtn: {
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  adminBtnLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  adminBtnTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  adminBtnSub: { color: '#E9D5FF', fontSize: 11, marginTop: 2 },

  roleTesterCard: {
    marginTop: 12,
  },
  roleTesterLabel: {
    color: '#6B21A8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  testerPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testerPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8B4FE',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  testerPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  testerPillText: { color: '#6B21A8', fontSize: 11, fontWeight: '700' },
  testerPillTextActive: { color: '#FFFFFF' },
  resetPill: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  resetPillText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },

  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  menuGroupHeading: {
    color: '#8A9B8E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: '#F0F4F1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 13,
  },
  menuIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  menuLabel: {
    color: '#14351D',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },

  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  versionText: {
    color: '#A0B0A5',
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
})
