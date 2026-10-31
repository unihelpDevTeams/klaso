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

export default function CourseDetailsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { colors, isDark } = useTheme()

  const courseId = params.id ? String(params.id) : ''
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [savingBookmark, setSavingBookmark] = useState(false)

  useEffect(() => {
    let active = true

    async function fetchCourseDetails() {
      setLoading(true)
      setLoadError('')
      try {
        if (!courseId) {
          setCourse(null)
          setLoadError('No course was selected.')
          return
        }

        const docRef = doc(db, 'courses', courseId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setCourse(null)
          setLoadError('This course could not be found or is no longer available.')
          return
        }

        const data = docSnap.data()
        let curriculum = Array.isArray(data.curriculum) ? data.curriculum : []

        if (curriculum.length === 0 && data.lessonId) {
          const lessonSnapshot = await getDoc(doc(db, 'lessons', data.lessonId))
          if (lessonSnapshot.exists()) {
            const lesson = lessonSnapshot.data()
            curriculum = [{
              id: lessonSnapshot.id,
              title: lesson.title,
              description: lesson.description,
              duration: lesson.duration,
              isFree: lesson.isFree === true,
              videoUrl: lesson.videoUrl,
            }]
          }
        } else if (curriculum.length === 0) {
          const lessonSnapshot = await getDocs(
            query(collection(db, 'lessons'), where('courseId', '==', courseId))
          )
          curriculum = lessonSnapshot.docs.map((lessonDoc) => {
            const lesson = lessonDoc.data()
            return {
              id: lessonDoc.id,
              title: lesson.title,
              description: lesson.description,
              duration: lesson.duration,
              isFree: lesson.isFree === true,
              videoUrl: lesson.videoUrl,
            }
          })
        }

        if (!active) return

        const tutor =
          typeof data.tutor === 'string'
            ? { name: data.tutor }
            : data.tutor && typeof data.tutor === 'object'
              ? data.tutor
              : null
        const parsedPrice =
          typeof data.price === 'number'
            ? data.price
            : typeof data.price === 'string' && data.price.trim()
              ? Number(data.price)
              : NaN
        const price = Number.isFinite(parsedPrice) ? parsedPrice : null
        const parsedOriginalPrice =
          typeof data.originalPrice === 'number'
            ? data.originalPrice
            : typeof data.originalPrice === 'string' && data.originalPrice.trim()
              ? Number(data.originalPrice)
              : NaN

        setCourse({
          id: docSnap.id,
          title: data.title || params.title || '',
          headline: data.headline || data.description || '',
          subject: data.subject || '',
          level: data.level || '',
          rating: Number.isFinite(data.rating) ? data.rating : null,
          reviewsCount: Number.isFinite(data.reviewsCount) ? data.reviewsCount : null,
          studentsCount: data.studentsCount ?? null,
          duration: data.duration || '',
          videoUrl: data.videoUrl || '',
          lessonsCount: typeof data.lessonsCount === 'number' ? data.lessonsCount : curriculum.length,
          price,
          originalPrice: Number.isFinite(parsedOriginalPrice) ? parsedOriginalPrice : null,
          image: data.thumbnailUrl || data.image || '',
          tutor,
          learningPoints: Array.isArray(data.learningPoints) ? data.learningPoints : [],
          curriculum,
        })
      } catch (error) {
        console.error('Error fetching course details:', error)
        if (active) {
          setCourse(null)
          setLoadError('Unable to load this course right now. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
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

    return () => {
      active = false
    }
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
    } catch (_err) {
      setIsBookmarked(!isBookmarked)
    } finally {
      setSavingBookmark(false)
    }
  }

  const handleEnroll = () => {
    if (!course) return
    if (typeof course.price !== 'number' || course.price < 0) {
      Alert.alert('Price unavailable', 'The tutor has not set a price for this course yet.')
      return
    }

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

  if (loading) {
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

  if (!course) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.notFoundContainer}>
          <View style={[styles.notFoundIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="book-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Course unavailable</Text>
          <Text style={[styles.notFoundMessage, { color: colors.textMuted }]}>
            {loadError || 'This course could not be found.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backToCoursesButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.enrollButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const canEnroll = typeof course.price === 'number' && course.price >= 0

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
          {course.image ? (
            <Image source={{ uri: course.image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImageFallback, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="book-outline" size={48} color={colors.primary} />
            </View>
          )}
          {course.videoUrl && (
            <Pressable
              style={styles.playButtonOverlay}
              onPress={() =>
                router.push({
                  pathname: '/screens/lesson',
                  params: { courseId: course.id, title: course.title, videoUrl: course.videoUrl },
                })
              }
            >
              <View style={[styles.playIconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.previewTag}>Open lesson</Text>
            </Pressable>
          )}
        </View>

        {/* Main Details Body */}
        <View
          style={[
            styles.contentCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.badgeRow}>
            {!!course.subject && (
              <View
                style={[
                  styles.subjectChip,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    { color: colors.primary },
                  ]}
                >
                  {course.subject}
                </Text>
              </View>
            )}
            {!!course.level && (
              <View
                style={[
                  styles.levelChip,
                  { backgroundColor: colors.borderSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.levelChipText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {course.level}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
          {!!course.headline && (
            <Text style={[styles.courseHeadline, { color: colors.textSecondary }]}>
              {course.headline}
            </Text>
          )}

          {/* Social Proof Stats */}
          {(course.rating !== null || course.studentsCount !== null || course.duration) && (
            <View
              style={[
                styles.statsBar,
                { backgroundColor: colors.borderSubtle, borderColor: colors.border },
              ]}
            >
              {course.rating !== null && (
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#F5A623" />
                  <Text style={[styles.statBold, { color: colors.text }]}>{course.rating}</Text>
                  {course.reviewsCount !== null && (
                    <Text style={[styles.statMuted, { color: colors.textMuted }]}>
                      ({course.reviewsCount})
                    </Text>
                  )}
                </View>
              )}
              {course.rating !== null && (course.studentsCount !== null || course.duration) && (
                <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
              )}
              {course.studentsCount !== null && (
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.statBold, { color: colors.text }]}>
                    {course.studentsCount}
                  </Text>
                  <Text style={[styles.statMuted, { color: colors.textMuted }]}>students</Text>
                </View>
              )}
              {course.studentsCount !== null && course.duration && (
                <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
              )}
              {!!course.duration && (
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.statBold, { color: colors.text }]}>{course.duration}</Text>
                </View>
              )}
            </View>
          )}

          {/* Instructor Card */}
          {course.tutor?.name && (
            <View
              style={[
                styles.instructorBox,
                { backgroundColor: colors.borderSubtle, borderColor: colors.border },
              ]}
            >
              {course.tutor.avatar ? (
                <Image source={{ uri: course.tutor.avatar }} style={styles.tutorAvatar} />
              ) : (
                <View style={[styles.tutorAvatarFallback, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person-outline" size={20} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.tutorName, { color: colors.text }]}>
                    {course.tutor.name}
                  </Text>
                  {course.tutor.verified === true && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  )}
                </View>
                {!!course.tutor.title && (
                  <Text style={[styles.tutorTitle, { color: colors.textMuted }]} numberOfLines={2}>
                    {course.tutor.title}
                  </Text>
                )}
                {(course.tutor.rating || course.tutor.students) && (
                  <Text style={[styles.tutorMeta, { color: colors.primary }]}>
                    {[
                      course.tutor.rating && `★ ${course.tutor.rating} rating`,
                      course.tutor.students && `${course.tutor.students} students`,
                    ].filter(Boolean).join(' • ')}
                  </Text>
                )}
              </View>
            </View>
          )}

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
                Curriculum ({course.curriculum.length})
              </Text>
            </Pressable>
          </View>

          {/* OVERVIEW CONTENT */}
          {activeTab === 'overview' && (
            <View style={styles.tabContentSection}>
              {course.learningPoints.length > 0 ? (
                <>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    What You Will Learn
                  </Text>
                  <View style={styles.learningGrid}>
                    {course.learningPoints.map((point, index) => (
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
                </>
              ) : (
                <Text style={[styles.emptyDetailsText, { color: colors.textMuted }]}>
                  The tutor has not added course outcomes yet.
                </Text>
              )}
            </View>
          )}

          {/* CURRICULUM CONTENT */}
          {activeTab === 'curriculum' && (
            <View style={styles.tabContentSection}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Lesson Modules
              </Text>
              {course.curriculum.length > 0 ? (
                <View style={styles.curriculumList}>
                  {course.curriculum.map((mod, index) => (
                    <Pressable
                      key={mod.id || index}
                      style={[
                        styles.curriculumItem,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (mod.isFree && (mod.videoUrl || course.videoUrl)) {
                          router.push({
                            pathname: '/screens/lesson',
                            params: {
                              courseId: course.id,
                              title: mod.title,
                              videoUrl: mod.videoUrl || course.videoUrl,
                            },
                          })
                        } else if (canEnroll) {
                          handleEnroll()
                        } else {
                          Alert.alert('Lesson unavailable', 'This course does not have a price or an accessible preview yet.')
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.moduleNumberBox,
                          { backgroundColor: mod.isFree ? colors.primaryLight : colors.borderSubtle },
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
                        {!!mod.duration && (
                          <Text style={[styles.moduleDuration, { color: colors.textMuted }]}>
                            {mod.duration}
                          </Text>
                        )}
                      </View>
                      {mod.isFree && (
                        <View
                          style={[
                            styles.freeBadge,
                            { backgroundColor: colors.primaryLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.freeBadgeText,
                              { color: colors.primary },
                            ]}
                          >
                            FREE PREVIEW
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyDetailsText, { color: colors.textMuted }]}>
                  No lesson modules have been added to this course yet.
                </Text>
              )}
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
              {canEnroll ? `₦${course.price.toLocaleString()}` : 'Unavailable'}
            </Text>
            {canEnroll && course.originalPrice && (
              <Text style={[styles.originalPriceCross, { color: colors.textMuted }]}>
                ₦{course.originalPrice.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        <Pressable
          accessibilityState={{ disabled: !canEnroll }}
          disabled={!canEnroll}
          style={[
            styles.enrollButton,
            { backgroundColor: colors.primary, opacity: canEnroll ? 1 : 0.55 },
          ]}
          onPress={handleEnroll}
        >
          <Text style={styles.enrollButtonText}>{canEnroll ? 'Enroll Now' : 'Unavailable'}</Text>
          {canEnroll && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingText: { marginTop: 12, fontSize: 13 },
  notFoundContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  notFoundIcon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  notFoundTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  notFoundMessage: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  backToCoursesButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 24,
  },

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
  heroImageFallback: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
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
  tutorAvatarFallback: {
    alignItems: 'center',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
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
  emptyDetailsText: {
    fontSize: 13,
    lineHeight: 19,
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
