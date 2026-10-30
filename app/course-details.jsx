import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
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

const SAMPLE_COURSES = {
  '1': {
    id: '1',
    title: 'Mastering Algebra Basics & Linear Equations',
    headline: 'Build rock-solid mathematical thinking from foundational algebra to advanced exam problem solving.',
    subject: 'Mathematics',
    level: 'Beginner to Intermediate',
    rating: 4.9,
    reviewsCount: 324,
    studentsCount: '1,420',
    duration: '6 hours total',
    lessonsCount: 14,
    price: 12500,
    originalPrice: 18000,
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Engr. Tunde Adeleke',
      title: 'Senior Mathematics Instructor & FUTA Engineering Alum',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      rating: 4.95,
      students: '620+',
    },
    learningPoints: [
      'Understand algebraic expressions, variables, and unknown quantities',
      'Solve linear equations, inequalities, and simultaneous systems step by step',
      'Graph straight-line equations on coordinate axes with confidence',
      'Ace WAEC, JAMB, and university entrance math questions effortlessly',
    ],
    curriculum: [
      { id: 'm1', title: 'Module 1: Introduction to Algebraic Reasoning', duration: '45 mins', isFree: true },
      { id: 'm2', title: 'Module 2: Linear Equations with Single Variable', duration: '1h 10m', isFree: false },
      { id: 'm3', title: 'Module 3: Simultaneous Equations (Substitution & Elimination)', duration: '1h 35m', isFree: false },
      { id: 'm4', title: 'Module 4: Quadratic Equations and Factorization', duration: '1h 20m', isFree: false },
      { id: 'm5', title: 'Module 5: Real-World Word Problems & Exam Drills', duration: '1h 10m', isFree: false },
    ],
  },
  '2': {
    id: '2',
    title: 'Cellular Biology & Genetics Foundations',
    headline: 'Comprehensive biology essentials covering cellular structures, enzyme kinetics, and DNA inheritance.',
    subject: 'Science',
    level: 'Intermediate',
    rating: 4.85,
    reviewsCount: 218,
    studentsCount: '980',
    duration: '5 hours 30m',
    lessonsCount: 12,
    price: 11000,
    originalPrice: 15000,
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Dr. Ngozi Eze',
      title: 'Ph.D. in Cellular Biology & WAEC Examiner',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      rating: 4.9,
      students: '450+',
    },
    learningPoints: [
      'Analyze plant and animal cell ultrastructure and organelle specialization',
      'Master diffusion, active transport, and osmotic equilibrium in cells',
      'Calculate genetic probabilities using Punnett squares and Mendelian ratios',
      'Prepare effectively for medical school entrance and biology olympiads',
    ],
    curriculum: [
      { id: 'm1', title: 'Module 1: The Microscopic Architecture of Living Cells', duration: '50 mins', isFree: true },
      { id: 'm2', title: 'Module 2: Biochemical Pathways and Cellular Respiration', duration: '1h 15m', isFree: false },
      { id: 'm3', title: 'Module 3: Nucleic Acids, DNA Replication & Transcription', duration: '1h 40m', isFree: false },
      { id: 'm4', title: 'Module 4: Mendelian Inheritance & Genetic Disorders', duration: '1h 45m', isFree: false },
    ],
  },
}

export default function CourseDetailsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const courseId = params.id ? String(params.id) : '1'
  const course = SAMPLE_COURSES[courseId] || SAMPLE_COURSES['1']

  const [activeTab, setActiveTab] = useState('overview')
  const [isBookmarked, setIsBookmarked] = useState(false)

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${course.title}" on Klaso Online Academy! Master ${course.subject} with top tutors.`,
      })
    } catch {
      // user dismissed
    }
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    Alert.alert(
      isBookmarked ? 'Removed from Saved' : 'Course Saved',
      isBookmarked
        ? 'Course removed from your wishlist.'
        : 'Course added to your saved courses in My Learning tab!'
    )
  }

  const handleEnroll = () => {
    router.push({
      pathname: '/checkout',
      params: {
        id: course.id,
        title: course.title,
        price: course.price,
        tutor: course.tutor.name,
        subject: course.subject,
      },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Top Floating Nav Bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.navButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#14351D" />
        </Pressable>
        <View style={styles.navRight}>
          <Pressable onPress={handleBookmark} style={styles.navButton} hitSlop={10}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? '#15803D' : '#14351D'}
            />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.navButton} hitSlop={10}>
            <Ionicons name="share-social-outline" size={22} color="#14351D" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Course Image with Preview Tag */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: course.image }} style={styles.heroImage} />
          <Pressable
            style={styles.playButtonOverlay}
            onPress={() => router.push({ pathname: '/screens/lesson', params: { lessonId: course.id } })}
          >
            <View style={styles.playIconCircle}>
              <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.previewTag}>Watch Free Preview</Text>
          </Pressable>
        </View>

        {/* Main Details Body */}
        <View style={styles.contentCard}>
          <View style={styles.badgeRow}>
            <View style={styles.subjectChip}>
              <Text style={styles.subjectChipText}>{course.subject}</Text>
            </View>
            <View style={styles.levelChip}>
              <Text style={styles.levelChipText}>{course.level}</Text>
            </View>
          </View>

          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseHeadline}>{course.headline}</Text>

          {/* Social Proof Stats */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#F5A623" />
              <Text style={styles.statBold}>{course.rating}</Text>
              <Text style={styles.statMuted}>({course.reviewsCount})</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="#718178" />
              <Text style={styles.statBold}>{course.studentsCount}</Text>
              <Text style={styles.statMuted}>students</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color="#718178" />
              <Text style={styles.statBold}>{course.duration}</Text>
            </View>
          </View>

          {/* Instructor Card */}
          <View style={styles.instructorBox}>
            <Image source={{ uri: course.tutor.avatar }} style={styles.tutorAvatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.tutorName}>{course.tutor.name}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#15803D" />
              </View>
              <Text style={styles.tutorTitle} numberOfLines={2}>{course.tutor.title}</Text>
              <Text style={styles.tutorMeta}>★ {course.tutor.rating} rating • {course.tutor.students} students</Text>
            </View>
          </View>

          {/* Segmented Detail Tabs */}
          <View style={styles.segmentedTabs}>
            <Pressable
              style={[styles.segmentTab, activeTab === 'overview' && styles.segmentTabActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.segmentTabText, activeTab === 'overview' && styles.segmentTabTextActive]}>
                Overview
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentTab, activeTab === 'curriculum' && styles.segmentTabActive]}
              onPress={() => setActiveTab('curriculum')}
            >
              <Text style={[styles.segmentTabText, activeTab === 'curriculum' && styles.segmentTabTextActive]}>
                Curriculum ({course.curriculum.length})
              </Text>
            </Pressable>
          </View>

          {/* OVERVIEW CONTENT */}
          {activeTab === 'overview' && (
            <View style={styles.tabContentSection}>
              <Text style={styles.sectionHeading}>What You Will Learn</Text>
              <View style={styles.learningGrid}>
                {course.learningPoints.map((point, index) => (
                  <View key={index} style={styles.learningRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#15803D" style={{ marginTop: 2 }} />
                    <Text style={styles.learningText}>{point}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionHeading}>Course Guarantee</Text>
              <View style={styles.guaranteeBox}>
                <Ionicons name="shield-checkmark" size={24} color="#15803D" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guaranteeTitle}>Certificate of Completion</Text>
                  <Text style={styles.guaranteeSub}>
                    Receive a verifiable digital certificate upon completing all lessons and practice quizzes.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* CURRICULUM CONTENT */}
          {activeTab === 'curriculum' && (
            <View style={styles.tabContentSection}>
              <Text style={styles.sectionHeading}>Course Lessons</Text>
              <View style={styles.curriculumList}>
                {course.curriculum.map((mod, idx) => (
                  <Pressable
                    key={mod.id}
                    style={styles.moduleItem}
                    onPress={() => {
                      if (mod.isFree) {
                        router.push({ pathname: '/screens/lesson', params: { lessonId: course.id } })
                      } else {
                        Alert.alert('Course Locked', 'Enroll now to unlock all modules, exercise files, and tests.')
                      }
                    }}
                  >
                    <View style={[styles.moduleIconBox, mod.isFree && styles.moduleIconBoxFree]}>
                      <Ionicons
                        name={mod.isFree ? 'play' : 'lock-closed'}
                        size={16}
                        color={mod.isFree ? '#15803D' : '#8A9B8E'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>{mod.title}</Text>
                      <Text style={styles.moduleDuration}>{mod.duration}</Text>
                    </View>
                    {mod.isFree && (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>Preview</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Price</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₦{course.price.toLocaleString()}</Text>
            {course.originalPrice && (
              <Text style={styles.originalPrice}>₦{course.originalPrice.toLocaleString()}</Text>
            )}
          </View>
        </View>

        <Pressable
          style={styles.enrollButton}
          onPress={handleEnroll}
          accessibilityLabel="Enroll in this course"
        >
          <Text style={styles.enrollButtonText}>Enroll Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  navBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomColor: '#F0F2F1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  navRight: {
    flexDirection: 'row',
    gap: 10,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroWrapper: {
    backgroundColor: '#14351D',
    height: 220,
    position: 'relative',
    width: '100%',
  },
  heroImage: {
    height: '100%',
    opacity: 0.85,
    width: '100%',
  },
  playButtonOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  playIconCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(21, 128, 61, 0.9)',
    borderRadius: 32,
    elevation: 8,
    height: 64,
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 64,
  },
  previewTag: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 14,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  contentCard: {
    padding: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  subjectChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subjectChipText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  levelChip: {
    backgroundColor: '#F3F6F4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelChipText: {
    color: '#4A5B50',
    fontSize: 12,
    fontWeight: '600',
  },
  courseTitle: {
    color: '#14351D',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  courseHeadline: {
    color: '#55655B',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  statsBar: {
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderColor: '#E8EFEA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 18,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statBold: {
    color: '#14351D',
    fontSize: 14,
    fontWeight: '800',
  },
  statMuted: {
    color: '#718178',
    fontSize: 13,
  },
  statSeparator: {
    backgroundColor: '#DFE7E1',
    height: 18,
    width: 1,
  },
  instructorBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    padding: 14,
  },
  tutorAvatar: {
    backgroundColor: '#E8F5E9',
    borderRadius: 25,
    height: 50,
    width: 50,
  },
  tutorName: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
  },
  tutorTitle: {
    color: '#718178',
    fontSize: 12,
    marginTop: 2,
  },
  tutorMeta: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  segmentedTabs: {
    borderBottomColor: '#E8EFEA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
  },
  segmentTab: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  segmentTabActive: {
    borderBottomColor: '#15803D',
  },
  segmentTabText: {
    color: '#718178',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTabTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  tabContentSection: {
    paddingTop: 4,
  },
  sectionHeading: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },
  learningGrid: {
    gap: 12,
    marginBottom: 20,
  },
  learningRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  learningText: {
    color: '#374151',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  guaranteeBox: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  guaranteeTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
  },
  guaranteeSub: {
    color: '#15803D',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  curriculumList: {
    gap: 10,
  },
  moduleItem: {
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderColor: '#E8EFEA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  moduleIconBox: {
    alignItems: 'center',
    backgroundColor: '#E8EFEA',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  moduleIconBoxFree: {
    backgroundColor: '#E8F5E9',
  },
  moduleTitle: {
    color: '#14351D',
    fontSize: 13,
    fontWeight: '700',
  },
  moduleDuration: {
    color: '#718178',
    fontSize: 12,
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freeBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0F2F1',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: 'absolute',
    right: 0,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  totalLabel: {
    color: '#8A9B8E',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  priceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
  },
  currentPrice: {
    color: '#14351D',
    fontSize: 22,
    fontWeight: '900',
  },
  originalPrice: {
    color: '#A0B0A5',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  enrollButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
