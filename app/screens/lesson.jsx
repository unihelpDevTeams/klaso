import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'

const lessons = [
  {
    id: '1',
    title: 'Mastering algebra basics',
    tutor: 'Mr. Adebayo',
    subject: 'Mathematics',
    duration: '18:24',
    views: '2.1k views',
    level: 'Beginner',
    rating: '4.9',
    description:
      'Learn the foundations of algebra through simple problem-solving patterns, clear explanations, and practical exercises that build confidence quickly.',
    modules: [
      'Understanding variables and expressions',
      'Solving linear equations step by step',
      'Graphing simple equations',
      'Real-life algebra problem practice',
    ],
  },
  {
    id: '2',
    title: 'Introduction to cell biology',
    tutor: 'Dr. Ngozi Eze',
    subject: 'Science',
    duration: '24:07',
    views: '958 views',
    level: 'Intermediate',
    rating: '4.8',
    description:
      'Explore the structure and function of cells, from the basic parts of a cell to how they work together in living systems.',
    modules: [
      'The cell as the basic unit of life',
      'Organelles and their functions',
      'Diffusion and osmosis',
      'Cell division overview',
    ],
  },
  {
    id: '3',
    title: 'Writing a clear thesis statement',
    tutor: 'Mrs. Funmi Bello',
    subject: 'Languages',
    duration: '12:55',
    views: '3.4k views',
    level: 'Beginner',
    rating: '4.9',
    description:
      'Build stronger arguments by learning how to turn a broad topic into a precise, arguable thesis that guides your writing.',
    modules: [
      'What makes a thesis strong',
      'From topic to claim',
      'Adding focus and direction',
      'Editing for clarity',
    ],
  },
  {
    id: '4',
    title: 'Balancing chemical equations fast',
    tutor: 'Dr. Ngozi Eze',
    subject: 'Science',
    duration: '15:40',
    views: '1.2k views',
    level: 'Intermediate',
    rating: '4.7',
    description:
      'Master the technique for balancing chemical equations quickly and confidently using coefficients, patterns, and trial methods.',
    modules: [
      'Atoms and coefficients',
      'Balancing simple reactions',
      'Checking your work',
      'Common mistakes to avoid',
    ],
  },
  {
    id: '5',
    title: 'Intro to break-even analysis',
    tutor: 'Mr. Chuka Obi',
    subject: 'Business',
    duration: '9:18',
    views: '540 views',
    level: 'Intermediate',
    rating: '4.6',
    description:
      'Understand the break-even point and how businesses use it to measure cost, revenue, and profit performance.',
    modules: [
      'Fixed vs variable costs',
      'Revenue and contribution margin',
      'Break-even formula',
      'Reading the break-even chart',
    ],
  },
]

export default function LessonDetailScreen() {
  const router = useRouter()
  const { lessonId } = useLocalSearchParams()
  const lesson = lessons.find((item) => item.id === String(lessonId)) || lessons[0]

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#14351D" />
          </Pressable>
          <Pressable onPress={() => {}} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color="#14351D" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.thumbnail}>
            <View style={styles.playBadge}>
              <Ionicons name="play" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.duration}>{lesson.duration}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.tag}>{lesson.subject}</Text>
            <Text style={styles.tag}>{lesson.level}</Text>
          </View>

          <Text style={styles.title}>{lesson.title}</Text>

          <View style={styles.tutorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{lesson.tutor.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.tutor}>{lesson.tutor}</Text>
              <Text style={styles.views}>{lesson.views} · ⭐ {lesson.rating}</Text>
            </View>
          </View>

          <Text style={styles.description}>{lesson.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you’ll learn</Text>
          {lesson.modules.map((module, index) => (
            <View key={module} style={styles.moduleRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={14} color="#57a0ff" />
              </View>
              <Text style={styles.moduleText}>{index + 1}. {module}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.primaryButton} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Start lesson</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  container: {
    flexGrow: 1,
    paddingBottom: 36,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  thumbnail: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    backgroundColor: '#E8F4EB',
    borderRadius: 18,
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  playBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,53,29,0.35)',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  duration: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    bottom: 10,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#EAF3FF',
    borderRadius: 999,
    color: '#57a0ff',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    color: '#14351D',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 14,
  },
  tutorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E8F4EB',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
  },
  tutor: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '700',
  },
  views: {
    color: '#718178',
    fontSize: 12,
    marginTop: 2,
  },
  description: {
    color: '#5D6D61',
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 18,
    padding: 18,
  },
  sectionTitle: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  moduleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  moduleText: {
    color: '#1D2A23',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#57a0ff',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    height: 58,
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
})
