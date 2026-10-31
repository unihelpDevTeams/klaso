import Ionicons from '@expo/vector-icons/Ionicons'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
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
  level: '',
  duration: '',
  price: '',
}

export default function UploadScreen() {
  const { colors, isDark } = useTheme()
  const [form, setForm] = useState(defaultForm)
  const [thumbnailUri, setThumbnailUri] = useState('')
  const [videoAsset, setVideoAsset] = useState(null)
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

  async function pickVideo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoQuality: 1,
      })

      if (!result.canceled && result.assets?.[0]) {
        setVideoAsset(result.assets[0])
        setError('')
      }
    } catch {
      setError('Unable to select a video. Please try again.')
    }
  }

  async function uploadMedia(uri, folder) {
    const filename = uri.split('/').pop() || `media-${Date.now()}`
    const formData = new FormData()
    formData.append('file', new File(uri), filename)
    const idToken = await auth.currentUser.getIdToken()
    const response = await fetch(
      `${API_URL}/api/upload-media?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      }
    )
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Media upload failed.')
    }

    return data
  }

  async function handleSubmit() {
    if (!auth.currentUser) {
      setError('Please sign in first.')
      return
    }

    const price = Number(form.price)
    if (!form.title.trim() || !form.description.trim() || !form.subject.trim() || !form.price.trim() || !Number.isFinite(price) || price < 0) {
      setError('Title, description, subject, and a valid price are required. Enter 0 for a free course.')
      return
    }

    if (!videoAsset?.uri) {
      setError('Select a tutorial video before publishing.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    const uploadedKeys = []

    try {
      const uploadedVideo = await uploadMedia(videoAsset.uri, 'klaso/lessons')
      uploadedKeys.push(uploadedVideo.key)
      const uploadedThumbnail = thumbnailUri
        ? await uploadMedia(thumbnailUri, 'klaso/lessons')
        : null
      if (uploadedThumbnail?.key) uploadedKeys.push(uploadedThumbnail.key)
      const thumbnailUrl = uploadedThumbnail?.url || ''

      const batch = writeBatch(db)
      const courseRef = doc(collection(db, 'courses'))
      const lessonRef = doc(collection(db, 'lessons'))

      batch.set(courseRef, {
        title: form.title.trim(),
        headline: form.description.trim(),
        subject: form.subject.trim(),
        ...(form.level.trim() ? { level: form.level.trim() } : {}),
        ...(form.duration.trim() ? { duration: form.duration.trim() } : {}),
        price,
        thumbnailUrl,
        thumbnailKey: uploadedThumbnail?.key || '',
        videoUrl: uploadedVideo.url,
        videoKey: uploadedVideo.key,
        tutor: {
          name: auth.currentUser.displayName || '',
          ...(auth.currentUser.photoURL ? { avatar: auth.currentUser.photoURL } : {}),
        },
        status: 'published',
        createdBy: auth.currentUser.uid,
        lessonId: lessonRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      batch.set(lessonRef, {
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
        thumbnailUrl: uploadedThumbnail?.url || '',
        thumbnailKey: uploadedThumbnail?.key || '',
        videoUrl: uploadedVideo.url,
        videoKey: uploadedVideo.key,
        courseId: courseRef.id,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      })
      await batch.commit()

      setSuccess('Course lesson uploaded successfully! It is now live.')
      setForm(defaultForm)
      setThumbnailUri('')
      setVideoAsset(null)
      setTimeout(() => router.back(), 900)
    } catch (uploadError) {
      console.log('Upload lesson error:', uploadError)
      setError(uploadError.message || 'Unable to upload lesson right now.')
      try {
        const idToken = await auth.currentUser?.getIdToken()
        if (idToken) {
          await Promise.all(
            uploadedKeys.map(async (key) => {
              const response = await fetch(`${API_URL}/api/delete-media`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${idToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key }),
              })
              if (!response.ok) {
                console.error('Unable to remove failed lesson upload:', await response.text())
              }
            })
          )
        }
      } catch (cleanupError) {
        console.error('Unable to clean up failed lesson uploads:', cleanupError)
      }
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

        <Pressable
          style={[
            styles.videoPicker,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={pickVideo}
          disabled={loading}
        >
          <Ionicons
            name={videoAsset ? 'videocam' : 'videocam-outline'}
            size={22}
            color={colors.primary}
          />
          <View style={styles.videoPickerText}>
            <Text style={[styles.label, { color: colors.text }]}>
              {videoAsset?.fileName || 'Select Tutorial Video'}
            </Text>
            <Text style={[styles.placeholderSub, { color: colors.textMuted }]}>
              MP4, MOV, or WebM, up to 500 MB
            </Text>
          </View>
          <Ionicons name="folder-open-outline" size={20} color={colors.textMuted} />
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
  videoPicker: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  videoPickerText: {
    flex: 1,
    gap: 4,
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
