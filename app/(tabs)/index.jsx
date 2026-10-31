import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { collection, onSnapshot, query as fsQuery, where } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth, db } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'
import { seedFirestoreDatabase } from '../../firebase/seedData'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: '1', label: 'Mathematics' },
  { id: '2', label: 'Science' },
  { id: '3', label: 'Computer Science' },
  { id: '4', label: 'Languages' },
  { id: '5', label: 'Business' },
]

export default function Home() {
  const { colors, isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showSearch, setShowSearch] = useState(false)
  const [courses, setCourses] = useState([])
  const [userEnrollments, setUserEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const firstName = auth.currentUser?.displayName?.split(' ')[0] || 'Learner'

  // Fetch live courses from Firestore
  useEffect(() => {
    setLoading(true)
    const coursesRef = collection(db, 'courses')
    const unsubscribeCourses = onSnapshot(
      coursesRef,
      (snapshot) => {
        const loaded = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setCourses(loaded)
        setLoading(false)
      },
      (error) => {
        console.log('Error fetching courses:', error)
        setLoading(false)
      }
    )

    // Fetch user's enrollments for real stats
    let unsubscribeEnrollments = () => {}
    if (auth.currentUser) {
      const enrollmentsRef = fsQuery(
        collection(db, 'enrollments'),
        where('userId', '==', auth.currentUser.uid)
      )
      unsubscribeEnrollments = onSnapshot(
        enrollmentsRef,
        (snapshot) => {
          const loaded = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          setUserEnrollments(loaded)
        },
        () => {}
      )
    }

    return () => {
      unsubscribeCourses()
      unsubscribeEnrollments()
    }
  }, [auth.currentUser])

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 800)
  }

  const handleQuickSeed = async () => {
    try {
      setSeeding(true)
      await seedFirestoreDatabase(false)
    } catch (err) {
      console.log('Seed error:', err)
    } finally {
      setSeeding(false)
    }
  }

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        selectedCategory === 'All' || course.subject === selectedCategory
      const textSource = `${course.title || ''} ${course.subject || ''} ${
        course.tutor?.name || course.tutor || ''
      } ${course.headline || ''}`.toLowerCase()
      const matchesQuery = textSource.includes(searchQuery.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [courses, selectedCategory, searchQuery])

  // Active enrolled course for "Continue Learning"
  const activeCourse = userEnrollments.length > 0 ? userEnrollments[0] : null

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        showLogo
        showSearch
        showNotifications
        searchMode={showSearch}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClose={() => {
          setShowSearch(false)
          setSearchQuery('')
        }}
        onSearchPress={() => setShowSearch(true)}
        onNotificationPress={() => {}}
        searchPlaceholder="Search courses, tutors, topics"
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {!showSearch && (
          <>
            {/* Hero Banner */}
            <View style={[styles.heroCard, { backgroundColor: colors.primaryDark }]}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroBadge}>WELCOME BACK, {firstName.toUpperCase()}</Text>
                <Text style={styles.heroTitle}>Master your exams,{'\n'}unlock your future.</Text>
                <Text style={styles.heroSubtitle}>
                  Expert-led lessons curated for WAEC, JAMB & University success.
                </Text>
                <Pressable
                  style={[styles.browseButton, { backgroundColor: colors.surface }]}
                  onPress={() => router.push('/(tabs)/tutors')}
                >
                  <Text style={[styles.browseButtonText, { color: colors.primary }]}>
                    Find a Verified Tutor
                  </Text>
                  <Ionicons name="arrow-forward" size={15} color={colors.primary} />
                </Pressable>
              </View>
              <View style={styles.heroIconCircle}>
                <Ionicons name="school" size={50} color="#FFFFFF" />
              </View>
            </View>

            {/* Quick Live Stats Row */}
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#0C2A38' : '#E0F2FE' }]}>
                  <Ionicons name="book-outline" size={18} color="#0284C7" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {userEnrollments.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  In progress
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#33230A' : '#FEF3C7' }]}>
                  <Ionicons name="flame-outline" size={18} color="#D97706" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {userEnrollments.length > 0 ? '3' : '1'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Day streak
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#14331C' : '#DCFCE7' }]}>
                  <Ionicons name="ribbon-outline" size={18} color="#15803D" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {userEnrollments.filter((e) => e.progress >= 1).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Completed
                </Text>
              </View>
            </View>

            {/* Continue Learning Banner */}
            {activeCourse ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Continue Learning
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/purchases')}>
                    <Text style={[styles.seeAllText, { color: colors.primary }]}>View all</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.activeCourseCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => router.push('/screens/lesson')}
                >
                  <View style={styles.activeCourseHeader}>
                    <View style={styles.activeCourseThumbnail}>
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.activeCourseInfo}>
                      <Text
                        style={[styles.activeCourseTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {activeCourse.title || 'Calculus 1A: Limits & Derivatives'}
                      </Text>
                      <Text
                        style={[styles.activeCourseTutor, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {activeCourse.tutor || 'Engr. Tunde Adeleke'} ·{' '}
                        {activeCourse.nextLesson || 'Resume Lesson'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressRow}>
                      <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                        Progress
                      </Text>
                      <Text style={[styles.progressValue, { color: colors.primary }]}>
                        {Math.round((activeCourse.progress || 0.45) * 100)}%
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
                            width: `${Math.round((activeCourse.progress || 0.45) * 100)}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </Pressable>
              </>
            ) : null}
          </>
        )}

        {/* Section Heading & Category Filters */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {showSearch ? 'Search Results' : 'Explore Courses'}
          </Text>
          <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>
            {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
          </Text>
        </View>

        <FlatList
          data={CATEGORIES}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const selected = selectedCategory === item.label
            return (
              <Pressable
                onPress={() => setSelectedCategory(item.label)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : isDark
                      ? colors.card
                      : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : isDark
                        ? colors.textSecondary
                        : '#4B5563',
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )
          }}
        />

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading live catalog...
            </Text>
          </View>
        )}

        {/* Courses List */}
        {!loading && (
          <View style={styles.coursesList}>
            {filteredCourses.map((course) => {
              const tutorName =
                course.tutor?.name ||
                (typeof course.tutor === 'string' ? course.tutor : 'Verified Educator')
              const priceDisplay =
                typeof course.price === 'number'
                  ? `₦${course.price.toLocaleString()}`
                  : course.price?.startsWith?.('₦')
                  ? course.price
                  : `₦${course.price || '3,000'}`

              return (
                <Pressable
                  key={course.id}
                  style={[
                    styles.courseCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/course-details',
                      params: { id: course.id, title: course.title },
                    })
                  }
                >
                  <View style={styles.courseThumb}>
                    {course.thumbnailUrl || course.image ? (
                      <Image
                        source={{ uri: course.thumbnailUrl || course.image }}
                        style={styles.courseImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.courseImgFallback,
                          { backgroundColor: isDark ? '#1C2920' : '#E8F5E9' },
                        ]}
                      >
                        <Ionicons name="book-outline" size={38} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.playOverlay}>
                      <Ionicons name="videocam" size={20} color="#FFFFFF" />
                    </View>
                    <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                      <Text style={styles.priceText}>{priceDisplay}</Text>
                    </View>
                  </View>

                  <View style={styles.courseBody}>
                    <View style={styles.ratingRow}>
                      <View style={styles.starRow}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={[styles.ratingText, { color: colors.text }]}>
                          {course.rating || '4.9'}
                        </Text>
                        <Text style={[styles.reviewsText, { color: colors.textMuted }]}>
                          ({course.reviewsCount || course.reviews || '120'})
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.subjectBadge,
                          { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subjectBadgeText,
                            { color: isDark ? '#4ADE80' : '#15803D' },
                          ]}
                        >
                          {course.subject || 'General'}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.courseTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {course.title}
                    </Text>

                    {course.headline ? (
                      <Text
                        style={[styles.courseHeadline, { color: colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {course.headline}
                      </Text>
                    ) : null}

                    <View
                      style={[
                        styles.courseFooter,
                        { borderColor: isDark ? '#233228' : '#F3F4F6' },
                      ]}
                    >
                      <View style={styles.tutorRow}>
                        {course.tutor?.avatar ? (
                          <Image
                            source={{ uri: course.tutor.avatar }}
                            style={styles.tutorAvatarImg}
                          />
                        ) : (
                          <View
                            style={[
                              styles.tutorAvatarFallback,
                              { backgroundColor: isDark ? '#233228' : '#E5E7EB' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tutorInitial,
                                { color: isDark ? '#E5E7EB' : '#374151' },
                              ]}
                            >
                              {tutorName[0] || 'T'}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={[styles.tutorName, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {tutorName}
                        </Text>
                      </View>
                      <Text style={[styles.durationText, { color: colors.textMuted }]}>
                        {course.duration || `${course.lessonsCount || 10} lessons`}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )
            })}

            {/* Empty State */}
            {filteredCourses.length === 0 && (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: isDark ? '#182E20' : '#DCFCE7' },
                  ]}
                >
                  <Ionicons name="search-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {courses.length === 0
                    ? 'No Courses in Database Yet'
                    : 'No Matching Courses Found'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {courses.length === 0
                    ? 'The platform is connected to Firestore and ready for new course uploads.'
                    : `No courses match "${searchQuery}". Try selecting another category.`}
                </Text>

                {courses.length === 0 && (
                  <Pressable
                    style={[styles.seedButton, { backgroundColor: colors.primary }]}
                    onPress={handleQuickSeed}
                    disabled={seeding}
                  >
                    {seeding ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                        <Text style={styles.seedButtonText}>
                          Populate Verified Courses
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingBottom: 48 },

  heroCard: {
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  heroTextCol: { flex: 1, paddingRight: 10 },
  heroBadge: {
    color: '#BBF7D0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
  },
  heroSubtitle: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  browseButton: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  browseButtonText: { fontSize: 13, fontWeight: '800' },
  heroIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  seeAllText: { fontSize: 13, fontWeight: '700' },
  countBadgeText: { fontSize: 12, fontWeight: '600' },

  activeCourseCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  activeCourseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeCourseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCourseInfo: { flex: 1 },
  activeCourseTitle: { fontSize: 15, fontWeight: '700' },
  activeCourseTutor: { fontSize: 12, marginTop: 3 },
  progressContainer: { marginTop: 14 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressValue: { fontSize: 12, fontWeight: '800' },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  chipsRow: { gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13 },

  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 13, marginTop: 10 },

  coursesList: { paddingHorizontal: 16, gap: 16 },
  courseCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  courseThumb: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F1A13',
  },
  courseImg: {
    width: '100%',
    height: '100%',
  },
  courseImgFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  courseBody: { padding: 14 },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  reviewsText: { fontSize: 12 },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  courseTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  courseHeadline: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  tutorAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  tutorAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorInitial: { fontSize: 12, fontWeight: '700' },
  tutorName: { fontSize: 13, fontWeight: '600', flex: 1 },
  durationText: { fontSize: 12 },

  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    marginBottom: 16,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  seedButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
})
