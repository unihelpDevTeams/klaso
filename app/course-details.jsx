import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'
import { REAL_SAMPLE_COURSES } from '../firebase/seedData'

export default function CourseDetailsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { colors, isDark } = useTheme()

  const courseId = params.id ? String(params.id) : '1'
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [savingBookmark, setSavingBookmark] = useState(false)

  // Fetch course from Firestore
  useEffect(() => {
    async function fetchCourseDetails() {
      setLoading(true)
      try {
        const docRef = doc(db, 'courses', courseId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setCourse({
            id: docSnap.id,
            title: data.title || params.title || 'Course Details',
            headline:
              data.headline ||
              'Master this subject with structured video lessons, assignments, and past questions.',
            subject: data.subject || 'General Studies',
            level: data.level || 'Beginner to Intermediate',
            rating: data.rating || 4.9,
            reviewsCount: data.reviewsCount || 140,
            studentsCount: data.studentsCount || '850',
            duration: data.duration || '6 hours total',
            lessonsCount: data.lessonsCount || data.curriculum?.length || 10,
            price: typeof data.price === 'number' ? data.price : 3500,
            originalPrice: data.originalPrice || 7000,
            image:
              data.thumbnailUrl ||
              data.image ||
              'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
            tutor:
              typeof data.tutor === 'object'
                ? data.tutor
                : {
                    name: data.tutor || 'Verified Instructor',
                    title: 'Senior Academic Lecturer & Specialist',
                    avatar:
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
                    rating: 4.95,
                    students: '500+',
                  },
            learningPoints: data.learningPoints || [
              'Master fundamental concepts and critical formulas',
              'Solve past WAEC, JAMB & university examination questions',
              'Develop intuitive problem-solving strategies',
              'Earn a verified digital certificate of completion',
            ],
            curriculum: data.curriculum || [
              {
                id: 'm1',
                title: 'Module 1: Foundational Principles & Introduction',
                duration: '45 mins',
                isFree: true,
              },
              {
                id: 'm2',
                title: 'Module 2: Core Concepts & Step-by-Step Drills',
                duration: '1h 10m',
                isFree: false,
              },
              {
                id: 'm3',
                title: 'Module 3: Advanced Applications & Exam Questions',
                duration: '1h 30m',
                isFree: false,
              },
            ],
          })
        } else {
          // Fallback to sample course
          const fallback =
            REAL_SAMPLE_COURSES.find((c) => c.title === params.title) ||
            REAL_SAMPLE_COURSES[0]
          setCourse({
            id: courseId,
            ...fallback,
            image: fallback.thumbnailUrl,
          })
        }
      } catch (err) {
        console.log('Error fetching course:', err)
        const fallback = REAL_SAMPLE_COURSES[0]
        setCourse({
          id: courseId,
          ...fallback,
          image: fallback.thumbnailUrl,
        })
      } finally {
        setLoading(false)
      }
    }

    // Check if course is already bookmarked
    async function checkBookmark() {
      if (!auth.currentUser) return
      try {
        const q = query(
          collection(db, 'saved_courses'),
          where('userId', '==', auth.currentUser.uid),
          where('courseId', '==', courseId)
        )
        const snap = await getDocs(q)
        setIsBookmarked(!snap.empty)
      } catch {
        // Ignore
      }
    }

    fetchCourseDetails()
    checkBookmark()
  }, [courseId, params.title])

  const handleShare = async () => {
    if (!course) return
    try {
      await Share.share({
        message: `Check out "${course.title}" on Klaso Online Academy! Master ${course.subject} with top tutors.`,
      })
    } catch {
      // dismissed
    }
  }

  const handleBookmark = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to save courses to your wishlist.')
      return
    }

    if (savingBookmark) return
    setSavingBookmark(true)

    try {
      const q = query(
        collection(db, 'saved_courses'),
        where('userId', '==', auth.currentUser.uid),
        where('courseId', '==', courseId)
      )
      const snap = await getDocs(q)

      if (!snap.empty) {
        // Delete bookmark
        const deletes = snap.docs.map((d) => deleteDoc(doc(db, 'saved_courses', d.id)))
        await Promise.all(deletes)
        setIsBookmarked(false)
        Alert.alert('Removed', 'Course removed from your saved list.')
      } else {
        // Add bookmark
        await addDoc(collection(db, 'saved_courses'), {
          userId: auth.currentUser.uid,
          courseId,
          title: course.title,
          subject: course.subject,
          price: course.price,
          rating: course.rating,
          tutor: course.tutor?.name || course.tutor,
          image: course.image || course.thumbnailUrl,
          createdAt: serverTimestamp(),
        })
        setIsBookmarked(true)
        Alert.alert('Saved! 🔖', 'Course added to your Saved list in My Learning tab.')
      }
    } catch (err) {
      setIsBookmarked(!isBookmarked)
    } finally {
      setSavingBookmark(false)
    }
  }

  const handleEnroll = () => {
    if (!course) return
    router.push({
      pathname: '/checkout',
      params: {
        id: course.id,
        title: course.title,
        price: course.price,
        tutor: course.tutor?.name || course.tutor,
        subject: course.subject,
      },
    })
  }

  if (loading || !course) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading course details...
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Floating Nav Bar */}
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.navButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.navRight}>
          <Pressable
            onPress={handleBookmark}
            style={[styles.navButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            hitSlop={10}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? '#4ADE80' : '#FFFFFF'}
            />
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={[styles.navButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            hitSlop={10}
          >
            <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Course Image with Preview Tag */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: course.image }} style={styles.heroImage} resizeMode="cover" />
          <Pressable
            style={styles.playButtonOverlay}
            onPress={() =>
              router.push({
                pathname: '/screens/lesson',
                params: { lessonId: course.id, title: course.title },
              })
            }
          >
            <View style={styles.playIconCircle}>
              <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.previewTag}>Watch Free Preview</Text>
          </Pressable>
        </View>

        {/* Main Details Body */}
        <View
          style={[
            styles.contentCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.subjectChip,
                { backgroundColor: isDark ? '#14331C' : '#E8F5E9' },
              ]}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  { color: isDark ? '#4ADE80' : '#15803D' },
                ]}
              >
                {course.subject}
              </Text>
            </View>
            <View
              style={[
                styles.levelChip,
                { backgroundColor: isDark ? '#1C2920' : '#F3F4F6' },
              ]}
            >
              <Text
                style={[
                  styles.levelChipText,
                  { color: isDark ? colors.textSecondary : '#4B5563' },
                ]}
              >
                {course.level}
              </Text>
            </View>
          </View>

          <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
          <Text style={[styles.courseHeadline, { color: colors.textSecondary }]}>
            {course.headline}
          </Text>

          {/* Social Proof Stats */}
          <View
            style={[
              styles.statsBar,
              { backgroundColor: isDark ? '#1C2920' : '#F8FAF8', borderColor: colors.border },
            ]}
          >
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#F5A623" />
              <Text style={[styles.statBold, { color: colors.text }]}>{course.rating}</Text>
              <Text style={[styles.statMuted, { color: colors.textMuted }]}>
                ({course.reviewsCount})
              </Text>
            </View>
            <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.statBold, { color: colors.text }]}>
                {course.studentsCount}
              </Text>
              <Text style={[styles.statMuted, { color: colors.textMuted }]}>students</Text>
            </View>
            <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.statBold, { color: colors.text }]}>{course.duration}</Text>
            </View>
          </View>

          {/* Instructor Card */}
          <View
            style={[
              styles.instructorBox,
              { backgroundColor: isDark ? '#1C2920' : '#F9FAFB', borderColor: colors.border },
            ]}
          >
            <Image
              source={{
                uri:
                  course.tutor?.avatar ||
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
              }}
              style={styles.tutorAvatar}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.tutorName, { color: colors.text }]}>
                  {course.tutor?.name || course.tutor}
                </Text>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              </View>
              <Text
                style={[styles.tutorTitle, { color: colors.textMuted }]}
                numberOfLines={2}
              >
                {course.tutor?.title || 'Senior Academic Educator'}
              </Text>
              <Text style={[styles.tutorMeta, { color: colors.primary }]}>
                ★ {course.tutor?.rating || '4.95'} rating • {course.tutor?.students || '500+'} students
              </Text>
            </View>
          </View>

          {/* Segmented Detail Tabs */}
          <View
            style={[
              styles.segmentedTabs,
              { backgroundColor: isDark ? '#1C2920' : '#F3F4F6' },
            ]}
          >
            <Pressable
              style={[
                styles.segmentTab,
                activeTab === 'overview' && [
                  styles.segmentTabActive,
                  { backgroundColor: isDark ? '#263A2D' : '#FFFFFF' },
                ],
              ]}
              onPress={() => setActiveTab('overview')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: activeTab === 'overview' ? colors.primary : colors.textMuted,
                    fontWeight: activeTab === 'overview' ? '700' : '500',
                  },
                ]}
              >
                Overview
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentTab,
                activeTab === 'curriculum' && [
                  styles.segmentTabActive,
                  { backgroundColor: isDark ? '#263A2D' : '#FFFFFF' },
                ],
              ]}
              onPress={() => setActiveTab('curriculum')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: activeTab === 'curriculum' ? colors.primary : colors.textMuted,
                    fontWeight: activeTab === 'curriculum' ? '700' : '500',
                  },
                ]}
              >
                Curriculum ({course.curriculum?.length || 0})
              </Text>
            </Pressable>
          </View>

          {/* OVERVIEW CONTENT */}
          {activeTab === 'overview' && (
            <View style={styles.tabContentSection}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                What You Will Learn
              </Text>
              <View style={styles.learningGrid}>
                {course.learningPoints?.map((point, index) => (
                  <View key={index} style={styles.learningRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                      style={{ marginTop: 2 }}
                    />
                    <Text style={[styles.learningText, { color: colors.textSecondary }]}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Course Guarantee
              </Text>
              <View
                style={[
                  styles.guaranteeBox,
                  { backgroundColor: isDark ? '#1C2920' : '#F0FDF4', borderColor: colors.border },
                ]}
              >
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guaranteeTitle, { color: colors.text }]}>
                    Certificate of Completion
                  </Text>
                  <Text style={[styles.guaranteeSub, { color: colors.textMuted }]}>
                    Receive a verifiable digital certificate upon completing all lessons and practice exercises.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* CURRICULUM CONTENT */}
          {activeTab === 'curriculum' && (
            <View style={styles.tabContentSection}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Lesson Modules
              </Text>
              <View style={styles.curriculumList}>
                {course.curriculum?.map((mod, index) => (
                  <Pressable
                    key={mod.id || index}
                    style={[
                      styles.curriculumItem,
                      {
                        backgroundColor: isDark ? '#1C2920' : '#FFFFFF',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      if (mod.isFree) {
                        router.push({
                          pathname: '/screens/lesson',
                          params: { lessonId: course.id, title: mod.title },
                        })
                      } else {
                        handleEnroll()
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.moduleNumberBox,
                        {
                          backgroundColor: mod.isFree
                            ? isDark
                              ? '#14331C'
                              : '#DCFCE7'
                            : isDark
                            ? '#26332A'
                            : '#F3F4F6',
                        },
                      ]}
                    >
                      <Ionicons
                        name={mod.isFree ? 'play' : 'lock-closed'}
                        size={16}
                        color={mod.isFree ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moduleTitle, { color: colors.text }]}>
                        {mod.title}
                      </Text>
                      <Text style={[styles.moduleDuration, { color: colors.textMuted }]}>
                        {mod.duration}
                      </Text>
                    </View>
                    {mod.isFree && (
                      <View
                        style={[
                          styles.freeBadge,
                          { backgroundColor: isDark ? '#14331C' : '#E8F5E9' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.freeBadgeText,
                            { color: isDark ? '#4ADE80' : '#15803D' },
                          ]}
                        >
                          FREE PREVIEW
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Enrollment Bar */}
      <View
        style={[
          styles.bottomCheckoutBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.priceColumn}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
            Total Course Price
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[styles.coursePriceBig, { color: colors.text }]}>
              ₦{course.price?.toLocaleString()}
            </Text>
            {course.originalPrice && (
              <Text style={[styles.originalPriceCross, { color: colors.textMuted }]}>
                ₦{course.originalPrice?.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.enrollButton, { backgroundColor: colors.primary }]}
          onPress={handleEnroll}
        >
          <Text style={styles.enrollButtonText}>Enroll Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingText: { marginTop: 12, fontSize: 13 },

  navBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    flexDirection: 'row',
    gap: 8,
  },

  scrollContent: {
    paddingBottom: 110,
  },

  heroWrapper: {
    height: 240,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0A120D',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  playIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTag: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  contentCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    padding: 20,
    borderTopWidth: 1,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subjectChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  courseTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 6,
  },
  courseHeadline: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  statMuted: {
    fontSize: 12,
  },
  statSeparator: {
    width: 1,
    height: 20,
  },

  instructorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  tutorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F1A13',
  },
  tutorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  tutorTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  tutorMeta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  segmentedTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
  },

  tabContentSection: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 8,
  },
  learningGrid: {
    gap: 10,
  },
  learningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  learningText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  guaranteeSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  curriculumList: {
    gap: 10,
  },
  curriculumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  moduleNumberBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  moduleDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  bottomCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  priceColumn: {
    gap: 2,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  coursePriceBig: {
    fontSize: 22,
    fontWeight: '900',
  },
  originalPriceCross: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
