import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { verifyAdminAccess } from '../firebase/adminAccess'
import { useTheme } from '../context/ThemeContext'

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'approvals', label: 'Approvals', icon: 'shield-checkmark-outline' },
  { id: 'users', label: 'Users', icon: 'people-outline' },
  { id: 'overview', label: 'Overview', icon: 'bar-chart-outline' },
  { id: 'payouts', label: 'Payouts', icon: 'cash-outline' },
]

const ROLES = [
  { id: 'student', label: 'Student', description: 'Learns, books tutors and enrols in courses.' },
  { id: 'tutor', label: 'Tutor', description: 'Teaches and appears in the marketplace. Approved immediately.' },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Sets the admin role on the account. Console access is still verified by the backend.',
  },
]

const ROLE_COLORS = { student: '#2563EB', tutor: '#15803D', admin: '#7C3AED' }
const SUCCESS = '#15803D'
const WARNING = '#B45309'

const TX_STATUS = {
  successful: { label: 'Successful', color: SUCCESS },
  pending: { label: 'Pending', color: WARNING },
  other: { label: 'Other', color: '#6B7280' },
}

const PAGE_SIZE = 15

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(value) {
  const d = toDate(value)
  if (!d) return null
  try {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d.toDateString()
  }
}

function formatTime(d) {
  if (!d) return ''
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function txStatusKey(tx) {
  if (tx.status === 'successful') return 'successful'
  if (tx.status === 'pending') return 'pending'
  return 'other'
}

function tint(color, alpha = '1F') {
  return `${color}${alpha}`
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function AdminPanel() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const [activeTab, setActiveTab] = useState('approvals')
  const [allUsers, setAllUsers] = useState([])
  const [coursesCount, setCoursesCount] = useState(0)
  const [enrollmentsCount, setEnrollmentsCount] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const [accessState, setAccessState] = useState('checking')
  const [accessError, setAccessError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [adminUid, setAdminUid] = useState(null)

  const [busy, setBusy] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const mounted = useRef(true)

  // Users tab
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [usersLimit, setUsersLimit] = useState(PAGE_SIZE)
  const [sheetUser, setSheetUser] = useState(null)

  // Overview tab
  const [txFilter, setTxFilter] = useState('all')
  const [txLimit, setTxLimit] = useState(10)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const setBusyFlag = (id, value) =>
    setBusy((current) => {
      const next = { ...current }
      if (value) next[id] = true
      else delete next[id]
      return next
    })

  /* ----------------------------- data ----------------------------- */

  const loadData = useCallback(async () => {
    const [usersRes, coursesRes, enrollmentsRes, txRes, withdrawalsRes] = await Promise.allSettled([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'enrollments')),
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'withdrawals')),
    ])

    if (!mounted.current) return

    const failed = []

    if (usersRes.status === 'fulfilled') {
      setAllUsers(usersRes.value.docs.map((d) => ({ id: d.id, ...d.data() })))
    } else {
      failed.push('users')
      console.log('Failed to load users', usersRes.reason)
    }

    if (coursesRes.status === 'fulfilled') setCoursesCount(coursesRes.value.size)
    else failed.push('courses')

    if (enrollmentsRes.status === 'fulfilled') setEnrollmentsCount(enrollmentsRes.value.size)
    else failed.push('enrollments')

    if (txRes.status === 'fulfilled') {
      const list = txRes.value.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      setTransactions(list)
    } else {
      failed.push('transactions')
    }

    if (withdrawalsRes.status === 'fulfilled') {
      const list = withdrawalsRes.value.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (toDate(b.requestedAt || b.createdAt)?.getTime() || 0) - (toDate(a.requestedAt || a.createdAt)?.getTime() || 0))
      setWithdrawals(list)
    } else {
      failed.push('withdrawals')
    }

    setLoadError(failed.length ? `Could not load: ${failed.join(', ')}. Pull down to retry.` : '')
    if (failed.length < 4) setLastUpdated(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return

      if (!user) {
        setAdminUid(null)
        setAccessState('denied')
        setAccessError('Sign in with an administrator account to open this console.')
        setLoading(false)
        return
      }

      setAdminUid(user.uid)
      setAccessState('checking')
      try {
        const { isAdmin } = await verifyAdminAccess(user)
        if (!active) return
        if (!isAdmin) {
          setAccessState('denied')
          setAccessError(
            'This account is not an administrator. Sign in with a verified email listed in the backend ADMIN_EMAILS setting.'
          )
          setLoading(false)
          return
        }
        setAccessState('allowed')
        await loadData()
      } catch (error) {
        console.error('Unable to verify admin panel access:', error)
        if (active) {
          setAccessState('denied')
          setAccessError(error.message || 'Unable to verify administrator access.')
          setLoading(false)
        }
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [retryKey, loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  /* --------------------------- derived data ----------------------- */

  const userMap = useMemo(() => {
    const map = {}
    allUsers.forEach((u) => {
      map[u.id] = u
    })
    return map
  }, [allUsers])

  const nameOf = (id) => userMap[id]?.displayName || (id ? `${String(id).slice(0, 6)}…` : 'N/A')

  const pendingTutors = useMemo(
    () =>
      allUsers
        .filter((u) => u.role === 'tutor' && u.approved !== true)
        .sort((a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0)),
    [allUsers]
  )

  const stats = useMemo(() => {
    const successful = transactions.filter((t) => t.status === 'successful')
    const payoutPending = withdrawals.filter((w) => ['pending', 'processing'].includes(String(w.status || '').toLowerCase()))
    const payoutPaid = withdrawals.filter((w) => String(w.status || '').toLowerCase() === 'paid')
    return {
      students: allUsers.filter((u) => (u.role || 'student') === 'student').length,
      tutors: allUsers.filter((u) => u.role === 'tutor' && u.approved === true).length,
      revenue: successful.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      successfulCount: successful.length,
      pendingPayouts: payoutPending.length,
      pendingPayoutTotal: payoutPending.reduce((sum, w) => sum + Number(w.amount || 0), 0),
      paidPayouts: payoutPaid.length,
    }
  }, [allUsers, transactions, withdrawals])

  const roleCounts = useMemo(() => {
    const counts = { all: allUsers.length, student: 0, tutor: 0, admin: 0 }
    allUsers.forEach((u) => {
      const r = u.role || 'student'
      if (counts[r] !== undefined) counts[r] += 1
    })
    return counts
  }, [allUsers])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allUsers
      .filter((u) => {
        const role = u.role || 'student'
        if (roleFilter !== 'all' && role !== roleFilter) return false
        if (!q) return true
        return (
          String(u.displayName || '').toLowerCase().includes(q) ||
          String(u.email || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
  }, [allUsers, query, roleFilter])

  const filteredTransactions = useMemo(
    () => (txFilter === 'all' ? transactions : transactions.filter((t) => txStatusKey(t) === txFilter)),
    [transactions, txFilter]
  )

  /* ---------------------------- actions --------------------------- */

  async function approveWithdrawal(withdrawal) {
    const id = withdrawal.id
    if (busy[id]) return
    setBusyFlag(id, true)

    try {
      const amount = Number(withdrawal.amount || 0)
      const walletRef = doc(db, 'tutorWallets', withdrawal.tutorId)
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef)
        const walletData = walletDoc.exists ? walletDoc.data() || {} : {}
        const currentReserved = Number(walletData.reservedBalance || 0)
        const currentPending = Number(walletData.pendingBalance || 0)
        const currentWithdrawn = Number(walletData.withdrawnAmount || 0)

        transaction.update(walletRef, {
          reservedBalance: Math.max(0, currentReserved - amount),
          pendingBalance: Math.max(0, currentPending - amount),
          withdrawnAmount: Number((currentWithdrawn + amount).toFixed(2)),
          updatedAt: serverTimestamp(),
        })

        transaction.update(doc(db, 'withdrawals', id), {
          status: 'paid',
          processedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          adminReviewedBy: adminUid,
          updatedAt: serverTimestamp(),
        })
      })

      setWithdrawals((curr) =>
        curr.map((item) =>
          item.id === id
            ? { ...item, status: 'paid', processedAt: new Date().toISOString(), completedAt: new Date().toISOString(), adminReviewedBy: adminUid }
            : item
        )
      )
      showToast('Withdrawal marked as paid.')
    } catch (error) {
      Alert.alert('Payout update failed', error.message || 'Unable to record the payout settlement.')
    } finally {
      setBusyFlag(id, false)
    }
  }

  async function rejectWithdrawal(withdrawal) {
    const id = withdrawal.id
    if (busy[id]) return
    setBusyFlag(id, true)

    try {
      const amount = Number(withdrawal.amount || 0)
      const walletRef = doc(db, 'tutorWallets', withdrawal.tutorId)
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef)
        const walletData = walletDoc.exists ? walletDoc.data() || {} : {}
        const currentAvailable = Number(walletData.availableBalance || 0)
        const currentReserved = Number(walletData.reservedBalance || 0)
        const currentPending = Number(walletData.pendingBalance || 0)

        transaction.update(walletRef, {
          availableBalance: Number((currentAvailable + amount).toFixed(2)),
          reservedBalance: Math.max(0, currentReserved - amount),
          pendingBalance: Math.max(0, currentPending - amount),
          updatedAt: serverTimestamp(),
        })

        transaction.update(doc(db, 'withdrawals', id), {
          status: 'failed',
          failureReason: 'Manual admin review rejected the payout.',
          processedAt: serverTimestamp(),
          adminReviewedBy: adminUid,
          updatedAt: serverTimestamp(),
        })
      })

      setWithdrawals((curr) =>
        curr.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'failed',
                failureReason: 'Manual admin review rejected the payout.',
                processedAt: new Date().toISOString(),
                adminReviewedBy: adminUid,
              }
            : item
        )
      )
      showToast('Withdrawal rejected and funds released back to the wallet.')
    } catch (error) {
      Alert.alert('Payout rejected', error.message || 'Unable to reject this payout.')
    } finally {
      setBusyFlag(id, false)
    }
  }

  async function approveTutor(user) {
    if (busy[user.id]) return
    setBusyFlag(user.id, true)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        approved: true,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setAllUsers((curr) => curr.map((u) => (u.id === user.id ? { ...u, approved: true } : u)))
      showToast(`${user.displayName || 'Tutor'} approved and visible in the marketplace.`)
    } catch (error) {
      Alert.alert('Approval not saved', error.message || 'Unable to update this tutor. Please try again.')
    } finally {
      setBusyFlag(user.id, false)
    }
  }

  function declineTutor(user) {
    Alert.alert(
      'Decline application',
      `${user.displayName || 'This applicant'} will be moved back to a student account and removed from the review queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setBusyFlag(user.id, true)
            try {
              await updateDoc(doc(db, 'users', user.id), {
                role: 'student',
                approved: false,
                updatedAt: serverTimestamp(),
              })
              setAllUsers((curr) =>
                curr.map((u) => (u.id === user.id ? { ...u, role: 'student', approved: false } : u))
              )
              showToast('Application declined.', 'neutral')
            } catch (error) {
              Alert.alert('Decline not saved', error.message || 'Unable to update this application.')
            } finally {
              setBusyFlag(user.id, false)
            }
          },
        },
      ]
    )
  }

  function requestRoleChange(user, newRole) {
    setSheetUser(null)
    if ((user.role || 'student') === newRole) return

    const warning =
      newRole === 'admin'
        ? '\n\nAdmins can approve tutors and change other accounts.'
        : user.role === 'admin'
        ? '\n\nThis account will lose its admin role.'
        : ''

    // Small delay so the sheet finishes closing before the native alert opens.
    setTimeout(() => {
      Alert.alert(
        'Change role',
        `Change ${user.displayName || user.email || 'this account'} to ${newRole}?${warning}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change role',
            style: newRole === 'admin' ? 'destructive' : 'default',
            onPress: async () => {
              setBusyFlag(user.id, true)
              try {
                const approved = newRole === 'tutor'
                await updateDoc(doc(db, 'users', user.id), {
                  role: newRole,
                  approved,
                  updatedAt: serverTimestamp(),
                })
                setAllUsers((curr) =>
                  curr.map((u) => (u.id === user.id ? { ...u, role: newRole, approved } : u))
                )
                showToast(`Role changed to ${newRole}.`)
              } catch (error) {
                Alert.alert('Role not changed', error.message || 'Unable to update this account.')
              } finally {
                setBusyFlag(user.id, false)
              }
            },
          },
        ]
      )
    }, 250)
  }

  /* ------------------------------ UI ------------------------------ */

  const header = (
    <View style={[styles.headerRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={[styles.iconButton, { backgroundColor: colors.borderSubtle }]}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </Pressable>

      <View style={styles.titleWrap}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Admin console</Text>
        {accessState === 'allowed' && !!lastUpdated && (
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Updated {formatTime(lastUpdated)}
          </Text>
        )}
      </View>

      {accessState === 'allowed' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh data"
          onPress={onRefresh}
          disabled={refreshing}
          style={[styles.iconButton, { backgroundColor: colors.borderSubtle }]}
          hitSlop={8}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={19} color={colors.text} />
          )}
        </Pressable>
      )}
    </View>
  )

  if (accessState !== 'allowed') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {header}
        <View style={styles.gateWrap}>
          {accessState === 'checking' ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.gateText, { color: colors.textMuted }]}>Verifying administrator access…</Text>
            </>
          ) : (
            <>
              <View style={[styles.gateIcon, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="lock-closed-outline" size={26} color={colors.danger} />
              </View>
              <Text style={[styles.gateTitle, { color: colors.text }]}>Access restricted</Text>
              <Text style={[styles.gateText, { color: colors.textMuted }]}>{accessError}</Text>
              <View style={styles.gateActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.back()}
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Go back</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setLoading(true)
                    setRetryKey((k) => k + 1)
                  }}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {header}

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, active && { borderBottomColor: colors.primary }]}
            >
              <Ionicons name={tab.icon} size={17} color={active ? colors.primary : colors.textMuted} />
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.primary : colors.textMuted },
                  active && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.id === 'approvals' && pendingTutors.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{pendingTutors.length}</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {!!loadError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorBannerText, { color: colors.danger }]}>{loadError}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.mutedText, { color: colors.textMuted }]}>Loading data…</Text>
          </View>
        ) : (
          <>
            {activeTab === 'approvals' && (
              <ApprovalsTab pending={pendingTutors} busy={busy} onApprove={approveTutor} onDecline={declineTutor} />
            )}

            {activeTab === 'users' && (
              <UsersTab
                users={filteredUsers.slice(0, usersLimit)}
                total={filteredUsers.length}
                allCount={allUsers.length}
                query={query}
                onQuery={(v) => {
                  setQuery(v)
                  setUsersLimit(PAGE_SIZE)
                }}
                roleFilter={roleFilter}
                roleCounts={roleCounts}
                onRoleFilter={(v) => {
                  setRoleFilter(v)
                  setUsersLimit(PAGE_SIZE)
                }}
                busy={busy}
                adminUid={adminUid}
                onOpenRole={setSheetUser}
                onMore={() => setUsersLimit((n) => n + PAGE_SIZE)}
              />
            )}

            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats}
                coursesCount={coursesCount}
                enrollmentsCount={enrollmentsCount}
                pendingCount={pendingTutors.length}
                onReview={() => setActiveTab('approvals')}
                transactions={filteredTransactions.slice(0, txLimit)}
                totalTransactions={filteredTransactions.length}
                txFilter={txFilter}
                onTxFilter={(v) => {
                  setTxFilter(v)
                  setTxLimit(10)
                }}
                withdrawals={withdrawals}
                nameOf={nameOf}
                onMore={() => setTxLimit((n) => n + 10)}
              />
            )}

            {activeTab === 'payouts' && (
              <PayoutsTab
                withdrawals={withdrawals}
                busy={busy}
                nameOf={nameOf}
                onApprove={approveWithdrawal}
                onReject={rejectWithdrawal}
              />
            )}
          </>
        )}
      </ScrollView>

      <RoleSheet
        user={sheetUser}
        onClose={() => setSheetUser(null)}
        onSelect={(role) => sheetUser && requestRoleChange(sheetUser, role)}
      />

      {!!toast && (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 16 }]}>
          <View
            style={[
              styles.toast,
              { backgroundColor: toast.type === 'neutral' ? colors.text : '#14532D' },
            ]}
          >
            <Ionicons
              name={toast.type === 'neutral' ? 'information-circle' : 'checkmark-circle'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

function ApprovalsTab({ pending, busy, onApprove, onDecline }) {
  const { colors } = useTheme()

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tutor applications</Text>
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          {pending.length === 0
            ? 'Nothing waiting'
            : `${pending.length} waiting, oldest first`}
        </Text>
      </View>

      {pending.length === 0 ? (
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="No pending applications"
          message="New tutor sign-ups will appear here for review."
        />
      ) : (
        pending.map((tutor) => (
          <PendingCard
            key={tutor.id}
            tutor={tutor}
            busy={!!busy[tutor.id]}
            onApprove={() => onApprove(tutor)}
            onDecline={() => onDecline(tutor)}
          />
        ))
      )}
    </View>
  )
}

function PendingCard({ tutor, busy, onApprove, onDecline }) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)

  const applied = formatDate(tutor.createdAt)
  const rate = typeof tutor.hourlyRate === 'number' ? `${formatNaira(tutor.hourlyRate)} per hour` : null
  const qualification = tutor.qualification || tutor.education || null
  const bio = (tutor.bio || '').trim()
  const longBio = bio.length > 140
  const incomplete = !tutor.subject || !qualification || !rate || !bio

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowCenter}>
        <Avatar name={tutor.displayName} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text }]}>
            {tutor.displayName || 'Tutor applicant'}
          </Text>
          <Text numberOfLines={1} style={[styles.cardSub, { color: colors.textMuted }]}>
            {tutor.email || 'No email'}
          </Text>
        </View>
        {!!applied && <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{applied}</Text>}
      </View>

      <View style={[styles.detailBlock, { borderColor: colors.borderSubtle }]}>
        <DetailRow label="Subject" value={tutor.subject} />
        <DetailRow label="Qualification" value={qualification} />
        <DetailRow label="Hourly rate" value={rate} emphasize />
      </View>

      {!!bio && (
        <View style={styles.bioWrap}>
          <Text
            numberOfLines={expanded ? undefined : 3}
            style={[styles.bioText, { color: colors.textSecondary }]}
          >
            {bio}
          </Text>
          {longBio && (
            <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {incomplete && (
        <View style={[styles.notice, { backgroundColor: tint(WARNING, '1A') }]}>
          <Ionicons name="alert-circle-outline" size={16} color={WARNING} />
          <Text style={[styles.noticeText, { color: WARNING }]}>
            This profile is missing some details. Consider reviewing before approving.
          </Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onDecline}
          style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.danger }, busy && styles.disabled]}
        >
          <Text style={[styles.declineText, { color: colors.danger }]}>Decline</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onApprove}
          style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.primary }, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.approveText}>Approve and publish</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

function DetailRow({ label, value, emphasize }) {
  const { colors } = useTheme()
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          { color: value ? (emphasize ? colors.primary : colors.text) : colors.textMuted },
          emphasize && !!value && styles.detailValueStrong,
        ]}
      >
        {value || 'Not provided'}
      </Text>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

function PayoutsTab({ withdrawals, busy, nameOf, onApprove, onReject }) {
  const { colors } = useTheme()

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payout review</Text>
        <Text style={[styles.mutedText, { color: colors.textMuted }]}>
          {withdrawals.filter((w) => ['pending', 'processing'].includes(String(w.status || '').toLowerCase())).length} awaiting review
        </Text>
      </View>

      {withdrawals.length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title="No withdrawals"
          message="Tutor payout requests will appear here once they are submitted."
        />
      ) : (
        withdrawals.map((withdrawal) => {
          const status = String(withdrawal.status || 'pending').toLowerCase()
          const isUnderReview = ['pending', 'processing'].includes(status)
          const bankName = withdrawal.bankName || 'Bank transfer'
          const amount = Number(withdrawal.amount || 0)
          const date = formatDate(withdrawal.requestedAt || withdrawal.createdAt)

          return (
            <View key={withdrawal.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowCenter}>
                <View style={styles.flex}>
                  <Text style={[styles.txAmount, { color: colors.text }]}>{formatNaira(amount)}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{date || 'Date unknown'}</Text>
                </View>
                <Pill label={status === 'paid' ? 'Paid' : status === 'failed' ? 'Failed' : 'Pending'} color={status === 'paid' ? SUCCESS : status === 'failed' ? '#DC2626' : WARNING} />
              </View>

              <View style={[styles.detailBlock, { borderColor: colors.borderSubtle }]}>
                <DetailRow label="Tutor" value={nameOf(withdrawal.tutorId)} />
                <DetailRow label="Reference" value={withdrawal.withdrawalReference || withdrawal.id} />
                <DetailRow label="Bank" value={bankName} />
                {!!withdrawal.failureReason && <DetailRow label="Reason" value={withdrawal.failureReason} />}
              </View>

              {isUnderReview && (
                <View style={styles.actionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!!busy[withdrawal.id]}
                    onPress={() => onReject(withdrawal)}
                    style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.danger }, !!busy[withdrawal.id] && styles.disabled]}
                  >
                    {busy[withdrawal.id] ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Text style={[styles.declineText, { color: colors.danger }]}>Reject</Text>
                    )}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={!!busy[withdrawal.id]}
                    onPress={() => onApprove(withdrawal)}
                    style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.primary }, !!busy[withdrawal.id] && styles.disabled]}
                  >
                    {busy[withdrawal.id] ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.approveText}>Mark paid</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          )
        })
      )}
    </View>
  )
}

function UsersTab({
  users,
  total,
  allCount,
  query,
  onQuery,
  roleFilter,
  roleCounts,
  onRoleFilter,
  busy,
  adminUid,
  onOpenRole,
  onMore,
}) {
  const { colors } = useTheme()

  return (
    <View>
      <SearchBar value={query} onChangeText={onQuery} placeholder="Search by name or email" />

      <FilterChips
        value={roleFilter}
        onChange={onRoleFilter}
        options={[
          { id: 'all', label: 'All', count: roleCounts.all },
          { id: 'student', label: 'Students', count: roleCounts.student },
          { id: 'tutor', label: 'Tutors', count: roleCounts.tutor },
          { id: 'admin', label: 'Admins', count: roleCounts.admin },
        ]}
      />

      <Text style={[styles.mutedText, styles.resultsCount, { color: colors.textMuted }]}>
        {total === allCount ? `${total} accounts` : `${total} of ${allCount} accounts`}
      </Text>

      {users.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matching accounts"
          message="Try a different name or email, or clear the filter."
        />
      ) : (
        users.map((user) => {
          const role = user.role || 'student'
          const isSelf = user.id === adminUid
          const joined = formatDate(user.createdAt)
          const awaiting = role === 'tutor' && user.approved !== true
          return (
            <View
              key={user.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.rowCenter}>
                <Avatar name={user.displayName} />
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={[styles.cardTitle, styles.shrink, { color: colors.text }]}>
                      {user.displayName || 'Unnamed account'}
                    </Text>
                    {isSelf && (
                      <Text style={[styles.youTag, { color: colors.textMuted, borderColor: colors.border }]}>
                        You
                      </Text>
                    )}
                  </View>
                  <Text numberOfLines={1} style={[styles.cardSub, { color: colors.textMuted }]}>
                    {user.email || 'No email'}
                  </Text>
                </View>
                <Pill label={role[0].toUpperCase() + role.slice(1)} color={ROLE_COLORS[role] || '#6B7280'} />
              </View>

              <View style={[styles.userFooter, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.flex}>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                    {joined ? `Joined ${joined}` : 'Join date unknown'}
                  </Text>
                  {awaiting && (
                    <Text style={[styles.cardMeta, { color: WARNING, marginTop: 2 }]}>Awaiting approval</Text>
                  )}
                </View>

                {busy[user.id] ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change role for ${user.displayName || user.email}`}
                    disabled={isSelf}
                    onPress={() => onOpenRole(user)}
                    style={[styles.changeRoleBtn, { borderColor: colors.border }, isSelf && styles.disabled]}
                    hitSlop={6}
                  >
                    <Text style={[styles.changeRoleText, { color: colors.text }]}>Change role</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>
          )
        })
      )}

      {users.length < total && <ShowMore onPress={onMore} remaining={total - users.length} />}
    </View>
  )
}

function RoleSheet({ user, onClose, onSelect }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const current = user?.role || 'student'

  return (
    <Modal visible={!!user} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <View style={styles.flex}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Change role</Text>
              <Text numberOfLines={1} style={[styles.cardSub, { color: colors.textMuted }]}>
                {user?.displayName || user?.email}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {ROLES.map((role) => {
            const selected = role.id === current
            return (
              <Pressable
                key={role.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(role.id)}
                style={[
                  styles.roleOption,
                  { borderColor: selected ? colors.primary : colors.border },
                  selected && { backgroundColor: colors.primaryLight },
                ]}
              >
                <View style={styles.flex}>
                  <Text style={[styles.roleOptionTitle, { color: selected ? colors.primary : colors.text }]}>
                    {role.label}
                  </Text>
                  <Text style={[styles.roleOptionDesc, { color: colors.textMuted }]}>{role.description}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            )
          })}
        </View>
      </View>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({
  stats,
  coursesCount,
  enrollmentsCount,
  pendingCount,
  onReview,
  transactions,
  totalTransactions,
  txFilter,
  onTxFilter,
  nameOf,
  onMore,
}) {
  const { colors } = useTheme()

  return (
    <View>
      {pendingCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={onReview}
          style={[styles.attention, { backgroundColor: tint(WARNING, '1A'), borderColor: tint(WARNING, '55') }]}
        >
          <Ionicons name="time-outline" size={20} color={WARNING} />
          <Text style={[styles.attentionText, { color: colors.text }]}>
            {pendingCount} tutor {pendingCount === 1 ? 'application needs' : 'applications need'} review
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Platform</Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard icon="school-outline" color="#2563EB" value={stats.students} label="Students" />
        <StatCard icon="easel-outline" color={SUCCESS} value={stats.tutors} label="Approved tutors" />
        <StatCard icon="book-outline" color="#D97706" value={coursesCount} label="Courses" />
        <StatCard icon="receipt-outline" color="#7C3AED" value={enrollmentsCount} label="Enrolments" />
      </View>

      <View style={[styles.revenueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Successful payments</Text>
        <Text style={[styles.revenueValue, { color: colors.text }]}>{formatNaira(stats.revenue)}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
          Across {stats.successfulCount} {stats.successfulCount === 1 ? 'transaction' : 'transactions'}
        </Text>
      </View>

      <View style={[styles.revenueCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Payouts in review</Text>
        <Text style={[styles.revenueValue, { color: colors.text }]}>{formatNaira(stats.pendingPayoutTotal)}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
          {stats.pendingPayouts} pending review • {stats.paidPayouts} completed
        </Text>
      </View>

      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
      </View>

      <FilterChips
        value={txFilter}
        onChange={onTxFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'successful', label: 'Successful' },
          { id: 'pending', label: 'Pending' },
          { id: 'other', label: 'Other' },
        ]}
      />

      {transactions.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No transactions"
          message={
            txFilter === 'all'
              ? 'Payments will appear here after the first verified purchase.'
              : 'No transactions match this status.'
          }
        />
      ) : (
        transactions.map((tx) => {
          const key = txStatusKey(tx)
          const status = TX_STATUS[key]
          const date = formatDate(tx.createdAt)
          return (
            <View
              key={tx.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.rowCenter}>
                <View style={styles.flex}>
                  <Text style={[styles.txAmount, { color: colors.text }]}>{formatNaira(tx.amount)}</Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    style={[styles.cardMeta, { color: colors.textMuted }]}
                  >
                    {tx.txRef || tx.id}
                  </Text>
                </View>
                <Pill
                  label={key === 'other' ? String(tx.status || 'Unknown') : status.label}
                  color={status.color}
                />
              </View>

              <View style={[styles.detailBlock, { borderColor: colors.borderSubtle }]}>
                <DetailRow label="Student" value={nameOf(tx.studentId)} />
                <DetailRow label="Tutor" value={nameOf(tx.tutorId)} />
                {!!tx.tutorialId && <DetailRow label="Tutorial" value={String(tx.tutorialId)} />}
                {!!date && <DetailRow label="Date" value={date} />}
              </View>
            </View>
          )
        })
      )}

      {transactions.length < totalTransactions && (
        <ShowMore onPress={onMore} remaining={totalTransactions - transactions.length} />
      )}
    </View>
  )
}

function StatCard({ icon, color, value, label }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: tint(color, '1F') }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{Number(value).toLocaleString()}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Avatar({ name }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.avatarText, { color: colors.primary }]}>{initialsOf(name)}</Text>
    </View>
  )
}

function Pill({ label, color }) {
  return (
    <View style={[styles.pill, { backgroundColor: tint(color, '1F') }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  )
}

function SearchBar({ value, onChangeText, placeholder }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.search, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        selectionColor={colors.primary}
        style={[styles.searchInput, { color: colors.text }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  )
}

function FilterChips({ options, value, onChange }) {
  const { colors } = useTheme()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
              {option.label}
              {option.count !== undefined ? ` ${option.count}` : ''}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function EmptyState({ icon, title, message }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={36} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  )
}

function ShowMore({ onPress, remaining }) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.showMore, { borderColor: colors.border }]}
    >
      <Text style={[styles.showMoreText, { color: colors.primary }]}>Show more ({remaining} remaining)</Text>
    </Pressable>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  rowCenter: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  disabled: { opacity: 0.45 },

  // Header
  headerRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    height: 58,
    paddingHorizontal: 16,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  titleWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },

  // Access gate
  gateWrap: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  gateIcon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  gateTitle: { fontSize: 18, fontWeight: '700' },
  gateText: { fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  gateActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600' },

  // Tabs
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  tab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { fontWeight: '700' },
  badge: {
    alignItems: 'center',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  container: { padding: 16, paddingBottom: 48 },
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 48 },
  mutedText: { fontSize: 13 },

  errorBanner: {
    alignItems: 'flex-start',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    padding: 12,
  },
  errorBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Sections
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },

  // Cards
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 1 },
  cardMeta: { fontSize: 12 },

  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },

  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '600' },

  detailBlock: { borderTopWidth: StyleSheet.hairlineWidth, gap: 8, marginTop: 12, paddingTop: 12 },
  detailRow: { flexDirection: 'row', gap: 16, justifyContent: 'space-between' },
  detailLabel: { fontSize: 13 },
  detailValue: { flexShrink: 1, fontSize: 13, fontWeight: '500', textAlign: 'right' },
  detailValueStrong: { fontWeight: '700' },

  bioWrap: { marginTop: 12 },
  bioText: { fontSize: 13, lineHeight: 19 },
  linkText: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  notice: { alignItems: 'flex-start', borderRadius: 8, flexDirection: 'row', gap: 8, marginTop: 12, padding: 10 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { alignItems: 'center', borderRadius: 10, height: 44, justifyContent: 'center' },
  declineBtn: { borderWidth: 1, flex: 1 },
  declineText: { fontSize: 14, fontWeight: '600' },
  approveBtn: { flex: 2 },
  approveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Users
  search: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chipsRow: { gap: 8, paddingVertical: 12 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '600' },
  resultsCount: { marginBottom: 10 },

  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  youTag: {
    borderRadius: 4,
    borderWidth: 1,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  userFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
  },
  changeRoleBtn: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  changeRoleText: { fontSize: 13, fontWeight: '600' },

  showMore: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  showMoreText: { fontSize: 14, fontWeight: '600' },

  // Overview
  attention: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    padding: 14,
  },
  attentionText: { flex: 1, fontSize: 14, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    marginBottom: 10,
    width: 32,
  },
  statValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { fontSize: 13, marginTop: 2 },
  revenueCard: { borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 14 },
  revenueValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, marginVertical: 4 },
  txAmount: { fontSize: 17, fontWeight: '700' },

  // Empty state
  empty: { alignItems: 'center', borderRadius: 12, borderWidth: 1, gap: 6, padding: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },

  // Bottom sheet
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', borderRadius: 2, height: 4, marginBottom: 12, width: 36 },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  roleOption: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  roleOptionTitle: { fontSize: 15, fontWeight: '700' },
  roleOptionDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  // Toast
  toastWrap: { alignItems: 'center', left: 16, position: 'absolute', right: 16 },
  toast: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 480,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastText: { color: '#FFFFFF', flexShrink: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
})