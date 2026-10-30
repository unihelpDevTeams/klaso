import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth } from '../../firebase/config'

const categories = [
  { id: 'all', label: 'All' },
  { id: '1', label: 'Mathematics', color: '#E8F4EB' },
  { id: '2', label: 'Computer Science', color: '#EAF0FF' },
  { id: '3', label: 'Science', color: '#FFF3DC' },
  { id: '4', label: 'Languages', color: '#FDE8E8' },
  { id: '5', label: 'Business', color: '#F5EAF5' },
]

const popularCourses = [
  {
    id: '1',
    title: 'Calculus 1A: Differential & Integral',
    tutor: 'Dr. Emmanuel A.',
    subject: 'Mathematics',
    duration: '12 lessons · 4h',
    price: '₦2,500',
    rating: '4.8',
    reviews: '1.2k',
    color: '#E8F4EB',
  },
  {
    id: '2',
    title: 'Data Structures & Algorithms in Python',
    tutor: 'Engr. Tunde Bello',
    subject: 'Computer Science',
    duration: '16 lessons · 5.5h',
    price: '₦3,500',
    rating: '4.9',
    reviews: '920',
    color: '#EAF0FF',
  },
  {
    id: '3',
    title: 'Organic Chemistry & Reaction Mechanisms',
    tutor: 'Miss Chioma Okafor',
    subject: 'Science',
    duration: '10 lessons · 3h',
    price: '₦2,000',
    rating: '4.7',
    reviews: '750',
    color: '#FFF3DC',
  },
  {
    id: '4',
    title: 'Financial Accounting & Cost Control',
    tutor: 'Mr. Chuka Obi',
    subject: 'Business',
    duration: '8 lessons · 2.5h',
    price: '₦2,500',
    rating: '4.8',
    reviews: '610',
    color: '#F5EAF5',
  },
]

export default function Home() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showSearch, setShowSearch] = useState(false)
  const firstName = auth.currentUser?.displayName?.split(' ')[0] || 'Learner'

  const filteredCourses = useMemo(() => {
    return popularCourses.filter((course) => {
      const matchesCategory = selectedCategory === 'All' || course.subject === selectedCategory
      const matchesQuery = `${course.title} ${course.subject} ${course.tutor}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [selectedCategory, query])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <Header
        showLogo
        showSearch
        showNotifications
        searchMode={showSearch}
        searchValue={query}
        onSearchChange={setQuery}
        onSearchClose={() => {
          setShowSearch(false)
          setQuery('')
        }}
        onSearchPress={() => setShowSearch(true)}
        onNotificationPress={() => {}}
        searchPlaceholder="Search courses, tutors, topics"
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!showSearch && (
          <>
            {/* Hero Motivation Banner */}
            <View style={styles.heroCard}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroBadge}>WELCOME BACK</Text>
                <Text style={styles.heroTitle}>Keep learning,{'\n'}keep winning!</Text>
                <Text style={styles.heroSubtitle}>Your next big step is just a lesson away.</Text>
                <Pressable
                  style={styles.browseButton}
                  onPress={() => router.push('/(tabs)/tutors')}
                >
                  <Text style={styles.browseButtonText}>Browse Tutors</Text>
                  <Ionicons name="arrow-forward" size={15} color="#15803D" />
                </Pressable>
              </View>
              <View style={styles.heroIconCircle}>
                <Ionicons name="school" size={54} color="#FFFFFF" />
              </View>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="book-outline" size={18} color="#0284C7" />
                </View>
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>In progress</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="flame-outline" size={18} color="#D97706" />
                </View>
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>Day streak</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="ribbon-outline" size={18} color="#15803D" />
                </View>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Certificates</Text>
              </View>
            </View>

            {/* Continue Learning Active Card */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
              <Pressable onPress={() => router.push('/(tabs)/purchases')}>
                <Text style={styles.seeAllText}>See all</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.activeCourseCard}
              onPress={() => router.push('/screens/lesson')}
            >
              <View style={styles.activeCourseHeader}>
                <View style={styles.activeCourseThumbnail}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.activeCourseInfo}>
                  <Text style={styles.activeCourseTitle} numberOfLines={1}>Calculus 1A: Limits & Continuity</Text>
                  <Text style={styles.activeCourseTutor}>Dr. Emmanuel A. · Lesson 4 of 12</Text>
                </View>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressValue}>60%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: '60%' }]} />
                </View>
              </View>
            </Pressable>
          </>
        )}

        {/* Categories Horizontal Filter Chips */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Popular Courses</Text>
        </View>

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
                onPress={() => setSelectedCategory(item.label)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            )
          }}
        />

        {/* Courses Feed */}
        <View style={styles.coursesList}>
          {filteredCourses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.courseCard}
              onPress={() =>
                router.push({
                  pathname: '/course-details',
                  params: { id: course.id, title: course.title },
                })
              }
            >
              <View style={[styles.courseThumb, { backgroundColor: course.color }]}>
                <View style={styles.playOverlay}>
                  <Ionicons name="videocam-outline" size={28} color="#14351D" />
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>{course.price}</Text>
                </View>
              </View>

              <View style={styles.courseBody}>
                <View style={styles.ratingRow}>
                  <View style={styles.starRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{course.rating}</Text>
                    <Text style={styles.reviewsText}>({course.reviews})</Text>
                  </View>
                  <Text style={styles.subjectBadge}>{course.subject}</Text>
                </View>

                <Text style={styles.courseTitle} numberOfLines={2}>
                  {course.title}
                </Text>

                <View style={styles.courseFooter}>
                  <View style={styles.tutorRow}>
                    <View style={styles.tutorAvatar}>
                      <Text style={styles.tutorInitial}>{course.tutor[0]}</Text>
                    </View>
                    <Text style={styles.tutorName}>{course.tutor}</Text>
                  </View>
                  <Text style={styles.durationText}>{course.duration}</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {filteredCourses.length === 0 && (
            <Text style={styles.empty}>No courses match &quot;{query}&quot;. Try another subject.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAF8' },
  container: { paddingBottom: 40 },

  heroCard: {
    backgroundColor: '#15803D',
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  heroTextCol: { flex: 1, paddingRight: 10 },
  heroBadge: { color: '#BBF7D0', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 28 },
  heroSubtitle: { color: '#DCFCE7', fontSize: 13, marginTop: 6, lineHeight: 18 },
  browseButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  browseButtonText: { color: '#15803D', fontSize: 13, fontWeight: '800' },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { color: '#14351D', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#6B7280', fontSize: 11, marginTop: 2, textAlign: 'center' },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { color: '#14351D', fontSize: 18, fontWeight: '800' },
  seeAllText: { color: '#15803D', fontSize: 13, fontWeight: '700' },

  activeCourseCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  activeCourseTitle: { color: '#14351D', fontSize: 15, fontWeight: '700' },
  activeCourseTutor: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  progressContainer: { marginTop: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  progressValue: { color: '#15803D', fontSize: 12, fontWeight: '800' },
  progressBarTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#15803D', borderRadius: 3 },

  chipsRow: { gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: '#15803D', borderColor: '#15803D' },
  chipText: { color: '#4B5563', fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },

  coursesList: { paddingHorizontal: 16, gap: 16 },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  courseThumb: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  playOverlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#15803D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  courseBody: { padding: 14 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#14351D', fontSize: 13, fontWeight: '700' },
  reviewsText: { color: '#6B7280', fontSize: 12 },
  subjectBadge: {
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  courseTitle: { color: '#14351D', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 10,
  },
  tutorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tutorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorInitial: { color: '#374151', fontSize: 12, fontWeight: '700' },
  tutorName: { color: '#4B5563', fontSize: 13, fontWeight: '600' },
  durationText: { color: '#6B7280', fontSize: 12 },
  empty: { color: '#6B7280', fontSize: 14, textAlign: 'center', paddingVertical: 30 },
})
