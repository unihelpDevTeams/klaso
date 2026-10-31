import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'

const TABS = [
  { id: 'enrolled', label: 'Enrolled', icon: 'book-outline' },
  { id: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { id: 'history', label: 'History', icon: 'receipt-outline' },
]

export default function PurchasesScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('enrolled')
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [savedCourses, setSavedCourses] = useState([])
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    let unsubEnrollments = () => {}
    let unsubSaved = () => {}
    let unsubTransactions = () => {}

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubEnrollments()
      unsubSaved()
      unsubTransactions()

      if (!user) {
        setEnrolledCourses([])
        setSavedCourses([])
        setPurchaseHistory([])
        setLoading(false)
        return
      }

      setLoading(true)
      const qEnrollments = query(
        collection(db, 'enrollments'),
        where('userId', '==', user.uid)
      )
      unsubEnrollments = onSnapshot(
        qEnrollments,
        (snapshot) => {
          setEnrolledCourses(snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })))
          setLoading(false)
        },
        () => setLoading(false)
      )

      const qSaved = query(
        collection(db, 'saved_courses'),
        where('userId', '==', user.uid)
      )
      unsubSaved = onSnapshot(qSaved, (snapshot) => {
        setSavedCourses(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })))
      })

      const qTransactions = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      )
      unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
        setPurchaseHistory(snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })))
      })
    })

    return () => {
      unsubscribeAuth()
      unsubEnrollments()
      unsubSaved()
      unsubTransactions()
    }
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }

  const renderEnrolledItem = ({ item }) => (
    <Pressable
      style={[
        styles.courseCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() =>
        router.push({
          pathname: '/screens/lesson',
          params: { courseId: item.courseId || item.id, title: item.title },
        })
      }
    >
      {item.image || item.thumbnailUrl ? (
        <Image source={{ uri: item.image || item.thumbnailUrl }} style={styles.courseThumb} />
      ) : (
        <View style={[styles.courseThumb, styles.courseThumbFallback, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="book-outline" size={28} color={colors.primary} />
        </View>
      )}
      <View style={styles.courseContent}>
        <View style={styles.courseTopRow}>
          <Text
            style={[
              styles.subjectTag,
              {
                backgroundColor: isDark ? '#14331C' : '#E8F5E9',
                color: isDark ? '#4ADE80' : '#15803D',
              },
            ]}
          >
            {item.subject || ''}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
            {item.lastAccessed || 'Enrolled'}
          </Text>
        </View>

        <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.tutorName, { color: colors.textMuted }]}>
          {item.tutor?.name || item.tutor || ''}
        </Text>

        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {item.totalLessons != null
                ? `Lesson ${item.completedLessons || 0} of ${item.totalLessons}`
                : `${item.completedLessons || 0} lessons completed`}
            </Text>
            <Text style={[styles.percentText, { color: colors.primary }]}>
              {Math.round((item.progress || 0) * 100)}%
            </Text>
          </View>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: isDark ? '#233228' : '#E5E7EB' },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round((item.progress || 0) * 100)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>

        <View
          style={[
            styles.cardBottomRow,
            { borderTopColor: isDark ? '#233228' : '#F3F4F6' },
          ]}
        >
          <Text
            style={[styles.nextLessonText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.nextLesson ? `Next: ${item.nextLesson}` : 'Resume course'}
          </Text>
          <View style={[styles.resumeBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
            <Text style={styles.resumeBtnText}>Resume</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )

  const renderSavedItem = ({ item }) => (
    <Pressable
      style={[
        styles.courseCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() =>
        router.push({
          pathname: '/course-details',
          params: { id: item.courseId || item.id, title: item.title },
        })
      }
    >
      {item.image || item.thumbnailUrl ? (
        <Image source={{ uri: item.image || item.thumbnailUrl }} style={styles.courseThumb} />
      ) : (
        <View style={[styles.courseThumb, styles.courseThumbFallback, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="book-outline" size={28} color={colors.primary} />
        </View>
      )}
      <View style={styles.courseContent}>
        <View style={styles.courseTopRow}>
          <Text
            style={[
              styles.subjectTag,
              {
                backgroundColor: isDark ? '#14331C' : '#E8F5E9',
                color: isDark ? '#4ADE80' : '#15803D',
              },
            ]}
          >
            {item.subject || ''}
          </Text>
          {item.rating != null ? (
            <View style={styles.savedRating}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.ratingVal, { color: colors.text }]}>{item.rating}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.tutorName, { color: colors.textMuted }]}>
          {item.tutor?.name || item.tutor || ''}
        </Text>

        <View
          style={[
            styles.savedBottomRow,
            { borderTopColor: isDark ? '#233228' : '#F3F4F6' },
          ]}
        >
          <Text style={[styles.savedPrice, { color: colors.primary }]}>
            {typeof item.price === 'number' ? `₦${item.price.toLocaleString()}` : ''}
          </Text>
          <View style={[styles.enrollBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.enrollBtnText}>Enroll Now</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )

  const renderHistoryItem = ({ item }) => (
    <Pressable
      style={[
        styles.historyCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => setSelectedReceipt(item)}
    >
      <View style={styles.receiptIconCol}>
        <View
          style={[
            styles.receiptIconBadge,
            { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
          ]}
        >
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
      </View>

      <View style={styles.receiptMainInfo}>
        <View style={styles.receiptTop}>
          <Text style={[styles.receiptTxnId, { color: colors.textMuted }]}>
            {item.reference || item.id}
          </Text>
            <View style={styles.statusSuccessBadge}>
              <Ionicons name="ellipse" size={9} color={item.status?.toLowerCase() === 'completed' ? '#15803D' : colors.textMuted} />
              <Text style={[styles.statusSuccessText, { color: colors.textMuted }]}>{item.status || '—'}</Text>
          </View>
        </View>

        <Text style={[styles.receiptCourseTitle, { color: colors.text }]} numberOfLines={1}>
          {item.courseTitle || item.title || '—'}
        </Text>

        <View style={styles.receiptMetaRow}>
          <Text style={[styles.receiptDate, { color: colors.textMuted }]}>
            {[item.date, item.paymentMethod].filter(Boolean).join(' • ')}
          </Text>
          <Text style={[styles.receiptAmount, { color: colors.text }]}>
            {typeof item.amount === 'number' ? `₦${item.amount.toLocaleString()}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  )

  const emptyDescriptions = {
    enrolled: {
      title: 'No Enrolled Courses Yet',
      sub: 'Browse our catalog and enroll in university & exam preparation courses to start learning.',
      btn: 'Discover Courses',
      action: () => router.push('/(tabs)'),
    },
    saved: {
      title: 'No Saved Courses',
      sub: 'Tap the bookmark icon on any course details screen to save it here for later review.',
      btn: 'Explore Catalog',
      action: () => router.push('/(tabs)'),
    },
    history: {
      title: 'No Payment History',
      sub: 'All your course purchases, receipts, and invoices will be stored here securely.',
      btn: 'Browse Tutors',
      action: () => router.push('/(tabs)/tutors'),
    },
  }

  const currentEmpty = emptyDescriptions[activeTab]

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        showBack={false}
        title="My Learning"
        subtitle="Enrolled courses, bookmarks & receipts"
      />

      {/* Tabs Switcher */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? colors.card : '#F3F4F6',
            borderColor: colors.border,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabItem,
                isActive && [
                  styles.tabItemActive,
                  { backgroundColor: isDark ? '#1C2920' : '#FFFFFF' },
                ],
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabItemText,
                  {
                    color: isActive ? colors.primary : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* List Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your courses...
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            activeTab === 'enrolled'
              ? enrolledCourses
              : activeTab === 'saved'
              ? savedCourses
              : purchaseHistory
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                ]}
              >
                <Ionicons
                  name={
                    activeTab === 'enrolled'
                      ? 'book-outline'
                      : activeTab === 'saved'
                      ? 'bookmark-outline'
                      : 'receipt-outline'
                  }
                  size={36}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {currentEmpty.title}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {currentEmpty.sub}
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={currentEmpty.action}
              >
                <Text style={styles.emptyBtnText}>{currentEmpty.btn}</Text>
              </Pressable>
            </View>
          }
          renderItem={
            activeTab === 'enrolled'
              ? renderEnrolledItem
              : activeTab === 'saved'
              ? renderSavedItem
              : renderHistoryItem
          }
        />
      )}

      {/* RECEIPT MODAL */}
      <Modal visible={!!selectedReceipt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.receiptSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.receiptSheetHeader}>
              <View>
                <Text style={[styles.receiptSheetTitle, { color: colors.text }]}>
                  Payment Receipt
                </Text>
                <Text style={[styles.receiptSheetSub, { color: colors.textMuted }]}>
                  Transaction details
                </Text>
              </View>
              <Pressable onPress={() => setSelectedReceipt(null)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </Pressable>
            </View>

            {selectedReceipt && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View
                  style={[
                    styles.receiptCardBox,
                    {
                      backgroundColor: isDark ? '#1C2920' : '#F9FAFB',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.receiptHeaderRow}>
                    <Text style={[styles.receiptBrand, { color: colors.primary }]}>
                      KLASO ACADEMY
                    </Text>
                    <View style={[styles.receiptPaidTag, { backgroundColor: selectedReceipt.status?.toLowerCase() === 'completed' ? '#15803D' : colors.textMuted }]}>
                      <Text style={styles.receiptPaidText}>{selectedReceipt.status || '—'}</Text>
                    </View>
                  </View>

                  <Text style={[styles.receiptTotalAmount, { color: colors.text }]}>
                    {typeof selectedReceipt.amount === 'number' ? `₦${selectedReceipt.amount.toLocaleString()}` : ''}
                  </Text>
                  <Text style={[styles.receiptItemTitle, { color: colors.textSecondary }]}>
                    {selectedReceipt.courseTitle || selectedReceipt.title || '—'}
                  </Text>

                  <View
                    style={[
                      styles.receiptDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <View style={styles.receiptDetailRow}>
                    <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                      Transaction Reference
                    </Text>
                    <Text style={[styles.detailVal, { color: colors.text }]}>
                      {selectedReceipt.reference || selectedReceipt.id}
                    </Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                      Payment Method
                    </Text>
                    <Text style={[styles.detailVal, { color: colors.text }]}>
                      {selectedReceipt.paymentMethod || ''}
                    </Text>
                  </View>

                  <View style={styles.receiptDetailRow}>
                    <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                      Date
                    </Text>
                    <Text style={[styles.detailVal, { color: colors.text }]}>
                      {selectedReceipt.date || ''}
                    </Text>
                  </View>

                  <View style={styles.receiptDetailRow}>
                    <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                      Customer Email
                    </Text>
                    <Text style={[styles.detailVal, { color: colors.text }]}>
                      {auth.currentUser?.email || ''}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.closeSheetBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedReceipt(null)}
                >
                  <Text style={styles.closeSheetBtnText}>Done</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabItemText: {
    fontSize: 13,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },

  courseCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  courseThumb: {
    height: 120,
    width: '100%',
    backgroundColor: '#0F1A13',
  },
  courseContent: {
    padding: 14,
  },
  courseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 11,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  tutorName: {
    fontSize: 12,
    marginTop: 4,
  },

  progressSection: {
    marginTop: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 11,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  nextLessonText: {
    fontSize: 12,
    flex: 1,
    marginRight: 10,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  savedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  savedBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  savedPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  enrollBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enrollBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  receiptIconCol: {
    justifyContent: 'center',
  },
  receiptIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptMainInfo: {
    flex: 1,
  },
  receiptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  receiptTxnId: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusSuccessText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  receiptCourseTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptDate: {
    fontSize: 12,
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: '800',
  },

  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 18,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  receiptSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  receiptSheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  receiptCardBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptBrand: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  receiptPaidTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptPaidText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  receiptTotalAmount: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  receiptItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },
  receiptDivider: {
    height: 1,
    marginBottom: 14,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailKey: {
    fontSize: 12,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeSheetBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSheetBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
