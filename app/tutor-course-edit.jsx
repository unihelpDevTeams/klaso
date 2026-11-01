import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { deleteField, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from './components/header'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'
import { deleteTutorTutorial } from '../services/tutorialService'

export default function TutorCourseEditScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const courseId = typeof id === 'string' ? id : ''
  const { colors, isDark } = useTheme()
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    level: '',
    duration: '',
    price: '',
  })
  const [lessonId, setLessonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [courseLoaded, setCourseLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadCourse() {
      try {
        if (!courseId || !auth.currentUser) {
          setError('Sign in to manage your tutorial.')
          return
        }

        const courseSnapshot = await getDoc(doc(db, 'courses', courseId))
        if (!courseSnapshot.exists() || courseSnapshot.data().createdBy !== auth.currentUser.uid) {
          setError('This tutorial is unavailable or you do not have permission to edit it.')
          return
        }

        const course = courseSnapshot.data()
        let lesson = null
        if (course.lessonId) {
          const lessonSnapshot = await getDoc(doc(db, 'lessons', course.lessonId))
          if (lessonSnapshot.exists()) {
            lesson = lessonSnapshot.data()
            setLessonId(lessonSnapshot.id)
          }
        }

        if (active) {
          setForm({
            title: course.title || '',
            description: course.headline || course.description || lesson?.description || '',
            subject: course.subject || lesson?.subject || '',
            level: course.level || lesson?.level || '',
            duration: String(course.duration || lesson?.duration || ''),
            price: String(course.price ?? lesson?.price ?? ''),
          })
          setCourseLoaded(true)
        }
      } catch (loadError) {
        console.error('Unable to load tutorial for editing:', loadError)
        if (active) setError('Unable to load this tutorial. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCourse()
    return () => {
      active = false
    }
  }, [courseId])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const saveChanges = async () => {
    const price = form.price.trim() ? Number(form.price) : NaN
    if (!form.title.trim() || !form.description.trim() || !form.subject.trim()) {
      setError('Title, description, and subject are required.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid course price, or use 0 for a free course.')
      return
    }
    if (!auth.currentUser || !courseId) {
      setError('Sign in to manage your tutorial.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'courses', courseId), {
        title: form.title.trim(),
        headline: form.description.trim(),
        subject: form.subject.trim(),
        level: form.level.trim(),
        duration: form.duration.trim(),
        price,
        originalPrice: deleteField(),
        updatedAt: serverTimestamp(),
      })

      if (lessonId) {
        batch.update(doc(db, 'lessons', lessonId), {
          title: form.title.trim(),
          description: form.description.trim(),
          subject: form.subject.trim(),
          level: form.level.trim(),
          duration: form.duration.trim(),
          price,
        })
      }

      await batch.commit()
      Alert.alert('Tutorial updated', 'Your changes have been saved.')
      router.back()
    } catch (saveError) {
      console.error('Unable to save tutorial changes:', saveError)
      setError(saveError.message || 'Unable to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteTutorial = () => {
    if (!courseLoaded || saving || deleting) return

    Alert.alert(
      'Delete tutorial?',
      'This permanently removes the tutorial, its lessons, and their Cloudflare R2 media. Tutorials with a purchase cannot be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete tutorial',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            setError('')
            try {
              const result = await deleteTutorTutorial(courseId)
              Alert.alert(
                'Tutorial deleted',
                `Tutorial removed. ${result.deletedMediaCount} media file${result.deletedMediaCount === 1 ? '' : 's'} deleted from Cloudflare R2.`
              )
              router.back()
            } catch (deleteError) {
              console.error('Unable to delete tutorial:', deleteError)
              setError(deleteError.message || 'Unable to delete this tutorial. Please try again.')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const fields = [
    { key: 'title', label: 'Tutorial title', placeholder: 'For example, Introduction to Algebra' },
    { key: 'description', label: 'Description', placeholder: 'What will learners study?', multiline: true },
    { key: 'subject', label: 'Subject', placeholder: 'For example, Mathematics' },
    { key: 'level', label: 'Level', placeholder: 'For example, Beginner' },
    { key: 'duration', label: 'Duration', placeholder: 'For example, 45 mins' },
    { key: 'price', label: 'Price (₦)', placeholder: '0 for a free course', keyboardType: 'decimal-pad' },
  ]

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header title="Edit tutorial" showBack />
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.intro, { color: colors.textMuted }]}>
            Update the information learners see on your tutorial page. Media replacement is not available here.
          </Text>

          {fields.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
              <TextInput
                value={form[field.key]}
                onChangeText={(value) => updateField(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={field.keyboardType || 'default'}
                multiline={field.multiline}
                textAlignVertical={field.multiline ? 'top' : 'center'}
                style={[
                  styles.input,
                  field.multiline && styles.multilineInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
              />
            </View>
          ))}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? '#3B1517' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            disabled={saving || deleting}
            onPress={saveChanges}
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving || deleting ? 0.7 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save changes</Text>
              </>
            )}
          </Pressable>

          {courseLoaded ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving || deleting }}
              disabled={saving || deleting}
              onPress={confirmDeleteTutorial}
              style={[styles.deleteButton, { borderColor: colors.danger, opacity: saving || deleting ? 0.6 : 1 }]}
            >
              {deleting ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete tutorial</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, paddingBottom: 36 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  multilineInput: { minHeight: 110, paddingTop: 12 },
  errorBox: {
    alignItems: 'center',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    padding: 12,
  },
  errorText: { color: '#B91C1C', flex: 1, fontSize: 13, lineHeight: 18 },
  saveButton: {
    alignItems: 'center',
    borderRadius: 13,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 4,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  deleteButton: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 12,
  },
  deleteButtonText: { fontSize: 14, fontWeight: '700' },
})
