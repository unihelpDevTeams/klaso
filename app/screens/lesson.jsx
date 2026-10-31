import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { VideoView, useVideoPlayer } from 'expo-video'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
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
import { auth, db } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'

export default function LessonDetailScreen() {
  const router = useRouter()
  const { lessonId, courseId, videoUrl } = useLocalSearchParams()
  const selectedVideoUrl = typeof videoUrl === 'string' ? videoUrl : null
  const requestedCourseId = lessonId || courseId
  const { colors, isDark } = useTheme()

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [completedModules, setCompletedModules] = useState({})
  const [updatingProgress, setUpdatingProgress] = useState(false)
  const videoPlayer = useVideoPlayer(selectedVideoUrl || course?.videoUrl || null, (player) => {
    player.loop = false
  })

  useEffect(() => {
    async function loadLesson() {
      setLoading(true)
      try {
        if (requestedCourseId) {
          const docRef = doc(db, 'courses', String(requestedCourseId))
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            let curriculum = Array.isArray(data.curriculum) ? data.curriculum : []
            if (!curriculum.length && data.lessonId) {
              const lessonSnapshot = await getDoc(doc(db, 'lessons', data.lessonId))
              if (lessonSnapshot.exists()) {
                curriculum = [{ id: lessonSnapshot.id, ...lessonSnapshot.data() }]
              }
            } else if (!curriculum.length) {
              const lessonSnapshot = await getDocs(
                query(collection(db, 'lessons'), where('courseId', '==', docSnap.id))
              )
              curriculum = lessonSnapshot.docs.map((lessonDoc) => ({
                id: lessonDoc.id,
                ...lessonDoc.data(),
              }))
            }
            setCourse({ id: docSnap.id, ...data, curriculum })
            setLoading(false)
            return
          }
        }

        setCourse(null)
      } catch (err) {
        console.log('Error loading lesson:', err)
        setCourse(null)
      } finally {
        setLoading(false)
      }
    }
    loadLesson()
  }, [requestedCourseId])

  useEffect(() => {
    videoPlayer.replace(selectedVideoUrl || course?.videoUrl || null)
  }, [course?.videoUrl, selectedVideoUrl, videoPlayer])

  const toggleVideoPlayback = () => {
    if (!selectedVideoUrl && !course?.videoUrl) {
      Alert.alert('Video unavailable', 'This lesson does not have an uploaded video yet.')
      return
    }

    if (videoPlayer.playing) {
      videoPlayer.pause()
      setIsPlaying(false)
    } else {
      videoPlayer.play()
      setIsPlaying(true)
    }
  }

  const toggleModuleComplete = (modId) => {
    setCompletedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }))
  }

  const handleMarkLessonComplete = async () => {
    if (!auth.currentUser || !course) return
    setUpdatingProgress(true)

    try {
      // Find user enrollment document
      const q = query(
        collection(db, 'enrollments'),
        where('userId', '==', auth.currentUser.uid),
        where('courseId', '==', String(course.id))
      )
      const snap = await getDocs(q)

      if (!snap.empty) {
        const docRef = doc(db, 'enrollments', snap.docs[0].id)
        const currentData = snap.docs[0].data()
        const totalLessons = currentData.totalLessons || course.lessonsCount || course.curriculum?.length || 0
        if (!totalLessons) {
          Alert.alert('Progress Unavailable', 'This course has no lesson count recorded yet.')
          return
        }
        const newCompleted = Math.min((currentData.completedLessons || 0) + 1, totalLessons)
        const newProgress = newCompleted / totalLessons

        await updateDoc(docRef, {
          completedLessons: newCompleted,
          progress: newProgress,
          lastAccessedAt: serverTimestamp(),
        })
      } else {
        Alert.alert('Enrollment Required', 'This course is not in your enrolled courses.')
        return
      }

      Alert.alert(
        'Lesson Completed! 🎓',
        'Great work! Your progress has been updated in your profile and learning dashboard.'
      )
    } catch (err) {
      console.log('Error updating lesson progress:', err)
      Alert.alert('Progress Not Saved', 'Your lesson progress could not be updated. Please try again.')
    } finally {
      setUpdatingProgress(false)
    }
  }

  const handleShare = async () => {
    if (!course) return
    try {
      await Share.share({
        message: `Learning "${course.title}" on Klaso Mobile! Highly recommended.`,
      })
    } catch {
      // dismissed
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading classroom lesson...
        </Text>
      </SafeAreaView>
    )
  }

  if (!course) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="book-outline" size={40} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text, marginTop: 16 }]}>Course unavailable</Text>
        <Text style={[styles.loadingText, { color: colors.textMuted, textAlign: 'center' }]}>
          This course could not be loaded from the catalog.
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 20 }]}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const curriculum = Array.isArray(course.curriculum) ? course.curriculum : []

  const tutorName = course.tutor?.name || course.tutor || ''

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: isDark ? '#1C2920' : '#FFFFFF', borderColor: colors.border },
            ]}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.screenHeaderTitle, { color: colors.text }]}>
            Active Classroom
          </Text>
          <Pressable
            onPress={handleShare}
            style={[
              styles.iconButton,
              { backgroundColor: isDark ? '#1C2920' : '#FFFFFF', borderColor: colors.border },
            ]}
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Video Player Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.thumbnail}>
            {isPlaying && (selectedVideoUrl || course.videoUrl) ? (
              <VideoView
                player={videoPlayer}
                style={styles.videoView}
                contentFit="contain"
                nativeControls
              />
            ) : (
              <>
                {course.image || course.thumbnailUrl ? (
                  <Image
                    source={{ uri: course.image || course.thumbnailUrl }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumbImage, styles.thumbnailFallback]}>
                    <Ionicons name="book-outline" size={36} color={colors.textMuted} />
                  </View>
                )}
                <Pressable style={styles.playBadge} onPress={toggleVideoPlayback}>
                  <Ionicons name="play" size={26} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </Pressable>
              </>
            )}
            <View style={styles.durationTag}>
              <Text style={styles.duration}>
                {isPlaying ? 'Playing' : course.duration}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {course.level ? <View
              style={[
                styles.tag,
                { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: isDark ? '#4ADE80' : '#15803D' },
                ]}
              >
                {course.subject}
              </Text>
            </View> : null}
            <View
              style={[
                styles.tag,
                { backgroundColor: isDark ? '#1C2920' : '#F3F4F6' },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: isDark ? colors.textSecondary : '#4B5563' },
                ]}
              >
                {course.level || 'Intermediate'}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>

          {tutorName ? <View style={styles.tutorRow}>
            {course.tutor?.avatar ? (
              <Image source={{ uri: course.tutor.avatar }} style={styles.avatarImg} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: isDark ? '#1C2920' : '#E5E7EB' },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.text }]}>
                  {tutorName.charAt(0)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.tutor, { color: colors.text }]}>{tutorName}</Text>
              {course.rating != null ? (
                <Text style={[styles.views, { color: colors.textMuted }]}>
                  {`★ ${course.rating}`}{course.reviewsCount != null ? ` (${course.reviewsCount} reviews)` : ''}
                </Text>
              ) : null}
            </View>
          </View> : null}

          {course.headline ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {course.headline}
            </Text>
          ) : null}
        </View>

        {/* Modules Interactive Checklist */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Lesson Modules & Checkpoints
          </Text>
          {curriculum.length ? curriculum.map((module, index) => {
            const isDone = completedModules[module.id || index]
            return (
              <Pressable
                key={module.id || index}
                style={[
                  styles.moduleRow,
                  { borderBottomColor: isDark ? '#233228' : '#F3F4F6' },
                ]}
                onPress={() => toggleModuleComplete(module.id || index)}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: isDone
                        ? colors.primary
                        : isDark
                        ? '#1C2920'
                        : '#F3F4F6',
                      borderColor: isDone ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={isDone ? 'checkmark' : 'play-outline'}
                    size={14}
                    color={isDone ? '#FFFFFF' : colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.moduleText,
                      {
                        color: isDone ? colors.textMuted : colors.text,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {module.title}
                  </Text>
                  {module.duration ? (
                    <Text style={[styles.moduleSub, { color: colors.textMuted }]}>
                      {module.duration}
                    </Text>
                  ) : null}
                </View>
                {isDone && (
                  <Ionicons name="checkmark-done" size={18} color={colors.primary} />
                )}
              </Pressable>
            )
          }) : (
            <Text style={[styles.moduleSub, { color: colors.textMuted }]}>No lessons have been added to this course yet.</Text>
          )}
        </View>

        {/* Mark Lesson Complete Button */}
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleMarkLessonComplete}
          disabled={updatingProgress}
        >
          {updatingProgress ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Mark Lesson Complete</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingText: { marginTop: 12, fontSize: 13 },
  container: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  thumbnail: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F1A13',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
    position: 'absolute',
    elevation: 4,
  },
  durationTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  duration: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 12,
  },
  tutorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarImg: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  tutor: {
    fontSize: 14,
    fontWeight: '700',
  },
  views: {
    fontSize: 11,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  moduleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  checkCircle: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  moduleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moduleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
