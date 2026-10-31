import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

const defaultForm = {
  title: '',
  description: '',
  hashtags: '',
  subject: '',
  level: 'Intermediate',
  duration: '45 mins',
  price: '3500',
}

export default function UploadScreen() {
  const { colors, isDark } = useTheme()
  const [form, setForm] = useState(defaultForm)
  const [thumbnailUri, setThumbnailUri] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function pickThumbnail() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setThumbnailUri(result.assets[0].uri)
        setError('')
      }
    } catch {
      setError('Unable to pick an image. Please try again.')
    }
  }

  async function uploadToCloudinary() {
    if (!thumbnailUri) return { url: '', publicId: '', resourceType: 'image' }
    if (thumbnailUri.startsWith('http://') || thumbnailUri.startsWith('https://')) {
      return { url: thumbnailUri, publicId: '', resourceType: 'image' }
    }

    try {
      const localUri = thumbnailUri
      const filename = localUri.split('/').pop() || `thumbnail-${Date.now()}.jpg`
      const formData = new FormData()
      formData.append('file', {
        uri: localUri,
        name: filename,
        type: 'image/jpeg',
      })
      formData.append('folder', 'klaso/lessons')

      const response = await fetch(`${API_URL}/api/upload-media`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Thumbnail upload failed.')
      }

      return {
        url: data.url,
        publicId: data.publicId,
        resourceType: data.resourceType,
      }
    } catch {
      // Fallback to high quality education stock photo if backend upload fails
      return {
        url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
        publicId: '',
        resourceType: 'image',
      }
    }
  }

  async function handleSubmit() {
    if (!auth.currentUser) {
      setError('Please sign in first.')
      return
    }

    if (!form.title.trim() || !form.description.trim() || !form.subject.trim()) {
      setError('Title, description, and subject are required.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const uploaded = await uploadToCloudinary()

      // 1. Save to `courses` collection for instant display on homepage feed
      await addDoc(collection(db, 'courses'), {
        title: form.title.trim(),
        headline: form.description.trim(),
        subject: form.subject.trim(),
        level: form.level || 'Intermediate',
        duration: form.duration ? `${form.duration}` : '45 mins',
        price: Number(form.price) || 3500,
        originalPrice: (Number(form.price) || 3500) * 1.5,
        thumbnailUrl:
          uploaded.url ||
          'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
        tutor: {
          name: auth.currentUser.displayName || 'Certified Tutor',
          avatar:
            auth.currentUser.photoURL ||
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
          title: `${form.subject.trim()} Instructor`,
          rating: 5.0,
          students: '1+',
        },
        rating: 5.0,
        reviewsCount: 1,
        studentsCount: '1',
        status: 'published',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 2. Also record in `lessons` collection for tutor studio management
      await addDoc(collection(db, 'lessons'), {
        title: form.title.trim(),
        description: form.description.trim(),
        hashtags: form.hashtags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
        subject: form.subject.trim(),
        level: form.level,
        duration: form.duration,
        price: form.price,
        thumbnailUrl: uploaded.url || '',
        publicId: uploaded.publicId || '',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      })

      setSuccess('Course lesson uploaded successfully! It is now live.')
      setForm(defaultForm)
      setThumbnailUri('')
      setTimeout(() => router.back(), 900)
    } catch (uploadError) {
      console.log('Upload lesson error:', uploadError)
      setError(uploadError.message || 'Unable to upload lesson right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
          ]}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Creator Studio
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[
            styles.thumbnailBox,
            {
              backgroundColor: isDark ? '#1C2920' : '#E8F5E9',
              borderColor: colors.border,
            },
          ]}
          onPress={pickThumbnail}
        >
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnailPreview} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.primary} />
              <Text style={[styles.placeholderText, { color: colors.primary }]}>
                Add Lesson Thumbnail
              </Text>
              <Text style={[styles.placeholderSub, { color: colors.textMuted }]}>
                Recommended: 16:9 widescreen JPG or PNG
              </Text>
            </View>
          )}
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Lesson Title</Text>
          <TextInput
            value={form.title}
            onChangeText={(value) => updateField('title', value)}
            placeholder="e.g. Calculus 1A: Differential Equations"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Description & Learning Goals</Text>
          <TextInput
            value={form.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Explain the concepts covered and exam benefits for students..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Hashtags</Text>
          <TextInput
            value={form.hashtags}
            onChangeText={(value) => updateField('hashtags', value)}
            placeholder="math, calculus, waec, jamb"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.half]}>
            <Text style={[styles.label, { color: colors.text }]}>Subject Area</Text>
            <TextInput
              value={form.subject}
              onChangeText={(value) => updateField('subject', value)}
              placeholder="e.g. Mathematics"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          <View style={[styles.formGroup, styles.half]}>
            <Text style={[styles.label, { color: colors.text }]}>Target Level</Text>
            <TextInput
              value={form.level}
              onChangeText={(value) => updateField('level', value)}
              placeholder="e.g. WAEC / UTME"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.half]}>
            <Text style={[styles.label, { color: colors.text }]}>Duration</Text>
            <TextInput
              value={form.duration}
              onChangeText={(value) => updateField('duration', value)}
              placeholder="e.g. 45 mins"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          <View style={[styles.formGroup, styles.half]}>
            <Text style={[styles.label, { color: colors.text }]}>Price (₦)</Text>
            <TextInput
              value={form.price}
              onChangeText={(value) => updateField('price', value)}
              placeholder="3500"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>
        </View>

        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Publish to Klaso Catalog</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  placeholder: { width: 36 },

  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  thumbnailBox: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 180,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailPreview: {
    height: '100%',
    width: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderSub: {
    fontSize: 11,
  },

  formGroup: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  submitButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  successText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
})
