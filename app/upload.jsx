import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { auth, db } from '../firebase/config'
import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

const defaultForm = {
  title: '',
  description: '',
  hashtags: '',
  subject: 'Mathematics',
  level: 'Beginner',
  duration: '12:00',
  price: '0',
}

export default function UploadScreen() {
  const router = useRouter()
  const [form, setForm] = useState(defaultForm)
  const [thumbnailUri, setThumbnailUri] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function pickThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Permission to access your photos is required.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })

    if (!result.canceled && result.assets?.[0]) {
      setThumbnailUri(result.assets[0].uri)
      setError('')
    }
  }

  async function uploadToCloudinary() {
    if (!thumbnailUri) return { url: '', publicId: '', resourceType: 'image' }

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

      const lessonRef = await addDoc(collection(db, 'lessons'), {
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
        resourceType: uploaded.resourceType || 'image',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      if (uploaded.publicId) {
        await updateDoc(lessonRef, {
          lessonId: lessonRef.id,
        })
      }

      setSuccess('Lesson uploaded successfully.')
      setForm(defaultForm)
      setThumbnailUri('')
      setTimeout(() => router.back(), 800)
    } catch (uploadError) {
      console.log('Upload lesson error:', uploadError)
      setError(uploadError.message || 'Unable to upload lesson right now.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteLessonAsset(publicId) {
    if (!publicId) return

    try {
      await fetch(`${API_URL}/api/delete-media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, resourceType: 'image' }),
      })
    } catch (deleteError) {
      console.log('Cloudinary cleanup error:', deleteError)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#14351D" />
        </Pressable>
        <Text style={styles.headerTitle}>Upload lesson</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.thumbnailBox} onPress={pickThumbnail}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnailPreview} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#57a0ff" />
              <Text style={styles.placeholderText}>Add thumbnail</Text>
            </View>
          )}
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={form.title}
            onChangeText={(value) => updateField('title', value)}
            placeholder="Lesson title"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Tell students what they’ll learn"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={5}
            style={[styles.input, styles.textArea]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Hashtags</Text>
          <TextInput
            value={form.hashtags}
            onChangeText={(value) => updateField('hashtags', value)}
            placeholder="math, algebra, exam-prep"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.half]}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              value={form.subject}
              onChangeText={(value) => updateField('subject', value)}
              placeholder="Math"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={[styles.formGroup, styles.half]}>
            <Text style={styles.label}>Level</Text>
            <TextInput
              value={form.level}
              onChangeText={(value) => updateField('level', value)}
              placeholder="Beginner"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.half]}>
            <Text style={styles.label}>Duration</Text>
            <TextInput
              value={form.duration}
              onChangeText={(value) => updateField('duration', value)}
              placeholder="12:00"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={[styles.formGroup, styles.half]}>
            <Text style={styles.label}>Price</Text>
            <TextInput
              value={form.price}
              onChangeText={(value) => updateField('price', value)}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>
        </View>

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitText}>Publish lesson</Text>}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => deleteLessonAsset('')}>
          <Text style={styles.secondaryText}>Clear draft</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { color: '#14351D', fontSize: 20, fontWeight: '800' },
  placeholder: { width: 40 },
  container: { padding: 18, paddingBottom: 32 },
  thumbnailBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  thumbnailPreview: {
    aspectRatio: 16 / 9,
    width: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
  },
  placeholderText: { color: '#57a0ff', fontSize: 15, fontWeight: '700', marginTop: 8 },
  formGroup: { marginTop: 18 },
  label: { color: '#14351D', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderRadius: 16,
    marginTop: 20,
    paddingVertical: 16,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 16,
    marginTop: 12,
    paddingVertical: 14,
  },
  secondaryText: { color: '#57a0ff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#B42318', fontSize: 14, marginTop: 12 },
  successText: { color: '#047857', fontSize: 14, marginTop: 12 },
})
