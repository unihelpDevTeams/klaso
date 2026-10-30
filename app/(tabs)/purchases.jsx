import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { collection, getDocs, query, where } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
import Header from '../components/header'

const TABS = [
  { id: 'enrolled', label: 'Enrolled', icon: 'book-outline' },
  { id: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { id: 'history', label: 'History', icon: 'receipt-outline' },
]

const DEFAULT_ENROLLED = [
  {
    id: '1',
    title: 'Mastering Algebra Basics & Linear Equations',
    tutor: 'Mr. Adebayo & Engr. Tunde',
    subject: 'Mathematics',
    progress: 0.68,
    completedLessons: 8,
    totalLessons: 12,
    nextLesson: 'Solving Simultaneous Equations',
    duration: '4h 30m total',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
    lastAccessed: 'Yesterday',
  },
  {
    id: '2',
    title: 'Cellular Biology & Genetics Foundations',
    tutor: 'Dr. Ngozi Eze',
    subject: 'Science',
    progress: 0.45,
    completedLessons: 5,
    totalLessons: 11,
    nextLesson: 'Mendelian Genetics & Inheritance',
    duration: '5h 15m total',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
    lastAccessed: '3 days ago',
  },
  {
    id: '3',
    title: 'Python for Beginners & Practical Projects',
    tutor: 'Chukwuma Obi',
    subject: 'Computer Science',
    progress: 0.2,
    completedLessons: 3,
    totalLessons: 15,
    nextLesson: 'Control Flow and Loops',
    duration: '7h 45m total',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    lastAccessed: 'Oct 24, 2026',
  },
]

const DEFAULT_SAVED = [
  {
    id: 'saved-1',
    title: 'IELTS Academic Writing & Speaking Masterclass',
    tutor: 'Mrs. Funmi Bello',
    subject: 'Languages',
    rating: 4.9,
    reviews: 110,
    price: 15000,
    lessonsCount: 14,
    duration: '6h 20m',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'saved-2',
    title: 'Microeconomics & Financial Principles for WAEC',
    tutor: 'Amina Yusuf',
    subject: 'Business',
    rating: 4.85,
    reviews: 74,
    price: 12000,
    lessonsCount: 10,
    duration: '4h 50m',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
  },
]

const DEFAULT_HISTORY = [
  {
    id: 'TXN-90412',
    courseTitle: 'Mastering Algebra Basics & Linear Equations',
    date: 'Oct 20, 2026',
    amount: 14500,
    paymentMethod: 'Paystack (Debit Card)',
    status: 'Completed',
    recipient: 'Klaso Online Academy',
    vat: 1087,
  },
  {
    id: 'TXN-88231',
    courseTitle: 'Cellular Biology & Genetics Foundations',
    date: 'Oct 14, 2026',
    amount: 12000,
    paymentMethod: 'Bank Transfer',
    status: 'Completed',
    recipient: 'Klaso Online Academy',
    vat: 900,
  },
  {
    id: 'TXN-79104',
    courseTitle: 'Python for Beginners & Practical Projects',
    date: 'Sep 29, 2026',
    amount: 18500,
    paymentMethod: 'Paystack (USSD)',
    status: 'Completed',
    recipient: 'Klaso Online Academy',
    vat: 1387,
  },
]

export default function PurchasesScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('enrolled')
  const [enrolledCourses, setEnrolledCourses] = useState(DEFAULT_ENROLLED)
  const [savedCourses, setSavedCourses] = useState(DEFAULT_SAVED)
  const [purchaseHistory, setPurchaseHistory] = useState(DEFAULT_HISTORY)
  const [refreshing, setRefreshing] = useState(false)

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const loadUserData = async () => {
    try {
      const user = auth.currentUser
      if (!user) return

      // Load enrollments from Firestore if available
      const q = query(collection(db, 'enrollments'), where('userId', '==', user.uid))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setEnrolledCourses(list)
      }
    } catch {
      // Fallback to default
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadUserData()
    setRefreshing(false)
  }

  const handleRemoveSaved = (id) => {
    Alert.alert('Remove Course', 'Are you sure you want to remove this course from your saved list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setSavedCourses((prev) => prev.filter((item) => item.id !== id))
        },
      },
    ])
  }

  const handleContinueCourse = (course) => {
    router.push({
      pathname: '/screens/lesson',
      params: { id: course.id, title: course.title },
    })
  }

  const handleEnrollSaved = (course) => {
    // Add to enrolled list and remove from saved
    const newEnrolled = {
      id: course.id,
      title: course.title,
      tutor: course.tutor,
      subject: course.subject,
      progress: 0.05,
      completedLessons: 1,
      totalLessons: course.lessonsCount || 10,
      nextLesson: 'Module 1: Introduction',
      duration: course.duration,
      image: course.image,
      lastAccessed: 'Just now',
    }
    setEnrolledCourses((prev) => [newEnrolled, ...prev])
    setSavedCourses((prev) => prev.filter((item) => item.id !== course.id))
    setActiveTab('enrolled')
    Alert.alert('Enrollment Successful', `You are now enrolled in "${course.title}". Start learning right away!`)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Header
        showBack={false}
        title="My Learning"
        subtitle="Track enrolled courses, saved subjects & receipts"
      />

      {/* Segmented Top Tabs */}
      <View style={styles.segmentedContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          let badgeCount = 0
          if (tab.id === 'enrolled') badgeCount = enrolledCourses.length
          if (tab.id === 'saved') badgeCount = savedCourses.length
          if (tab.id === 'history') badgeCount = purchaseHistory.length

          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? '#15803D' : '#718178'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                {tab.label}
              </Text>
              <View style={[styles.segmentBadge, isActive && styles.segmentBadgeActive]}>
                <Text style={[styles.segmentBadgeText, isActive && styles.segmentBadgeTextActive]}>
                  {badgeCount}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Content depending on Active Tab */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803D']} />}
      >
        {/* ENROLLED TAB */}
        {activeTab === 'enrolled' && (
          <View style={styles.tabSection}>
            {enrolledCourses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="school-outline" size={54} color="#B4C2B8" />
                <Text style={styles.emptyTitle}>No courses in progress</Text>
                <Text style={styles.emptySub}>
                  You haven't enrolled in any courses yet. Explore our top courses and start learning today!
                </Text>
                <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
                  <Text style={styles.browseButtonText}>Explore Courses</Text>
                </Pressable>
              </View>
            ) : (
              enrolledCourses.map((course) => {
                const percent = Math.round(course.progress * 100)
                return (
                  <View key={course.id} style={styles.enrolledCard}>
                    <Image source={{ uri: course.image }} style={styles.courseImage} />
                    <View style={styles.enrolledBody}>
                      <View style={styles.badgeRow}>
                        <View style={styles.subjectBadge}>
                          <Text style={styles.subjectBadgeText}>{course.subject}</Text>
                        </View>
                        <Text style={styles.lastAccessedText}>Last seen: {course.lastAccessed}</Text>
                      </View>

                      <Text style={styles.courseTitle}>{course.title}</Text>
                      <Text style={styles.tutorSubtitle}>Instructor: {course.tutor}</Text>

                      {/* Progress bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${percent}%` }]} />
                        </View>
                        <View style={styles.progressDetailsRow}>
                          <Text style={styles.progressPercent}>{percent}% completed</Text>
                          <Text style={styles.progressLessons}>
                            {course.completedLessons}/{course.totalLessons} lessons
                          </Text>
                        </View>
                      </View>

                      {/* Next lesson info */}
                      {course.nextLesson && (
                        <View style={styles.nextLessonBox}>
                          <Ionicons name="play-circle-outline" size={16} color="#15803D" />
                          <Text style={styles.nextLessonText} numberOfLines={1}>
                            Next: {course.nextLesson}
                          </Text>
                        </View>
                      )}

                      {/* Action */}
                      <Pressable
                        style={styles.continueButton}
                        onPress={() => handleContinueCourse(course)}
                        accessibilityLabel={`Continue ${course.title}`}
                      >
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                        <Text style={styles.continueButtonText}>Continue Learning</Text>
                      </Pressable>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}

        {/* SAVED TAB */}
        {activeTab === 'saved' && (
          <View style={styles.tabSection}>
            {savedCourses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bookmark-outline" size={54} color="#B4C2B8" />
                <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                <Text style={styles.emptySub}>
                  Bookmark interesting courses from the home feed or tutors to review them here anytime.
                </Text>
                <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
                  <Text style={styles.browseButtonText}>Find Courses to Save</Text>
                </Pressable>
              </View>
            ) : (
              savedCourses.map((course) => (
                <View key={course.id} style={styles.savedCard}>
                  <Image source={{ uri: course.image }} style={styles.savedThumbnail} />
                  <View style={styles.savedContent}>
                    <View style={styles.savedTopRow}>
                      <View style={styles.subjectBadge}>
                        <Text style={styles.subjectBadgeText}>{course.subject}</Text>
                      </View>
                      <Pressable onPress={() => handleRemoveSaved(course.id)} hitSlop={8}>
                        <Ionicons name="bookmark" size={20} color="#15803D" />
                      </Pressable>
                    </View>

                    <Text style={styles.savedTitle} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <Text style={styles.savedTutor}>By {course.tutor}</Text>

                    <View style={styles.savedMetaRow}>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#F5A623" />
                        <Text style={styles.ratingText}>{course.rating}</Text>
                      </View>
                      <Text style={styles.durationMeta}>• {course.duration}</Text>
                      <Text style={styles.lessonsMeta}>• {course.lessonsCount} lessons</Text>
                    </View>

                    <View style={styles.savedActionRow}>
                      <Text style={styles.savedPrice}>₦{course.price.toLocaleString()}</Text>
                      <Pressable
                        style={styles.enrollNowBtn}
                        onPress={() => handleEnrollSaved(course)}
                        accessibilityLabel={`Enroll in ${course.title}`}
                      >
                        <Text style={styles.enrollNowText}>Enroll Now</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ORDER HISTORY TAB */}
        {activeTab === 'history' && (
          <View style={styles.tabSection}>
            {purchaseHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={54} color="#B4C2B8" />
                <Text style={styles.emptyTitle}>No transaction records</Text>
                <Text style={styles.emptySub}>
                  When you purchase courses or tutor sessions, official invoices and payment receipts will appear here.
                </Text>
              </View>
            ) : (
              purchaseHistory.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <View style={styles.refWrap}>
                      <Text style={styles.receiptRef}>{item.id}</Text>
                      <Text style={styles.receiptDate}>{item.date}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.historyTitle}>{item.courseTitle}</Text>

                  <View style={styles.historyFooter}>
                    <View>
                      <Text style={styles.historyMethodLabel}>{item.paymentMethod}</Text>
                      <Text style={styles.historyAmount}>₦{item.amount.toLocaleString()}</Text>
                    </View>

                    <Pressable
                      style={styles.receiptButton}
                      onPress={() => setSelectedReceipt(item)}
                      accessibilityLabel={`View receipt for ${item.id}`}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#15803D" />
                      <Text style={styles.receiptButtonText}>View Receipt</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Official Receipt Details */}
      <Modal visible={!!selectedReceipt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Official Payment Receipt</Text>
              <Pressable onPress={() => setSelectedReceipt(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#14351D" />
              </Pressable>
            </View>

            {selectedReceipt && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.receiptStampBox}>
                  <View style={styles.receiptStampCircle}>
                    <Ionicons name="checkmark-done" size={36} color="#15803D" />
                  </View>
                  <Text style={styles.receiptPaidAmount}>
                    ₦{selectedReceipt.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.receiptPaymentSuccess}>Payment Successful</Text>
                  <Text style={styles.receiptRefCode}>Ref: {selectedReceipt.id}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Issued To</Text>
                  <Text style={styles.invoiceValue}>
                    {auth.currentUser?.displayName || 'Registered Student'}
                  </Text>
                </View>

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Item Purchased</Text>
                  <Text style={[styles.invoiceValue, { maxWidth: '60%', textAlign: 'right' }]}>
                    {selectedReceipt.courseTitle}
                  </Text>
                </View>

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Transaction Date</Text>
                  <Text style={styles.invoiceValue}>{selectedReceipt.date}</Text>
                </View>

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Payment Method</Text>
                  <Text style={styles.invoiceValue}>{selectedReceipt.paymentMethod}</Text>
                </View>

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Issuer</Text>
                  <Text style={styles.invoiceValue}>{selectedReceipt.recipient}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Subtotal</Text>
                  <Text style={styles.invoiceValue}>
                    ₦{(selectedReceipt.amount - selectedReceipt.vat).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>VAT & Processing</Text>
                  <Text style={styles.invoiceValue}>₦{selectedReceipt.vat.toLocaleString()}</Text>
                </View>

                <View style={[styles.invoiceRow, { marginTop: 8 }]}>
                  <Text style={[styles.invoiceLabel, { fontWeight: '800', color: '#14351D', fontSize: 16 }]}>
                    Total Paid
                  </Text>
                  <Text style={[styles.invoiceValue, { fontWeight: '800', color: '#15803D', fontSize: 18 }]}>
                    ₦{selectedReceipt.amount.toLocaleString()}
                  </Text>
                </View>

                <Pressable
                  style={styles.downloadReceiptBtn}
                  onPress={() => {
                    Alert.alert('Receipt Downloaded', 'Receipt has been saved to your downloads and sent to your email.')
                    setSelectedReceipt(null)
                  }}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadReceiptText}>Download PDF Receipt</Text>
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
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  segmentedContainer: {
    backgroundColor: '#F5FAF5',
    borderColor: '#E2EBE4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segmentLabel: {
    color: '#718178',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  segmentBadge: {
    backgroundColor: '#E8EFEA',
    borderRadius: 10,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  segmentBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  segmentBadgeText: {
    color: '#718178',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentBadgeTextActive: {
    color: '#15803D',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  tabSection: {
    gap: 16,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FAFCFA',
    borderColor: '#E8EFEA',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 30,
    padding: 30,
  },
  emptyTitle: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  emptySub: {
    color: '#718178',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  enrolledCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  courseImage: {
    backgroundColor: '#E8F5E9',
    height: 140,
    width: '100%',
  },
  enrolledBody: {
    padding: 16,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjectBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  subjectBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  lastAccessedText: {
    color: '#8A9B8E',
    fontSize: 12,
  },
  courseTitle: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  tutorSubtitle: {
    color: '#718178',
    fontSize: 13,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 14,
  },
  progressTrack: {
    backgroundColor: '#EAEFEA',
    borderRadius: 4,
    height: 7,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#15803D',
    borderRadius: 4,
    height: '100%',
  },
  progressDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressPercent: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  progressLessons: {
    color: '#718178',
    fontSize: 12,
  },
  nextLessonBox: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nextLessonText: {
    color: '#14351D',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  savedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  savedThumbnail: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    height: 100,
    width: 90,
  },
  savedContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  savedTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savedTitle: {
    color: '#14351D',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  savedTutor: {
    color: '#718178',
    fontSize: 12,
    marginTop: 2,
  },
  savedMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  ratingBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    color: '#14351D',
    fontSize: 11,
    fontWeight: '700',
  },
  durationMeta: {
    color: '#718178',
    fontSize: 11,
  },
  lessonsMeta: {
    color: '#718178',
    fontSize: 11,
  },
  savedActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  savedPrice: {
    color: '#15803D',
    fontSize: 15,
    fontWeight: '800',
  },
  enrollNowBtn: {
    backgroundColor: '#15803D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  enrollNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  historyTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refWrap: {
    gap: 2,
  },
  receiptRef: {
    color: '#14351D',
    fontSize: 14,
    fontWeight: '800',
  },
  receiptDate: {
    color: '#8A9B8E',
    fontSize: 12,
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  historyTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  historyFooter: {
    alignItems: 'center',
    borderTopColor: '#F0F4F1',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
  },
  historyMethodLabel: {
    color: '#8A9B8E',
    fontSize: 11,
  },
  historyAmount: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
  },
  receiptButton: {
    alignItems: 'center',
    borderColor: '#CDE4D4',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  receiptButtonText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  receiptModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#F0F2F1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  modalTitle: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
  },
  receiptStampBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  receiptStampCircle: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: 12,
    width: 72,
  },
  receiptPaidAmount: {
    color: '#14351D',
    fontSize: 26,
    fontWeight: '900',
  },
  receiptPaymentSuccess: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  receiptRefCode: {
    color: '#8A9B8E',
    fontSize: 12,
    marginTop: 2,
  },
  receiptDivider: {
    backgroundColor: '#F0F4F1',
    height: 1,
    marginVertical: 14,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  invoiceLabel: {
    color: '#718178',
    fontSize: 13,
  },
  invoiceValue: {
    color: '#14351D',
    fontSize: 13,
    fontWeight: '600',
  },
  downloadReceiptBtn: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 24,
  },
  downloadReceiptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
