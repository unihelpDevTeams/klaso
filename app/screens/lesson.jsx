import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { VideoView, useVideoPlayer } from 'expo-video'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'
import { useAppDialog } from '../../context/AppDialogContext'
import { checkTutorialPurchase } from '../../services/paymentService'

const PREVIEW_SECONDS = 30
const REVIEWS_COLLAPSED = 5
const STAR = '#F59E0B'
const SUCCESS = '#15803D'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value
}

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function sortLessons(list) {
  return [...list].sort((a, b) => {
    if (a.order != null && b.order != null) return Number(a.order) - Number(b.order)
    const at = a.createdAt?.toMillis?.() || 0
    const bt = b.createdAt?.toMillis?.() || 0
    return at - bt
  })
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function LessonDetailScreen() {
  const router = useRouter()
  const showAlert = useAppDialog()
  const params = useLocalSearchParams()
  const requestedCourseId = firstParam(params.lessonId) || firstParam(params.courseId)
  const selectedVideoUrl = typeof firstParam(params.videoUrl) === 'string' ? firstParam(params.videoUrl) : null
  const { colors, isDark } = useTheme()

  const [course, setCourse] = useState(null)
  const [courseLessons, setCourseLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [activeKey, setActiveKey] = useState(null)
  const [showVideo, setShowVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewLocked, setPreviewLocked] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)

  const [purchaseStatus, setPurchaseStatus] = useState({ checking: true, hasAccess: false })
  const [enrollment, setEnrollment] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSaved, setReviewSaved] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)

  const previewLockHandled = useRef(false)
  const previewConsumedSeconds = useRef(0)
  const lastVideoTime = useRef(0)
  const autoPlay = useRef(false)
  const reviewPrefilled = useRef(false)

  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = false
    player.timeUpdateEventInterval = 0.1
  })

  const hasFullAccess = purchaseStatus.hasAccess

  /* ---------------------------- course ---------------------------- */

  useEffect(() => {
    let cancelled = false

    async function loadLesson() {
      if (!requestedCourseId) {
        setCourse(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError(false)
      try {
        const snap = await getDoc(doc(db, 'courses', String(requestedCourseId)))
        if (!snap.exists()) {
          if (!cancelled) setCourse(null)
          return
        }

        const data = snap.data()
        let lessons = Array.isArray(data.curriculum) ? data.curriculum : []

        if (!lessons.length && data.lessonId) {
          const lessonSnap = await getDoc(doc(db, 'lessons', data.lessonId))
          if (lessonSnap.exists()) lessons = [{ id: lessonSnap.id, ...lessonSnap.data() }]
        }

        if (!lessons.length) {
          const lessonsSnap = await getDocs(query(collection(db, 'lessons'), where('courseId', '==', snap.id)))
          lessons = lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        }

        if (!cancelled) {
          setCourse({ id: snap.id, ...data })
          setCourseLessons(sortLessons(lessons))
        }
      } catch (error) {
        console.log('Error loading lesson:', error)
        if (!cancelled) {
          setCourse(null)
          setLoadError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLesson()
    return () => {
      cancelled = true
    }
  }, [requestedCourseId, reloadKey])

  // A course with a single uploaded video but no lesson document still gets one playable lesson.
  const lessons = useMemo(() => {
    if (!course) return []
    const normalized = courseLessons.map((lesson, index) => ({
      key: String(lesson.id || index),
      title: lesson.title || `Lesson ${index + 1}`,
      duration: lesson.duration || '',
      videoUrl: lesson.videoUrl || '',
    }))
    if (normalized.length) return normalized
    if (course.videoUrl) {
      return [
        {
          key: String(course.lessonId || 'main'),
          title: course.title || 'Lesson',
          duration: course.duration || '',
          videoUrl: course.videoUrl,
        },
      ]
    }
    return []
  }, [course, courseLessons])

  const activeLesson =
    lessons.find((lesson) => lesson.key === activeKey) ||
    lessons.find((lesson) => selectedVideoUrl && lesson.videoUrl === selectedVideoUrl) ||
    lessons[0] ||
    null
  const videoSource = activeLesson?.videoUrl || selectedVideoUrl || course?.videoUrl || null

  /* ------------------------------ access ----------------------------- */

  const refreshAccess = useCallback(async () => {
    if (!requestedCourseId || !auth.currentUser) {
      setPurchaseStatus({ checking: false, hasAccess: false })
      return
    }
    try {
      const result = await checkTutorialPurchase(String(requestedCourseId))
      setPurchaseStatus({ checking: false, hasAccess: Boolean(result.hasAccess || result.purchased) })
    } catch (error) {
      console.error('Unable to check tutorial access:', error)
      setPurchaseStatus((current) => ({ checking: false, hasAccess: current.hasAccess }))
    }
  }, [requestedCourseId, setPurchaseStatus])

  // Re-check whenever the screen regains focus, so returning from checkout unlocks the lesson.
  useFocusEffect(
    useCallback(() => {
      refreshAccess()
      return () => {
        try {
          videoPlayer.pause()
        } catch {
          // player already released
        }
      }
    }, [refreshAccess, videoPlayer])
  )

  /* ---------------------------- enrollment --------------------------- */

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid || !course?.id) return undefined

    return onSnapshot(
      query(collection(db, 'enrollments'), where('userId', '==', uid), where('courseId', '==', course.id)),
      (snapshot) =>
        setEnrollment(
          snapshot.empty
            ? null
            : { id: snapshot.docs[0].id, courseId: course.id, ...snapshot.docs[0].data() }
        ),
      (error) => console.error('Unable to load enrollment:', error)
    )
  }, [course?.id])

  const completedIds = useMemo(
    () => (Array.isArray(enrollment?.completedLessonIds) ? enrollment.completedLessonIds : []),
    [enrollment]
  )
  const completedCount = lessons.filter((l) => completedIds.includes(l.key)).length
  const canTrack = hasFullAccess && enrollment?.courseId === course?.id && lessons.length > 0

  async function toggleComplete(lesson) {
    if (!enrollment || enrollment.courseId !== course?.id || savingKey) return
    setSavingKey(lesson.key)
    try {
      const isDone = completedIds.includes(lesson.key)
      const nextIds = isDone ? completedIds.filter((id) => id !== lesson.key) : [...completedIds, lesson.key]
      const total = lessons.length || enrollment.totalLessons || course?.lessonsCount || 0
      await updateDoc(doc(db, 'enrollments', enrollment.id), {
        completedLessonIds: nextIds,
        completedLessons: nextIds.length,
        progress: total ? Math.min(nextIds.length / total, 1) : 0,
        lastAccessedAt: serverTimestamp(),
      })
    } catch (error) {
      console.log('Error updating lesson progress:', error)
      showAlert('Progress not saved', 'We couldn’t update your progress. Please try again.')
    } finally {
      setSavingKey(null)
    }
  }

  /* ------------------------------ video ------------------------------ */

  useEffect(() => {
    const subscription = videoPlayer.addListener('playingChange', ({ isPlaying: playing }) => setIsPlaying(playing))
    return () => subscription.remove()
  }, [videoPlayer])

  useEffect(() => {
    if (hasFullAccess) return undefined

    const subscription = videoPlayer.addListener('timeUpdate', ({ currentTime }) => {
      const time = Number.isFinite(Number(currentTime)) ? Number(currentTime) : 0
      const elapsed = Math.max(0, time - lastVideoTime.current)
      const remaining = Math.max(0, PREVIEW_SECONDS - previewConsumedSeconds.current)
      previewConsumedSeconds.current = Math.min(
        PREVIEW_SECONDS,
        previewConsumedSeconds.current + elapsed
      )
      lastVideoTime.current = time
      setPreviewTime(Math.floor(previewConsumedSeconds.current))

      if (previewConsumedSeconds.current >= PREVIEW_SECONDS && !previewLockHandled.current) {
        previewLockHandled.current = true
        const overshoot = Math.max(0, elapsed - remaining)
        if (overshoot > 0) videoPlayer.seekBy(-overshoot)
        videoPlayer.pause()
        setPreviewLocked(true)
      }
    })
    return () => subscription.remove()
  }, [videoPlayer, hasFullAccess])

  useEffect(() => {
    previewLockHandled.current = false
    lastVideoTime.current = 0
    if (!videoSource) return
    videoPlayer.replace(videoSource)
    if (autoPlay.current) {
      autoPlay.current = false
      videoPlayer.play()
    }
  }, [videoSource, videoPlayer])

  function togglePlayback() {
    if (!videoSource) {
      showAlert('Video not available', 'A video hasn’t been added to this lesson yet.')
      return
    }
    if (purchaseStatus.checking) return
    if (!hasFullAccess && previewLocked) return

    setShowVideo(true)
    if (videoPlayer.playing) videoPlayer.pause()
    else videoPlayer.play()
  }

  function selectLesson(lesson) {
    if (!hasFullAccess && previewLocked) return
    if (lesson.key === activeLesson?.key) {
      togglePlayback()
      return
    }
    if (!lesson.videoUrl) {
      showAlert('Video not available', 'A video hasn’t been added to this lesson yet.')
      return
    }
    autoPlay.current = !purchaseStatus.checking
    lastVideoTime.current = 0
    setShowVideo(true)
    setActiveKey(lesson.key)
  }

  function openPurchase() {
    try {
      videoPlayer.pause()
    } catch {
      // ignore
    }
    router.push({ pathname: '/course-details', params: { id: course.id } })
  }

  async function handleShare() {
    if (!course) return
    try {
      await Share.share({
        message: `${course.title}${tutorName ? ` by ${tutorName}` : ''} on Klaso`,
      })
    } catch {
      // dismissed
    }
  }

  /* ----------------------------- reviews ----------------------------- */

  useEffect(() => {
    if (!course?.id) return undefined

    return onSnapshot(
      collection(db, 'courses', course.id, 'reviews'),
      (snapshot) => {
        const next = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
        setReviews(next)

        // Prefill once, so incoming reviews from other students never overwrite what the user is typing.
        if (!reviewPrefilled.current) {
          const own = next.find((r) => r.userId === auth.currentUser?.uid)
          if (own) {
            reviewPrefilled.current = true
            setReviewRating(Number(own.rating) || 0)
            setReviewComment(String(own.comment || ''))
          }
        }
      },
      (error) => console.error('Unable to load tutorial reviews:', error)
    )
  }, [course?.id])

  const ownReview = reviews.find((r) => r.userId === auth.currentUser?.uid)

  async function handleSubmitReview() {
    const comment = reviewComment.trim()
    setReviewSaved(false)

    if (!auth.currentUser || !course || !hasFullAccess) {
      setReviewError('Purchase this tutorial before rating or commenting.')
      return
    }
    if (reviewRating < 1) {
      setReviewError('Choose a rating from 1 to 5 stars.')
      return
    }
    if (!comment) {
      setReviewError('Write a short comment about the tutorial.')
      return
    }

    setSavingReview(true)
    setReviewError('')
    try {
      await setDoc(doc(db, 'courses', course.id, 'reviews', auth.currentUser.uid), {
        courseId: course.id,
        userId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Student',
        rating: reviewRating,
        comment,
        createdAt: ownReview?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setReviewSaved(true)
    } catch (error) {
      console.error('Unable to save tutorial review:', error)
      setReviewError('Unable to save your review. Please try again.')
    } finally {
      setSavingReview(false)
    }
  }

  const ratingSummary = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      const value = Math.round(Number(r.rating))
      if (value >= 1 && value <= 5) distribution[value - 1] += 1
    })
    const count = reviews.length
    const average = count
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / count
      : Number(course?.rating) || 0
    return { distribution, count: count || Number(course?.reviewsCount) || 0, average, hasReviews: count > 0 }
  }, [reviews, course])

  /* ------------------------------ states ----------------------------- */

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  if (!course) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.stateIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons
            name={loadError ? 'cloud-offline-outline' : 'book-outline'}
            size={26}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          {loadError ? 'Could not load this lesson' : 'Course unavailable'}
        </Text>
        <Text style={[styles.stateText, { color: colors.textMuted }]}>
          {loadError
            ? 'Check your connection and try again.'
            : 'This course may have been removed from the catalog.'}
        </Text>
        <View style={styles.stateActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Go back</Text>
          </Pressable>
          {loadError && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setReloadKey((k) => k + 1)}
              style={[styles.primaryButton, styles.stateRetry, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    )
  }

  /* ------------------------------ render ------------------------------ */

  const tutorName = typeof course.tutor === 'string' ? course.tutor : course.tutor?.name || ''
  const tutorAvatar = typeof course.tutor === 'object' ? course.tutor?.avatar : null
  const thumbnail = course.thumbnailUrl || course.image
  const displayDuration = activeLesson?.duration || course.duration
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_COLLAPSED)
  const activeDone = activeLesson ? completedIds.includes(activeLesson.key) : false
  const showUnlockBar = !purchaseStatus.checking && !hasFullAccess
  const showCompleteBar = canTrack && !!activeLesson

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>
          Lesson
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={handleShare}
          style={[styles.iconButton, { backgroundColor: colors.borderSubtle }]}
          hitSlop={8}
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Video stage */}
          <View style={styles.stage}>
            {showVideo && videoSource ? (
              <>
                <VideoView
                  player={videoPlayer}
                  style={styles.fill}
                  contentFit="contain"
                  nativeControls={hasFullAccess}
                  allowsFullscreen={hasFullAccess}
                />
                {!hasFullAccess && !previewLocked && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
                    onPress={togglePlayback}
                    style={styles.stageTap}
                  >
                    {!isPlaying && (
                      <View style={[styles.playBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="play" size={24} color="#FFFFFF" style={styles.playIcon} />
                      </View>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play lesson"
                onPress={togglePlayback}
                style={styles.thumbnailPressable}
              >
                {thumbnail ? (
                  <Image source={{ uri: thumbnail }} style={styles.fill} resizeMode="cover" />
                ) : (
                  <View style={[styles.fill, styles.thumbFallback]}>
                    <Ionicons name="play-circle-outline" size={40} color="#6B7280" />
                  </View>
                )}
                <View style={styles.stageTap} pointerEvents="none">
                  <View style={[styles.playBadge, { backgroundColor: colors.primary }]}>
                    {purchaseStatus.checking ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Ionicons name="play" size={24} color="#FFFFFF" style={styles.playIcon} />
                    )}
                  </View>
                </View>
                {!!displayDuration && (
                  <View style={styles.durationTag} pointerEvents="none">
                    <Text style={styles.durationText}>{displayDuration}</Text>
                  </View>
                )}
              </Pressable>
            )}

            {!hasFullAccess && showVideo && !previewLocked && (
              <>
                <View style={styles.previewLabel}>
                  <Text style={styles.previewLabelText}>
                    Preview {formatClock(previewTime)} / {formatClock(PREVIEW_SECONDS)}
                  </Text>
                </View>
                <View style={styles.previewTrack}>
                  <View
                    style={[
                      styles.previewFill,
                      { backgroundColor: colors.primary, width: `${(previewTime / PREVIEW_SECONDS) * 100}%` },
                    ]}
                  />
                </View>
              </>
            )}

            {previewLocked && !hasFullAccess && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={22} color="#FFFFFF" />
                <Text style={styles.lockTitle}>Preview ended</Text>
                <Text style={styles.lockText}>
                  Purchase once for lifetime access to every lesson in this tutorial.
                </Text>
                {Number(course.price) > 0 && (
                  <Text style={styles.lockPrice}>{formatNaira(course.price)}</Text>
                )}
                <View style={styles.lockActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={openPurchase}
                    style={[styles.lockPrimary, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.lockPrimaryText}>Purchase tutorial</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Title block */}
          <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>

          {!!tutorName && (
            <View style={styles.tutorRow}>
              {tutorAvatar ? (
                <Image source={{ uri: tutorAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initialsOf(tutorName)}</Text>
                </View>
              )}
              <View style={styles.flex}>
                <Text style={[styles.tutorName, { color: colors.text }]}>{tutorName}</Text>
                {ratingSummary.average > 0 && (
                  <View style={styles.inlineRow}>
                    <Ionicons name="star" size={13} color={STAR} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {ratingSummary.average.toFixed(1)}
                      {ratingSummary.count > 0
                        ? ` (${ratingSummary.count} ${ratingSummary.count === 1 ? 'review' : 'reviews'})`
                        : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.chipRow}>
            {!!course.subject && <Chip label={course.subject} />}
            {!!course.level && <Chip label={course.level} />}
            {!!course.duration && <Chip label={course.duration} icon="time-outline" />}
          </View>

          {!hasFullAccess && !purchaseStatus.checking && (
            <View style={[styles.notice, { backgroundColor: colors.borderSubtle }]}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                You can watch the first {PREVIEW_SECONDS} seconds for free. Unlock the tutorial to watch it in full.
              </Text>
            </View>
          )}

          {!!course.headline && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{course.headline}</Text>
          )}

          {/* Lessons */}
          <Section title="Lessons" colors={colors}>
            {canTrack && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTop}>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {completedCount} of {lessons.length} completed
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: colors.primary, width: `${(completedCount / lessons.length) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {lessons.length === 0 ? (
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                No lessons have been added to this course yet.
              </Text>
            ) : (
              lessons.map((lesson, index) => {
                const active = lesson.key === activeLesson?.key
                const done = completedIds.includes(lesson.key)
                return (
                  <Pressable
                    key={lesson.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${lesson.title}`}
                    onPress={() => selectLesson(lesson)}
                    style={[
                      styles.lessonRow,
                      { borderColor: active ? colors.primary : colors.border },
                      active && { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <View
                      style={[
                        styles.lessonIndex,
                        { backgroundColor: active ? colors.primary : colors.borderSubtle },
                      ]}
                    >
                      {active && isPlaying ? (
                        <Ionicons name="volume-medium" size={15} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.lessonIndexText, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <View style={styles.flex}>
                      <Text
                        numberOfLines={2}
                        style={[styles.lessonTitle, { color: active ? colors.primary : colors.text }]}
                      >
                        {lesson.title}
                      </Text>
                      {!!lesson.duration && (
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>{lesson.duration}</Text>
                      )}
                    </View>
                    {canTrack && (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: done }}
                        accessibilityLabel={`Mark ${lesson.title} as ${done ? 'incomplete' : 'complete'}`}
                        onPress={() => toggleComplete(lesson)}
                        hitSlop={10}
                      >
                        {savingKey === lesson.key ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons
                            name={done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24}
                            color={done ? SUCCESS : colors.textMuted}
                          />
                        )}
                      </Pressable>
                    )}
                  </Pressable>
                )
              })
            )}
          </Section>

          {/* Reviews */}
          <Section title="Ratings and reviews" colors={colors}>
            {ratingSummary.hasReviews && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryScore}>
                  <Text style={[styles.summaryNumber, { color: colors.text }]}>
                    {ratingSummary.average.toFixed(1)}
                  </Text>
                  <Stars value={Math.round(ratingSummary.average)} size={14} colors={colors} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {ratingSummary.count} {ratingSummary.count === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
                <View style={styles.distribution}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingSummary.distribution[star - 1]
                    const share = ratingSummary.count ? count / ratingSummary.count : 0
                    return (
                      <View key={star} style={styles.distRow}>
                        <Text style={[styles.distLabel, { color: colors.textMuted }]}>{star}</Text>
                        <View style={[styles.distTrack, { backgroundColor: colors.borderSubtle }]}>
                          <View style={[styles.distFill, { width: `${share * 100}%` }]} />
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {hasFullAccess ? (
              <View style={[styles.reviewForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.reviewFormTitle, { color: colors.text }]}>
                  {ownReview ? 'Update your review' : 'Rate this tutorial'}
                </Text>
                <View style={styles.ratingPicker}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Pressable
                      key={rating}
                      accessibilityRole="button"
                      accessibilityLabel={`${rating} star${rating === 1 ? '' : 's'}`}
                      accessibilityState={{ selected: reviewRating === rating }}
                      onPress={() => {
                        setReviewRating(rating)
                        setReviewError('')
                        setReviewSaved(false)
                      }}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={reviewRating >= rating ? 'star' : 'star-outline'}
                        size={30}
                        color={reviewRating >= rating ? STAR : colors.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={reviewComment}
                  onChangeText={(value) => {
                    setReviewComment(value.slice(0, 1000))
                    setReviewError('')
                    setReviewSaved(false)
                  }}
                  placeholder="What did you learn? Was the explanation clear?"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  multiline
                  maxLength={1000}
                  accessibilityLabel="Review comment"
                  style={[
                    styles.reviewInput,
                    { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                  ]}
                />
                <View style={styles.reviewMetaRow}>
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[
                      styles.metaText,
                      styles.flex,
                      { color: reviewError ? colors.danger : reviewSaved ? SUCCESS : colors.textMuted },
                    ]}
                  >
                    {reviewError || (reviewSaved ? 'Your review has been saved.' : '')}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{reviewComment.length}/1000</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSubmitReview}
                  disabled={savingReview}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }, savingReview && styles.disabled]}
                >
                  {savingReview ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{ownReview ? 'Update review' : 'Submit review'}</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              !purchaseStatus.checking && (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  Unlock this tutorial to leave a rating or review.
                </Text>
              )
            )}

            {reviews.length === 0 ? (
              <Text style={[styles.metaText, { color: colors.textMuted }]}>No reviews yet.</Text>
            ) : (
              <View>
                {visibleReviews.map((review) => (
                  <View key={review.id} style={[styles.reviewItem, { borderTopColor: colors.border }]}>
                    <View style={styles.reviewTop}>
                      <View style={[styles.reviewAvatar, { backgroundColor: colors.borderSubtle }]}>
                        <Text style={[styles.reviewAvatarText, { color: colors.textSecondary }]}>
                          {initialsOf(review.authorName)}
                        </Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.reviewAuthor, { color: colors.text }]}>
                          {review.authorName || 'Student'}
                          {review.userId === auth.currentUser?.uid ? ' (you)' : ''}
                        </Text>
                        <View style={styles.inlineRow}>
                          <Stars value={Number(review.rating) || 0} size={12} colors={colors} />
                          {!!formatDate(review.createdAt) && (
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>
                              {formatDate(review.createdAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
                  </View>
                ))}

                {reviews.length > REVIEWS_COLLAPSED && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowAllReviews((v) => !v)}
                    style={[styles.showMore, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.showMoreText, { color: colors.primary }]}>
                      {showAllReviews ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </Section>
        </ScrollView>

        {/* Footer action */}
        {(showUnlockBar || showCompleteBar) && (
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            {showUnlockBar ? (
              <View style={styles.footerRow}>
                <View>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>Lifetime access</Text>
                  <Text style={[styles.footerPrice, { color: colors.text }]}>
                    {Number(course.price) > 0 ? formatNaira(course.price) : 'Free'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={openPurchase}
                  style={[styles.footerButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryButtonText}>
                    {Number(course.price) > 0 ? 'Unlock tutorial' : 'Get this tutorial'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleComplete(activeLesson)}
                disabled={!!savingKey}
                style={[
                  styles.primaryButton,
                  activeDone
                    ? { backgroundColor: 'transparent', borderColor: SUCCESS, borderWidth: 1 }
                    : { backgroundColor: colors.primary },
                  !!savingKey && styles.disabled,
                ]}
              >
                {savingKey === activeLesson.key ? (
                  <ActivityIndicator size="small" color={activeDone ? SUCCESS : '#FFFFFF'} />
                ) : (
                  <View style={styles.inlineRow}>
                    {activeDone && <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />}
                    <Text style={[styles.primaryButtonText, activeDone && { color: SUCCESS }]}>
                      {activeDone ? 'Completed' : 'Mark lesson as complete'}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Section({ title, colors, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function Chip({ label, icon }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.chip, { borderColor: colors.border }]}>
      {!!icon && <Ionicons name={icon} size={13} color={colors.textMuted} />}
      <Text numberOfLines={1} style={[styles.chipText, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  )
}

function Stars({ value, size, colors }) {
  return (
    <View style={styles.starsRow} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= value ? 'star' : 'star-outline'}
          size={size}
          color={n <= value ? STAR : colors.textMuted}
        />
      ))}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  fill: { height: '100%', width: '100%' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  disabled: { opacity: 0.55 },
  inlineRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },

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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },

  // States
  stateIcon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  stateTitle: { fontSize: 18, fontWeight: '700' },
  stateText: { fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  stateActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  stateRetry: { paddingHorizontal: 22 },

  container: { padding: 16, paddingBottom: 40 },

  // Video stage
  stage: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  thumbnailPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  stageTap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  thumbFallback: { alignItems: 'center', backgroundColor: '#111827', justifyContent: 'center' },
  playBadge: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  playIcon: { marginLeft: 3 },
  durationTag: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    right: 10,
  },
  durationText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  previewLabel: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    top: 10,
  },
  previewLabelText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  previewTrack: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    bottom: 0,
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  previewFill: { height: 3 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    gap: 4,
    justifyContent: 'center',
    padding: 16,
  },
  lockTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 },
  lockText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  lockPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 4 },
  lockActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  lockSecondary: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  lockSecondaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  lockPrimary: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  lockPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Title block
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 29, marginTop: 16 },
  tutorRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 14 },
  avatar: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  avatarImg: { borderRadius: 20, height: 40, width: 40 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  tutorName: { fontSize: 15, fontWeight: '600' },
  metaText: { fontSize: 12, lineHeight: 17 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  notice: { alignItems: 'flex-start', borderRadius: 10, flexDirection: 'row', gap: 8, marginTop: 14, padding: 12 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  description: { fontSize: 14, lineHeight: 22, marginTop: 16 },

  // Sections
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 12 },
  sectionBody: { gap: 12 },

  // Lessons
  progressWrap: { gap: 6 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { borderRadius: 2, height: 4, overflow: 'hidden' },
  progressFill: { borderRadius: 2, height: 4 },
  lessonRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
    padding: 12,
  },
  lessonIndex: { alignItems: 'center', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  lessonIndexText: { fontSize: 13, fontWeight: '700' },
  lessonTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },

  // Reviews
  summaryRow: { alignItems: 'center', flexDirection: 'row', gap: 24 },
  summaryScore: { alignItems: 'center', gap: 4 },
  summaryNumber: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  distribution: { flex: 1, gap: 6 },
  distRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  distLabel: { fontSize: 12, width: 10 },
  distTrack: { borderRadius: 2, flex: 1, height: 6, overflow: 'hidden' },
  distFill: { backgroundColor: STAR, borderRadius: 2, height: 6 },
  starsRow: { flexDirection: 'row', gap: 2 },

  reviewForm: { borderRadius: 12, borderWidth: 1, gap: 12, padding: 14 },
  reviewFormTitle: { fontSize: 15, fontWeight: '700' },
  ratingPicker: { flexDirection: 'row', gap: 8 },
  reviewInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    height: 100,
    paddingHorizontal: 12,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  reviewMetaRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },

  reviewItem: { borderTopWidth: StyleSheet.hairlineWidth, gap: 8, paddingVertical: 14 },
  reviewTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  reviewAvatar: { alignItems: 'center', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  reviewAvatarText: { fontSize: 12, fontWeight: '700' },
  reviewAuthor: { fontSize: 13, fontWeight: '600' },
  reviewComment: { fontSize: 14, lineHeight: 21 },
  showMore: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  showMoreText: { fontSize: 14, fontWeight: '600' },

  // Buttons
  primaryButton: { alignItems: 'center', borderRadius: 12, height: 50, justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },

  // Footer
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 12 },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  footerPrice: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  footerButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
})