import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { collection, onSnapshot } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { db } from '../../firebase/config'
import Header from '../components/header'

export default function SearchScreen() {
  const { colors, isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'courses'),
      (snapshot) => {
        setCourses(
          snapshot.docs.map((courseDoc) => ({
            id: courseDoc.id,
            ...courseDoc.data(),
          }))
        )
        setLoading(false)
        setError('')
      },
      (snapshotError) => {
        console.error('Unable to load courses for search:', snapshotError)
        setError('Unable to load courses right now. Please try again later.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return courses

    return courses.filter((course) => {
      const tutorName =
        typeof course.tutor === 'string' ? course.tutor : course.tutor?.name || ''
      const searchableText = [
        course.title,
        course.subject,
        course.headline,
        course.description,
        course.level,
        tutorName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [courses, searchQuery])

  const openCourse = (course) => {
    router.push({
      pathname: '/course-details',
      params: { id: course.id, title: course.title },
    })
  }

  const renderCourse = ({ item }) => {
    const tutorName = typeof item.tutor === 'string' ? item.tutor : item.tutor?.name || ''

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, taught by ${tutorName}`}
        onPress={() => openCourse(item)}
        style={({ pressed }) => [
          styles.courseCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {item.thumbnailUrl || item.image ? (
          <Image
            source={{ uri: item.thumbnailUrl || item.image }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.thumbnailFallback,
              { backgroundColor: isDark ? '#1C2920' : '#E8F5E9' },
            ]}
          >
            <Ionicons name="book-outline" size={30} color={colors.primary} />
          </View>
        )}
        <View style={styles.courseDetails}>
          <Text style={[styles.subject, { color: colors.primary }]} numberOfLines={1}>
            {item.subject || ''}
          </Text>
          <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title || ''}
          </Text>
          <Text style={[styles.tutor, { color: colors.textMuted }]} numberOfLines={1}>
            {tutorName}
          </Text>
          <Text style={[styles.price, { color: colors.text }]}>
            {typeof item.price === 'number'
              ? item.price === 0
                ? 'Free'
                : `₦${item.price.toLocaleString()}`
              : 'Price unavailable'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header showBack={false} title="Search" subtitle="Find courses and lessons" />

      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={21} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Search courses"
          autoCapitalize="none"
          onChangeText={setSearchQuery}
          placeholder="Search courses, subjects, tutors"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
        />
        {searchQuery ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setSearchQuery('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={renderCourse}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={34} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery.trim()
                  ? 'No courses match your search.'
                  : 'No courses are available yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  searchBox: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 14,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 48,
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingTop: 2,
  },
  courseCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 112,
    padding: 10,
  },
  thumbnail: {
    borderRadius: 10,
    height: 88,
    width: 96,
  },
  thumbnailFallback: {
    alignItems: 'center',
    borderRadius: 10,
    height: 88,
    justifyContent: 'center',
    width: 96,
  },
  courseDetails: {
    flex: 1,
    gap: 4,
  },
  subject: {
    fontSize: 11,
    fontWeight: '700',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  tutor: {
    fontSize: 12,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
})
