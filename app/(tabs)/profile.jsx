import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { onIdTokenChanged, reload, sendEmailVerification, signOut } from 'firebase/auth'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import { verifyAdminAccess } from '../../firebase/adminAccess'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'

export default function Profile() {
  const router = useRouter()
  const { colors, isDark, themePreference, setThemePreference } = useTheme()
  const [userProfile, setUserProfile] = useState(null)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [isConfiguredAdmin, setIsConfiguredAdmin] = useState(false)
  const [adminEmailVerificationRequired, setAdminEmailVerificationRequired] = useState(false)
  const [adminVerificationMessage, setAdminVerificationMessage] = useState('')
  const [refreshingAdminAccess, setRefreshingAdminAccess] = useState(false)
  const [resendingAdminVerification, setResendingAdminVerification] = useState(false)
  const [simulatedRole, setSimulatedRole] = useState(null) // Allows admin to test other roles

  useEffect(() => {
    let unsubscribeProfile = () => {}
    let unsubscribeEnrollments = () => {}
    let authChangeId = 0

    const unsubscribeAuth = onIdTokenChanged(auth, (user) => {
      const currentChangeId = ++authChangeId
      unsubscribeProfile()
      unsubscribeEnrollments()
      setIsConfiguredAdmin(false)
      setAdminEmailVerificationRequired(false)
      setAdminVerificationMessage('')

      if (!user) {
        setUserProfile(null)
        setEnrollmentCount(0)
        setIsConfiguredAdmin(false)
        setAdminEmailVerificationRequired(false)
        setAdminVerificationMessage('')
        return
      }

      verifyAdminAccess(user)
        .then(({ isAdmin, emailVerificationRequired }) => {
          if (currentChangeId === authChangeId) {
            setIsConfiguredAdmin(isAdmin)
            setAdminEmailVerificationRequired(emailVerificationRequired)
            setAdminVerificationMessage('')
          }
        })
        .catch((error) => {
          console.error('Unable to verify admin access:', error)
          if (currentChangeId === authChangeId) {
            setIsConfiguredAdmin(false)
            setAdminEmailVerificationRequired(false)
            setAdminVerificationMessage(error.message || 'Unable to verify admin access.')
          }
        })

      // Listen to profile
      const userRef = doc(db, 'users', user.uid)
      unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
        setUserProfile(snapshot.data() || null)
      })

      // Listen to user's real enrollments count
      const qEnrollments = query(
        collection(db, 'enrollments'),
        where('userId', '==', user.uid)
      )
      unsubscribeEnrollments = onSnapshot(qEnrollments, (snapshot) => {
        setEnrollmentCount(snapshot.size)
      })
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile()
      unsubscribeEnrollments()
    }
  }, [])

  const currentRole =
    simulatedRole ||
    (isConfiguredAdmin ? 'admin' : userProfile?.role === 'tutor' ? 'tutor' : 'student')
  const isRealAdmin = isConfiguredAdmin

  const isTutor = currentRole === 'tutor'
  const isApproved = userProfile?.approved === true || isRealAdmin
  const canCreateLessons =
    isRealAdmin || (userProfile?.role === 'tutor' && userProfile?.approved === true)

  const refreshAdminAccess = async () => {
    const user = auth.currentUser
    if (!user || refreshingAdminAccess) return

    setRefreshingAdminAccess(true)
    setAdminVerificationMessage('')
    try {
      await reload(user)
      const { isAdmin, emailVerificationRequired } = await verifyAdminAccess(user)
      setIsConfiguredAdmin(isAdmin)
      setAdminEmailVerificationRequired(emailVerificationRequired)
      if (!isAdmin && !emailVerificationRequired) {
        setAdminVerificationMessage('This account is not listed as an admin in the backend ADMIN_EMAILS setting.')
      }
    } catch (error) {
      console.error('Unable to refresh admin access:', error)
      setAdminVerificationMessage(error.message || 'Unable to refresh admin access.')
    } finally {
      setRefreshingAdminAccess(false)
    }
  }

  const resendAdminVerification = async () => {
    const user = auth.currentUser
    if (!user || resendingAdminVerification) return

    setResendingAdminVerification(true)
    setAdminVerificationMessage('')
    try {
      await sendEmailVerification(user)
      setAdminVerificationMessage('Verification email sent. Check your inbox and spam folder.')
    } catch (error) {
      console.error('Unable to resend admin email verification:', error)
      setAdminVerificationMessage(error.message || 'Unable to send the verification email.')
    } finally {
      setResendingAdminVerification(false)
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

  const userName = userProfile?.displayName || auth.currentUser?.displayName || 'Student Learner'
  const userEmail = auth.currentUser?.email || 'learner@klaso.app'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header showBack={false} title="My Profile" subtitle="Manage your account & credentials" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.avatarWrap, { backgroundColor: colors.primary }]}
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
            <View
              style={[
                styles.tapHint,
                { backgroundColor: colors.primaryDark, borderColor: colors.surface },
              ]}
            >
              <Ionicons
                name={isRealAdmin ? 'shield-checkmark' : 'sparkles'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.greeting, { color: colors.text }]}>{userName}</Text>
              {isApproved && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.primary}
                  style={{ marginTop: 2 }}
                />
              )}
            </View>
            <Text style={[styles.email, { color: colors.textMuted }]}>{userEmail}</Text>

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
          <View
            style={[
              styles.noticeCard,
              { backgroundColor: isDark ? '#2E2208' : '#FFFBEB', borderColor: isDark ? '#6B4C0A' : '#FDE68A' },
            ]}
          >
            <Ionicons name="time-outline" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                Application Under Review
              </Text>
              <Text style={[styles.noticeSub, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                Your tutor registration is currently being verified by the admin team. Once approved, your profile will be featured in the tutor marketplace!
              </Text>
            </View>
          </View>
        )}

        {adminEmailVerificationRequired && !isRealAdmin && (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark ? '#2E2208' : '#FFFBEB',
                borderColor: isDark ? '#6B4C0A' : '#FDE68A',
              },
            ]}
          >
            <Ionicons name="mail-unread-outline" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                Verify your admin email
              </Text>
              <Text style={[styles.noticeSub, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                This email is configured for admin access, but Firebase says it is not verified yet. Verify the link sent to your inbox, then refresh access here.
              </Text>
              {!!adminVerificationMessage && (
                <Text style={[styles.noticeSub, { color: isDark ? '#FCD34D' : '#B45309', marginTop: 8 }]}>
                  {adminVerificationMessage}
                </Text>
              )}
              <View style={styles.adminVerificationActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={resendingAdminVerification}
                  onPress={resendAdminVerification}
                  style={[styles.adminVerificationButton, { borderColor: isDark ? '#6B4C0A' : '#FDE68A' }]}
                >
                  <Text style={[styles.adminVerificationButtonText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                    {resendingAdminVerification ? 'Sending...' : 'Resend email'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={refreshingAdminAccess}
                  onPress={refreshAdminAccess}
                  style={[styles.adminVerificationButton, styles.adminVerificationButtonPrimary]}
                >
                  <Text style={styles.adminVerificationButtonPrimaryText}>
                    {refreshingAdminAccess ? 'Checking...' : "I've verified"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {!!adminVerificationMessage && !adminEmailVerificationRequired && !isRealAdmin && (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark ? '#2B1D1D' : '#FEF2F2',
                borderColor: isDark ? '#7F1D1D' : '#FECACA',
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                Admin access check
              </Text>
              <Text style={[styles.noticeSub, { color: isDark ? '#FECACA' : '#B91C1C' }]}>
                {adminVerificationMessage}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={refreshingAdminAccess}
                onPress={refreshAdminAccess}
                style={[styles.adminVerificationButton, styles.adminVerificationButtonPrimary, { alignSelf: 'flex-start', marginTop: 10 }]}
              >
                <Text style={styles.adminVerificationButtonPrimaryText}>
                  {refreshingAdminAccess ? 'Checking...' : 'Retry access check'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Dynamic Stats Row */}
        <View style={styles.statsRow}>
          {isTutor ? (
            <>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {userProfile?.reviewsCount || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reviews</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>
                  ★ {userProfile?.rating || '5.0'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tutor Score</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>
                  ₦{userProfile?.hourlyRate?.toLocaleString() || '3,500'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hourly Rate</Text>
              </View>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {enrollmentCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Enrolled</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  🔥 {enrollmentCount > 0 ? '3' : '1'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Day Streak</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {enrollmentCount > 0 ? '1' : '0'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Certificates</Text>
              </View>
            </>
          )}
        </View>

        {/* APPEARANCE / THEME TOGGLE CARD */}
        <View
          style={[
            styles.themeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.themeHeaderRow}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.themeTitle, { color: colors.text }]}>
              Appearance & Theme
            </Text>
          </View>
          <Text style={[styles.themeSubtitle, { color: colors.textMuted }]}>
            Choose Light Mode, Dark Mode, or match your system settings.
          </Text>

          <View style={styles.themeButtonsRow}>
            <Pressable
              style={[
                styles.themeBtn,
                {
                  backgroundColor:
                    themePreference === 'light'
                      ? colors.primary
                      : isDark
                      ? '#1C2920'
                      : '#F3F4F6',
                  borderColor:
                    themePreference === 'light' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemePreference('light')}
            >
              <Ionicons
                name="sunny-outline"
                size={16}
                color={themePreference === 'light' ? '#FFFFFF' : colors.text}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  {
                    color: themePreference === 'light' ? '#FFFFFF' : colors.text,
                    fontWeight: themePreference === 'light' ? '700' : '500',
                  },
                ]}
              >
                Light
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.themeBtn,
                {
                  backgroundColor:
                    themePreference === 'dark'
                      ? colors.primary
                      : isDark
                      ? '#1C2920'
                      : '#F3F4F6',
                  borderColor:
                    themePreference === 'dark' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemePreference('dark')}
            >
              <Ionicons
                name="moon-outline"
                size={16}
                color={themePreference === 'dark' ? '#FFFFFF' : colors.text}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  {
                    color: themePreference === 'dark' ? '#FFFFFF' : colors.text,
                    fontWeight: themePreference === 'dark' ? '700' : '500',
                  },
                ]}
              >
                Dark
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.themeBtn,
                {
                  backgroundColor:
                    themePreference === 'system'
                      ? colors.primary
                      : isDark
                      ? '#1C2920'
                      : '#F3F4F6',
                  borderColor:
                    themePreference === 'system' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemePreference('system')}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={themePreference === 'system' ? '#FFFFFF' : colors.text}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  {
                    color: themePreference === 'system' ? '#FFFFFF' : colors.text,
                    fontWeight: themePreference === 'system' ? '700' : '500',
                  },
                ]}
              >
                System
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Only the backend-verified admin allowlist can see this route. */}
        {isRealAdmin && (
          <View
            style={[
              styles.adminSection,
              {
                backgroundColor: isDark ? '#1C152E' : '#FAF5FF',
                borderColor: isDark ? '#4C1D95' : '#E9D5FF',
              },
            ]}
          >
            <View style={styles.adminSectionHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#A78BFA" />
              <Text style={[styles.adminSectionTitle, { color: isDark ? '#C4B5FD' : '#6B21A8' }]}>
                Admin Controls
              </Text>
            </View>

            <Pressable
              style={styles.adminConsoleBtn}
              onPress={() => router.push('/admin-panel')}
              accessibilityLabel="Open Admin Panel"
            >
              <View style={styles.adminBtnLeft}>
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminBtnTitle}>Open Admin Panel</Text>
                  <Text style={styles.adminBtnSub}>
                    Review tutor applications, seed courses & view metrics
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>

            {/* Role Switcher for Admins */}
            <View style={styles.roleTesterCard}>
              <Text style={[styles.roleTesterLabel, { color: isDark ? '#C4B5FD' : '#6B21A8' }]}>
                Test App View Mode:
              </Text>
              <View style={styles.testerPillsRow}>
                <Pressable
                  style={[
                    styles.testerPill,
                    currentRole === 'student' && styles.testerPillActive,
                    { borderColor: isDark ? '#6B21A8' : '#D8B4FE', backgroundColor: isDark ? '#151025' : '#FFFFFF' },
                  ]}
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
                  style={[
                    styles.testerPill,
                    currentRole === 'tutor' && styles.testerPillActive,
                    { borderColor: isDark ? '#6B21A8' : '#D8B4FE', backgroundColor: isDark ? '#151025' : '#FFFFFF' },
                  ]}
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
        <View
          style={[
            styles.menuContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.menuGroupHeading, { color: colors.textMuted }]}>
            Account Options
          </Text>

          <Pressable
            style={[styles.menuRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => router.push('/edit-profile')}
          >
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
              ]}
            >
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              Edit Profile & Details
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {canCreateLessons && (
            <Pressable
              style={[styles.menuRow, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => router.push('/upload')}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Creator Studio & Upload Lesson
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          {!isTutor && !isRealAdmin && (
            <Pressable
              style={[styles.menuRow, { borderBottomColor: colors.borderSubtle }]}
              onPress={() => router.push('/become-tutor')}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
                ]}
              >
                <Ionicons name="easel-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Switch to Tutor Account
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          <Pressable
            style={[styles.menuRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => router.push('/(tabs)/purchases')}
          >
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
              ]}
            >
              <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              Saved Courses & Purchases
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.menuRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() =>
              Alert.alert('Notifications', 'All your course notifications are up to date.')
            }
          >
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
              ]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              Notification Preferences
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.menuRow, { borderBottomColor: 'transparent' }]}
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Contact Klaso Support Team:\n\nEmail: support@klaso.edu.ng\nWhatsApp: +234 810 000 0000'
              )
            }
          >
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
              ]}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              Help & Support Center
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Log out button */}
        <Pressable
          style={[
            styles.logoutButton,
            {
              backgroundColor: isDark ? '#2E1515' : '#FEF2F2',
              borderColor: isDark ? '#6B2020' : '#FECACA',
            },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Klaso Mobile v1.0.0 • Triple-tap avatar for Admin
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },

  heroCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarWrap: {
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    padding: 14,
  },
  noticeTitle: { fontSize: 13, fontWeight: '800' },
  noticeSub: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  adminVerificationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  adminVerificationButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminVerificationButtonText: { fontSize: 11, fontWeight: '700' },
  adminVerificationButtonPrimary: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  adminVerificationButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  themeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  themeSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  themeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 13,
  },

  adminSection: {
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
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  testerPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testerPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  testerPillActive: {
    backgroundColor: '#7C3AED !important',
    borderColor: '#7C3AED !important',
  },
  testerPillText: { color: '#8B5CF6', fontSize: 11, fontWeight: '700' },
  testerPillTextActive: { color: '#FFFFFF' },
  resetPill: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  resetPillText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },

  menuContainer: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  menuGroupHeading: {
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
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 13,
  },
  menuIconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },

  logoutButton: {
    alignItems: 'center',
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
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
})
