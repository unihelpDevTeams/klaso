import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
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
  { id: '2', label: 'Science', color: '#FFF3DC' },
  { id: '3', label: 'Languages', color: '#EAF0FF' },
  { id: '4', label: 'Business', color: '#F5EAF5' },
]

const lessons = [
  { id: '1', title: 'Mastering algebra basics', tutor: 'Mr. Adebayo', subject: 'Mathematics', duration: '18:24', views: '2.1k views' },
  { id: '2', title: 'Introduction to cell biology', tutor: 'Dr. Ngozi Eze', subject: 'Science', duration: '24:07', views: '958 views' },
  { id: '3', title: 'Writing a clear thesis statement', tutor: 'Mrs. Funmi Bello', subject: 'Languages', duration: '12:55', views: '3.4k views' },
  { id: '4', title: 'Balancing chemical equations fast', tutor: 'Dr. Ngozi Eze', subject: 'Science', duration: '15:40', views: '1.2k views' },
  { id: '5', title: 'Intro to break-even analysis', tutor: 'Mr. Chuka Obi', subject: 'Business', duration: '9:18', views: '540 views' },
]

const categoryByLabel = categories.reduce((acc, c) => ({ ...acc, [c.label]: c }), {})

export default function Home() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showSearch, setShowSearch] = useState(false)
  const firstName = auth.currentUser?.displayName?.split(' ')[0] || 'Learner'

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesCategory = selectedCategory === 'All' || lesson.subject === selectedCategory
      const matchesQuery = `${lesson.title} ${lesson.subject} ${lesson.tutor}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [selectedCategory, query])

  function openSearch() {
    setShowSearch(true)
  }

  function closeSearch() {
    setShowSearch(false)
    setQuery('')
  }

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
        onSearchClose={closeSearch}
        onSearchPress={openSearch}
        onNotificationPress={() => {}}
        searchPlaceholder="Search lessons, tutors, topics"
      />

      <View style={styles.chipsWrap}>
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
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
              </Pressable>
            )
          }}
        />
      </View>

      <FlatList
        data={filteredLessons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        renderItem={({ item }) => {
          const category = categoryByLabel[item.subject] || { color: '#EDEFEF' }
          return (
            <Pressable style={styles.videoCard} onPress={() => router.push('/screens/lesson', { lessonId: item.id })}>
              <View style={[styles.thumbnail, { backgroundColor: category.color }]}>
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.tutor.charAt(0)}</Text>
                </View>
                <View style={styles.videoCopy}>
                  <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.videoMeta} numberOfLines={1}>{item.tutor} · {item.subject}</Text>
                  <Text style={styles.videoMeta} numberOfLines={1}>{item.views}</Text>
                </View>
                <Pressable hitSlop={8} accessibilityLabel="More options">
                  <Ionicons name="ellipsis-vertical" size={16} color="#718178" />
                </Pressable>
              </View>
            </Pressable>
          )
        }}
        ListHeaderComponent={
          !query && !showSearch ? (
            <View style={styles.greetingWrap}>
              <Text style={styles.greeting}>Hello, {firstName}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>No lessons match &quot;{query}&quot;. Try another search.</Text>}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },

  greetingWrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  greeting: { color: '#14351D', fontSize: 24, fontWeight: '800' },
  chipsWrap: { borderBottomColor: '#EDEFEF', borderBottomWidth: 1, paddingVertical: 10 },
  chipsRow: { gap: 8, paddingHorizontal: 16 },
  chip: {
    backgroundColor: '#F0F3F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: '#14351D' },
  chipText: { color: '#3D4F42', fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },

  feed: { paddingBottom: 32, paddingTop: 4 },
  videoCard: { marginBottom: 22, paddingHorizontal: 16 },
  thumbnail: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,53,29,0.35)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    right: 8,
  },
  durationText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  videoInfo: { flexDirection: 'row', gap: 10, marginTop: 10 },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E8F4EB',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
    width: 36,
  },
  avatarText: { color: '#14351D', fontSize: 14, fontWeight: '800' },
  videoCopy: { flex: 1 },
  videoTitle: { color: '#14351D', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  videoMeta: { color: '#718178', fontSize: 12.5, marginTop: 3 },

  empty: { color: '#718178', fontSize: 14, paddingTop: 40, textAlign: 'center' },
})