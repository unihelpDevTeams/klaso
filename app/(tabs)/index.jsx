import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useFocusEffect } from 'expo-router'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query as fsQuery,
  startAfter,
  where,
} from 'firebase/firestore'
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth, db } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 10 // courses fetched per request
const COURSE_TTL = 5 * 60 * 1000 // reuse cached pages for 5 minutes
const ENROLLMENT_TTL = 60 * 1000 // refetch enrollments at most once a minute
const SEARCH_DEBOUNCE = 300
const CATEGORY_TTL = 60 * 60 * 1000 // category list changes rarely: 1 hour
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

// Icons are cosmetic only; categories themselves come from Firestore.
const CATEGORY_ICONS = {
  all: 'apps-outline',
  mathematics: 'calculator-outline',
  science: 'flask-outline',
  'computer science': 'code-slash-outline',
  languages: 'language-outline',
  business: 'briefcase-outline',
  physics: 'planet-outline',
  chemistry: 'beaker-outline',
  biology: 'leaf-outline',
  english: 'book-outline',
  economics: 'stats-chart-outline',
  accounting: 'receipt-outline',
}
const getCategoryIcon = (label) =>
  CATEGORY_ICONS[String(label).toLowerCase()] || 'bookmark-outline'

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Top rated' },
  { id: 'priceAsc', label: 'Price: low to high' },
  { id: 'priceDesc', label: 'Price: high to low' },
]

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const toNumber = (value) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/[^0-9.]/g, ''))
    return Number.isNaN(n) ? null : n
  }
  return null
}

const formatPrice = (price) => {
  const n = toNumber(price)
  if (n === null) return null
  if (n === 0) return 'Free'
  return `₦${n.toLocaleString()}`
}

const getTutorName = (course) =>
  course.tutor?.name ||
  (typeof course.tutor === 'string' ? course.tutor : null) ||
  ''

const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0))

const millis = (ts) =>
  typeof ts?.toMillis === 'function' ? ts.toMillis() : Number(ts) || 0

const docsToList = (snapshot) =>
  snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

/* -------------------------------------------------------------------------- */
/*  Small presentational components                                           */
/* -------------------------------------------------------------------------- */

const Skeleton = memo(function Skeleton({ style, color }) {
  const [opacity] = useState(() => new Animated.Value(0.4))
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return <Animated.View style={[{ backgroundColor: color, opacity }, style]} />
})

const CourseSkeleton = memo(function CourseSkeleton({ colors, isDark }) {
  const tone = isDark ? '#233228' : '#E5E7EB'
  return (
    <View style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton color={tone} style={{ height: 150, width: '100%' }} />
      <View style={styles.courseBody}>
        <Skeleton color={tone} style={{ height: 12, width: '40%', borderRadius: 6 }} />
        <Skeleton color={tone} style={{ height: 16, width: '85%', borderRadius: 6, marginTop: 12 }} />
        <Skeleton color={tone} style={{ height: 12, width: '65%', borderRadius: 6, marginTop: 8 }} />
      </View>
    </View>
  )
})

const CourseCard = memo(function CourseCard({ course, colors, isDark, onPress }) {
  const tutorName = getTutorName(course)
  const price = formatPrice(course.price)
  const rating = toNumber(course.rating)
  const reviews = course.reviewsCount ?? course.reviews
  const imageUri = course.thumbnailUrl || course.image

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, taught by ${tutorName}`}
      onPress={() => onPress(course)}
      style={({ pressed }) => [
        styles.courseCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={styles.courseThumb}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.courseImg} resizeMode="cover" />
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
        {price ? (
          <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
            <Text style={styles.priceText}>{price}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.courseBody}>
        <View style={styles.ratingRow}>
          <View style={styles.starRow}>
            {rating ? (
              <>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={[styles.ratingText, { color: colors.text }]}>
                  {rating.toFixed(1)}
                </Text>
                {reviews ? (
                  <Text style={[styles.reviewsText, { color: colors.textMuted }]}>
                    ({reviews})
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[styles.reviewsText, { color: colors.textMuted }]}>Rating unavailable</Text>
            )}
          </View>
          {course.subject ? (
            <View style={[styles.subjectBadge, { backgroundColor: isDark ? '#14331C' : '#DCFCE7' }]}>
              <Text style={[styles.subjectBadgeText, { color: isDark ? '#4ADE80' : '#15803D' }]}>
                {course.subject}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
          {course.title}
        </Text>

        {course.headline ? (
          <Text style={[styles.courseHeadline, { color: colors.textMuted }]} numberOfLines={2}>
            {course.headline}
          </Text>
        ) : null}

        <View style={[styles.courseFooter, { borderColor: colors.border }]}>
          <View style={styles.tutorRow}>
            {course.tutor?.avatar ? (
              <Image source={{ uri: course.tutor.avatar }} style={styles.tutorAvatarImg} />
            ) : (
              <View
                style={[
                  styles.tutorAvatarFallback,
                  { backgroundColor: isDark ? '#233228' : '#E5E7EB' },
                ]}
              >
                <Text style={[styles.tutorInitial, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                  {tutorName[0] || ''}
                </Text>
              </View>
            )}
            <Text style={[styles.tutorName, { color: colors.textSecondary }]} numberOfLines={1}>
              {tutorName}
            </Text>
          </View>
          <View style={styles.durationRow}>
            <Ionicons name="play-circle-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.durationText, { color: colors.textMuted }]}>
              {course.duration || (course.lessonsCount != null ? `${course.lessonsCount} lessons` : '')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
})

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const { colors, isDark } = useTheme()

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('recommended')

  // Data state
  const [courses, setCourses] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [homeProfile, setHomeProfile] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [tutorCourses, setTutorCourses] = useState([])
  const [tutorStats, setTutorStats] = useState({ enrollments: 0, averageRating: null })
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorError, setTutorError] = useState('')

  // Per-category page cache: { [category]: { items, cursor, hasMore, ts } }
  const cacheRef = useRef({})
  const requestId = useRef(0)
  const loadingMoreRef = useRef(false)
  const enrollmentsTs = useRef(0)
  const categoriesTs = useRef(0)
  const selectedCategoryRef = useRef('All')

  // Categories: { [subject]: courseCount } from meta/categories and loaded courses.
  const [categoryCounts, setCategoryCounts] = useState(null)

  const user = auth.currentUser
  const firstName = user?.displayName?.split(' ')[0]
  const isApprovedTutor = homeProfile?.role === 'tutor' && homeProfile?.approved === true

  /* ----------------------------- Data fetching ----------------------------- */

  /**
   * Fetches one page of courses. One-time reads (no live listener) so a change
   * to a single course never re-bills the whole collection. Category filtering
   * happens on the server, and every page is cached per category.
   */
  const loadCourses = useCallback(
    async (category, { refresh = false, more = false } = {}) => {
      const cached = cacheRef.current[category]

      // Serve from cache when still fresh
      if (!refresh && !more && cached && Date.now() - cached.ts < COURSE_TTL) {
        setCourses(cached.items)
        setHasMore(cached.hasMore)
        setLoading(false)
        setError(null)
        return
      }

      if (more) {
        if (!cached || !cached.hasMore || !cached.cursor || loadingMoreRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)
      } else if (!refresh) {
        setLoading(true)
      }

      const myRequest = ++requestId.current
      try {
        const constraints = []
        if (category !== 'All') constraints.push(where('subject', '==', category))
        if (more) constraints.push(startAfter(cached.cursor))
        constraints.push(limit(PAGE_SIZE))

        const snap = await getDocs(fsQuery(collection(db, 'courses'), ...constraints))
        const page = docsToList(snap)
        const items = more ? [...cached.items, ...page] : page

        cacheRef.current[category] = {
          items,
          cursor: snap.docs[snap.docs.length - 1] || cached?.cursor || null,
          hasMore: snap.docs.length === PAGE_SIZE,
          ts: Date.now(),
        }

        // Ignore stale responses (user switched category mid-request)
        if (myRequest === requestId.current) {
          setCourses(items)
          setHasMore(snap.docs.length === PAGE_SIZE)
          setError(null)
        }
      } catch (err) {
        console.log('Error fetching courses:', err)
        if (myRequest === requestId.current) {
          setError('We couldn’t load courses. Check your connection and try again.')
        }
      } finally {
        if (myRequest === requestId.current) setLoading(false)
        if (more) {
          loadingMoreRef.current = false
          setLoadingMore(false)
        }
      }
    },
    []
  )

  const loadEnrollments = useCallback(async (force = false) => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setEnrollments([])
      return
    }
    if (!force && Date.now() - enrollmentsTs.current < ENROLLMENT_TTL) return
    try {
      const snap = await getDocs(
        fsQuery(collection(db, 'enrollments'), where('userId', '==', uid), limit(50))
      )
      enrollmentsTs.current = Date.now()
      setEnrollments(docsToList(snap))
    } catch (err) {
      console.log('Error fetching enrollments:', err)
    }
  }, [])

  const loadTutorDashboard = useCallback(async () => {
    setTutorLoading(true)
    setTutorError('')
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Sign in to view your tutor dashboard.')
      const idToken = await currentUser.getIdToken()
      const response = await fetch(`${API_URL}/api/tutor/insights`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load tutor insights.')
      }

      setTutorCourses(data.courses || [])
      setTutorStats({
        enrollments: data.summary?.enrollments || 0,
        averageRating: data.summary?.averageRating ?? null,
      })
    } catch (loadError) {
      console.error('Unable to load tutor dashboard:', loadError)
      setTutorError('We couldn’t load your tutorial insights. Pull down to try again.')
    } finally {
      setTutorLoading(false)
    }
  }, [])

  /**
   * Reads ONE small document (meta/categories = { counts: { Science: 4, ... } })
   * instead of scanning the courses collection. Cached for an hour.
   */
  const loadCategories = useCallback(async (force = false) => {
    if (!force && Date.now() - categoriesTs.current < CATEGORY_TTL) return
    try {
      const snap = await getDoc(doc(db, 'meta', 'categories'))
      categoriesTs.current = Date.now()
      setCategoryCounts(snap.exists() ? snap.data().counts || null : null)
    } catch (err) {
      console.log('Error fetching categories:', err)
    }
  }, [])

  const loadHomeProfile = useCallback(async (force = false) => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setHomeProfile(null)
      setRoleLoading(false)
      return
    }

    setRoleLoading(true)
    try {
      const profileSnapshot = await getDoc(doc(db, 'users', uid))
      const profile = profileSnapshot.exists() ? profileSnapshot.data() : null
      setHomeProfile(profile)
      if (profile?.role === 'tutor' && profile.approved === true) {
        await loadTutorDashboard()
      } else {
        await Promise.all([
          loadEnrollments(force),
          loadCategories(force),
          loadCourses(selectedCategoryRef.current, { refresh: force }),
        ])
      }
    } catch (loadError) {
      console.error('Unable to load home profile:', loadError)
      setHomeProfile(null)
      setTutorError('We couldn’t load your account details. Pull down to try again.')
    } finally {
      setRoleLoading(false)
    }
  }, [loadCategories, loadCourses, loadEnrollments, loadTutorDashboard])

  // Load the account role and role-specific home data when the tab is focused.
  useFocusEffect(
    useCallback(() => {
      loadHomeProfile()
    }, [loadHomeProfile])
  )

  // Debounce search so filtering doesn't run on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), SEARCH_DEBOUNCE)
    return () => clearTimeout(t)
  }, [searchQuery])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadHomeProfile(true)
    } finally {
      setRefreshing(false)
    }
  }, [loadHomeProfile])

  const onEndReached = useCallback(() => {
    loadCourses(selectedCategory, { more: true })
  }, [selectedCategory, loadCourses])

  /* ------------------------------ Derived data ----------------------------- */

  // Search runs on already-loaded courses, so it costs zero reads
  const visibleCourses = useMemo(() => {
    const filtered = debouncedQuery
      ? courses.filter((c) =>
          `${c.title || ''} ${c.subject || ''} ${getTutorName(c)} ${c.headline || ''}`
            .toLowerCase()
            .includes(debouncedQuery)
        )
      : courses

    if (sortBy === 'recommended') return filtered
    const sorted = [...filtered]
    if (sortBy === 'rating') sorted.sort((a, b) => (toNumber(b.rating) || 0) - (toNumber(a.rating) || 0))
    if (sortBy === 'priceAsc') sorted.sort((a, b) => (toNumber(a.price) ?? Infinity) - (toNumber(b.price) ?? Infinity))
    if (sortBy === 'priceDesc') sorted.sort((a, b) => (toNumber(b.price) ?? -1) - (toNumber(a.price) ?? -1))
    return sorted
  }, [courses, debouncedQuery, sortBy])

  // Category chips built from what is actually available
  const categories = useMemo(() => {
    const map = new Map()
    if (categoryCounts) {
      Object.entries(categoryCounts).forEach(([label, n]) => {
        if (Number(n) > 0) map.set(label, Number(n)) // hide empty categories
      })
    }
    courses.forEach((course) => {
      if (course.subject && !map.has(course.subject)) map.set(course.subject, null)
    })
    if (selectedCategory !== 'All' && !map.has(selectedCategory)) map.set(selectedCategory, null)

    const list = [...map.entries()]
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0) || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ id: label, label, count }))
    const total = categoryCounts
      ? Object.values(categoryCounts).reduce((sum, n) => sum + (Number(n) || 0), 0)
      : null
    return [{ id: 'all', label: 'All', count: total || null }, ...list]
  }, [categoryCounts, courses, selectedCategory])

  // Most recently touched course that isn't finished yet
  const activeCourse = useMemo(() => {
    const inProgress = enrollments.filter((e) => clamp01(e.progress) < 1)
    if (!inProgress.length) return null
    return [...inProgress].sort(
      (a, b) =>
        millis(b.lastAccessedAt || b.updatedAt || b.enrolledAt) -
        millis(a.lastAccessedAt || a.updatedAt || a.enrolledAt)
    )[0]
  }, [enrollments])

  const openCourse = useCallback((course) => {
    router.push({
      pathname: '/course-details',
      params: { id: course.id, title: course.title },
    })
  }, [])

  const isSearching = showSearch && debouncedQuery.length > 0
  const activeProgress = Math.round(clamp01(activeCourse?.progress) * 100)

  /* -------------------------------- Sections ------------------------------- */

  const listHeader = (
    <View>
      {!showSearch && (
        <>
          {/* Hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.primaryDark }]}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroBadge}>
                {getGreeting()}{firstName ? `, ${firstName}` : ''}
              </Text>
              <Text style={styles.heroTitle}>Master your exams, unlock your future.</Text>
              <Text style={styles.heroSubtitle}>
                Expert-led lessons for WAEC, JAMB and university success.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={[styles.browseButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/(tabs)/tutors')}
              >
                <Text style={[styles.browseButtonText, { color: colors.primary }]}>
                  Find a verified tutor
                </Text>
                <Ionicons name="arrow-forward" size={15} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          {/* Continue learning */}
          {activeCourse ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue learning</Text>
                <Pressable onPress={() => router.push('/(tabs)/purchases')} hitSlop={8}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>View all</Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                style={[
                  styles.activeCourseCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/screens/lesson',
                    params: { courseId: activeCourse.courseId || activeCourse.id },
                  })
                }
              >
                <View style={styles.activeCourseHeader}>
                  <View style={[styles.activeCourseThumbnail, { backgroundColor: colors.primary }]}>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.activeCourseInfo}>
                    <Text style={[styles.activeCourseTitle, { color: colors.text }]} numberOfLines={1}>
                      {activeCourse.title || activeCourse.courseTitle || 'Your course'}
                    </Text>
                    <Text style={[styles.activeCourseTutor, { color: colors.textMuted }]} numberOfLines={1}>
                      {activeCourse.nextLesson
                        ? `Next: ${activeCourse.nextLesson}`
                        : 'Resume where you left off'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Progress</Text>
                    <Text style={[styles.progressValue, { color: colors.primary }]}>
                      {activeProgress}%
                    </Text>
                  </View>
                  <View
                    style={[styles.progressBarTrack, { backgroundColor: isDark ? '#233228' : '#E5E7EB' }]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${activeProgress}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>
            </>
          ) : null}
        </>
      )}

      {/* Section heading */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {showSearch ? 'Search results' : 'Explore courses'}
        </Text>
        <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>
          {visibleCourses.length} {visibleCourses.length === 1 ? 'course' : 'courses'}
          {hasMore && !loading ? '+' : ''}
        </Text>
      </View>

      {/* Category chips */}
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item }) => {
          const selected = selectedCategory === item.label
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                selectedCategoryRef.current = item.label
                setSelectedCategory(item.label)
                loadCourses(item.label)
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primary : isDark ? colors.card : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(item.label)}
                size={14}
                color={selected ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selected ? '#FFFFFF' : isDark ? colors.textSecondary : '#4B5563',
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
              >
                {item.label}
                {item.count ? `  ${item.count}` : ''}
              </Text>
            </Pressable>
          )
        }}
      />

      {/* Sort */}
      <FlatList
        data={SORTS}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
        renderItem={({ item }) => {
          const selected = sortBy === item.id
          return (
            <Pressable onPress={() => setSortBy(item.id)} hitSlop={6}>
              <Text
                style={[
                  styles.sortText,
                  {
                    color: selected ? colors.primary : colors.textMuted,
                    fontWeight: selected ? '800' : '500',
                    borderBottomColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        }}
      />

      {error ? (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: isDark ? '#3B1517' : '#FEE2E2', borderColor: isDark ? '#7F1D1D' : '#FECACA' },
          ]}
        >
          <Ionicons name="cloud-offline-outline" size={18} color="#DC2626" />
          <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>{error}</Text>
          <Pressable onPress={() => loadCourses(selectedCategory, { refresh: true })} hitSlop={8}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )

  const listEmpty = loading ? (
    <View style={styles.coursesPad}>
      <CourseSkeleton colors={colors} isDark={isDark} />
      <View style={{ height: 16 }} />
      <CourseSkeleton colors={colors} isDark={isDark} />
    </View>
  ) : error ? null : (
    <View style={styles.coursesPad}>
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#182E20' : '#DCFCE7' }]}>
          <Ionicons name="search-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {courses.length === 0 ? 'No courses yet' : 'No matching courses'}
        </Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          {courses.length === 0
            ? selectedCategory === 'All'
              ? 'New courses will appear here as tutors publish them.'
              : `There are no ${selectedCategory} courses yet. Try another category.`
            : `Nothing loaded matches “${searchQuery}”. Try a different keyword or category.`}
        </Text>

        {hasMore && courses.length > 0 ? (
          <Pressable
            style={[styles.seedButton, { backgroundColor: colors.primary }]}
            onPress={onEndReached}
          >
            <Text style={styles.seedButtonText}>Search more courses</Text>
          </Pressable>
        ) : null}

      </View>
    </View>
  )

  const listFooter = (
    <View style={styles.footer}>
      {loadingMore ? (
        <ActivityIndicator color={colors.primary} />
      ) : isSearching && hasMore && visibleCourses.length > 0 ? (
        <Pressable onPress={onEndReached} hitSlop={8}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Search more courses</Text>
        </Pressable>
      ) : !hasMore && visibleCourses.length > 0 ? (
        <Text style={[styles.endText, { color: colors.textMuted }]}>You’ve seen every course here</Text>
      ) : null}
    </View>
  )

  if (roleLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      </SafeAreaView>
    )
  }

  if (isApprovedTutor) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Header
          title="Tutor studio"
          subtitle="Manage your tutorials and track performance"
          rightContent={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open messages"
                onPress={() => router.push('/messages')}
                style={[styles.tutorHeaderAction, { backgroundColor: colors.inputBg }]}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open wallet"
                onPress={() => router.push('/wallet')}
                style={[styles.tutorHeaderAction, { backgroundColor: colors.primaryLight }]}
              >
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a tutorial"
                onPress={() => router.push('/upload')}
                style={[styles.tutorHeaderAction, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          }
        />
        <FlatList
          data={tutorCourses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tutorDashboardContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || tutorLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={[styles.tutorWelcomeCard, { backgroundColor: colors.primaryDark }]}>
                <View style={styles.tutorWelcomeIcon}>
                  <Ionicons name="person" size={30} color="#FFFFFF" />
              </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tutorWelcomeEyebrow}>{getGreeting()}</Text>
                  <Text style={styles.tutorWelcomeTitle}>
                    {homeProfile?.displayName || user?.displayName || 'Tutor'}
                  </Text>
                  <Text style={styles.tutorWelcomeSubtitle}>
                    Your teaching workspace, all in one place.
                  </Text>
                </View>

              </View>

              <View style={styles.tutorInsightsRow}>
                <View style={[styles.tutorInsightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="library-outline" size={19} color={colors.primary} />
                  <Text style={[styles.tutorInsightValue, { color: colors.text }]}>{tutorCourses.length}</Text>
                  <Text style={[styles.tutorInsightLabel, { color: colors.textMuted }]}>Tutorials</Text>
                </View>
                <View style={[styles.tutorInsightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={19} color={colors.primary} />
                  <Text style={[styles.tutorInsightValue, { color: colors.text }]}>{tutorStats.enrollments}</Text>
                  <Text style={[styles.tutorInsightLabel, { color: colors.textMuted }]}>Enrollments</Text>
                </View>
                <View style={[styles.tutorInsightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="star-outline" size={19} color={colors.primary} />
                  <Text style={[styles.tutorInsightValue, { color: colors.text }]}>
                    {typeof tutorStats.averageRating === 'number'
                      ? tutorStats.averageRating.toFixed(1)
                      : '—'}
                  </Text>
                  <Text style={[styles.tutorInsightLabel, { color: colors.textMuted }]}>Average rating</Text>
                </View>
              </View>

              {tutorError ? (
                <View style={[styles.tutorErrorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="alert-circle-outline" size={19} color="#DC2626" />
                  <Text style={[styles.tutorErrorText, { color: colors.text }]}>{tutorError}</Text>
                </View>
              ) : null}

              <View style={styles.tutorSectionHeading}>
                <View>
                  <Text style={[styles.tutorSectionTitle, { color: colors.text }]}>Your tutorials</Text>
                  <Text style={[styles.tutorSectionSubtitle, { color: colors.textMuted }]}>
                    Edit course information or preview the learner view.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/upload')}
                  style={[styles.tutorCreateButton, { backgroundColor: colors.primaryLight }]}
                >
                  <Ionicons name="add" size={17} color={colors.primary} />
                  <Text style={[styles.tutorCreateButtonText, { color: colors.primary }]}>Create</Text>
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.tutorCourseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.tutorCourseTopRow}>
                <View style={[styles.tutorCourseIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="play-circle-outline" size={23} color={colors.primary} />
                </View>
                <View style={styles.tutorCourseTitleWrap}>
                  <Text style={[styles.tutorCourseTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title || ''}
                  </Text>
                  <Text style={[styles.tutorCourseSubject, { color: colors.textMuted }]} numberOfLines={1}>
                    {[item.subject, item.level].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              </View>
              <View style={[styles.tutorCourseStats, { borderTopColor: colors.border }]}>
                <View style={styles.tutorCourseMetric}>
                  <Text style={[styles.tutorCourseMetricValue, { color: colors.text }]}>{item.enrollmentCount}</Text>
                  <Text style={[styles.tutorCourseMetricLabel, { color: colors.textMuted }]}>enrollments</Text>
                </View>
                <View style={styles.tutorCourseMetric}>
                  <Text style={[styles.tutorCourseMetricValue, { color: colors.text }]}>
                    {toNumber(item.rating) !== null ? `★ ${toNumber(item.rating)}` : '—'}
                  </Text>
                  <Text style={[styles.tutorCourseMetricLabel, { color: colors.textMuted }]}>rating</Text>
                </View>
              </View>
              <View style={styles.tutorCourseActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/tutor-course-edit', params: { id: item.id } })}
                  style={[styles.tutorEditButton, { borderColor: colors.border }]}
                >
                  <Ionicons name="create-outline" size={17} color={colors.primary} />
                  <Text style={[styles.tutorEditButtonText, { color: colors.primary }]}>Edit tutorial</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openCourse(item)}
                  style={[styles.tutorViewButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.tutorViewButtonText}>Preview</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            tutorLoading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
            ) : tutorError ? (
              <View style={[styles.tutorEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.tutorEmptyTitle, { color: colors.text }]}>Tutorials couldn’t load</Text>
                <Text style={[styles.tutorEmptyMessage, { color: colors.textMuted }]}>
                  Pull down to retry loading your tutor workspace.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onRefresh}
                  style={[styles.tutorViewButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.tutorViewButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.tutorEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.tutorEmptyIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="videocam-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.tutorEmptyTitle, { color: colors.text }]}>Your first tutorial starts here</Text>
                <Text style={[styles.tutorEmptyMessage, { color: colors.textMuted }]}>
                  Publish a lesson to start building your teaching portfolio and see learner activity.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/upload')}
                  style={[styles.tutorViewButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.tutorViewButtonText}>Create a tutorial</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        showLogo
        showSearch
        showMessages
        showNotifications
        searchMode={showSearch}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClose={() => {
          setShowSearch(false)
          setSearchQuery('')
        }}
        onSearchPress={() => setShowSearch(true)}
        onMessagesPress={() => router.push('/messages')}
        onNotificationPress={() => router.push('/notifications')}
        searchPlaceholder="Search courses, tutors, topics"
      />

      <FlatList
        data={loading ? [] : visibleCourses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.coursesPad}>
            <CourseCard course={item} colors={colors} isDark={isDark} onPress={openCourse} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  )
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingBottom: 48 },
  coursesPad: { paddingHorizontal: 16 },
  tutorDashboardContent: { paddingHorizontal: 16, paddingBottom: 36 },
  tutorHeaderAction: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tutorWelcomeCard: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    marginTop: 16,
    padding: 20,
  },
  tutorWelcomeEyebrow: { color: '#BBF7D0', fontSize: 13, fontWeight: '700' },
  tutorWelcomeTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', marginTop: 5 },
  tutorWelcomeSubtitle: { color: '#DCFCE7', fontSize: 12, lineHeight: 18, marginTop: 6 },
  tutorWelcomeIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  tutorInsightsRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  tutorInsightCard: {
    alignItems: 'flex-start',
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 108,
    padding: 12,
  },
  tutorInsightValue: { fontSize: 19, fontWeight: '800', marginTop: 10 },
  tutorInsightLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tutorErrorCard: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  tutorErrorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  tutorSectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 24,
  },
  tutorSectionTitle: { fontSize: 18, fontWeight: '800' },
  tutorSectionSubtitle: { fontSize: 12, marginTop: 4 },
  tutorCreateButton: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tutorCreateButtonText: { fontSize: 12, fontWeight: '800' },
  tutorCourseCard: { borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  tutorCourseTopRow: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  tutorCourseIcon: { alignItems: 'center', borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  tutorCourseTitleWrap: { flex: 1 },
  tutorCourseTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  tutorCourseSubject: { fontSize: 12, marginTop: 3 },
  tutorCourseStats: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
  },
  tutorCourseMetric: { alignItems: 'center', flex: 1 },
  tutorCourseMetricValue: { fontSize: 13, fontWeight: '800' },
  tutorCourseMetricLabel: { fontSize: 10, marginTop: 3 },
  tutorCourseActions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  tutorEditButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
  },
  tutorEditButtonText: { fontSize: 12, fontWeight: '700' },
  tutorViewButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 10,
  },
  tutorViewButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  tutorEmptyCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    padding: 24,
  },
  tutorEmptyIcon: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  tutorEmptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  tutorEmptyMessage: { fontSize: 13, lineHeight: 19, marginVertical: 8, maxWidth: 280, textAlign: 'center' },

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
  heroBadge: { color: '#BBF7D0', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 27 },
  heroSubtitle: { color: '#DCFCE7', fontSize: 12, marginTop: 6, lineHeight: 17 },
  browseButton: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  activeCourseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeCourseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCourseInfo: { flex: 1 },
  activeCourseTitle: { fontSize: 15, fontWeight: '700' },
  activeCourseTutor: { fontSize: 12, marginTop: 3 },
  progressContainer: { marginTop: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressValue: { fontSize: 12, fontWeight: '800' },
  progressBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  chipsRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13 },

  sortRow: { gap: 18, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  sortText: { fontSize: 12, paddingBottom: 3, borderBottomWidth: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  retryText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },

  courseCard: { borderRadius: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  courseThumb: { height: 150, width: '100%', position: 'relative', backgroundColor: '#0F1A13' },
  courseImg: { width: '100%', height: '100%' },
  courseImgFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
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
  subjectBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subjectBadgeText: { fontSize: 11, fontWeight: '700' },
  courseTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  courseHeadline: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tutorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  tutorAvatarImg: { width: 26, height: 26, borderRadius: 13 },
  tutorAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorInitial: { fontSize: 12, fontWeight: '700' },
  tutorName: { fontSize: 13, fontWeight: '600', flex: 1 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 12 },

  endText: { fontSize: 12 },
})