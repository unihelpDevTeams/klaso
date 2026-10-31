import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
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
import { auth, db } from '../firebase/config'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export default function EditProfileScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ displayName: '', bio: '', avatarUrl: '' })
  const [avatarUri, setAvatarUri] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    setProfile({
      displayName: currentUser.displayName || '',
      bio: '',
      avatarUrl: '',
    })
  }, [])

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Permission to access photos is required.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri)
      setError('')
    }
  }

  async function uploadAvatar() {
    if (!avatarUri) return { url: '', publicId: '', resourceType: 'image' }
    if (avatarUri.startsWith('http://') || avatarUri.startsWith('https://')) {
      return { url: avatarUri, publicId: userProfile?.avatarPublicId || '', resourceType: 'image' }
    }

    const filename = avatarUri.split('/').pop() || `avatar-${Date.now()}.jpg`
    const formData = new FormData()
    formData.append('file', {
      uri: avatarUri,
      name: filename,
      type: 'image/jpeg',
    })
    formData.append('folder', 'klaso/profiles')

    const response = await fetch(`${API_URL}/api/upload-media`, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.details || data.error || 'Avatar upload failed.')
    }

    return {
      url: data.url,
      publicId: data.publicId,
      resourceType: data.resourceType,
    }
  }

  async function handleSave() {
    if (!auth.currentUser) {
      setError('Please sign in to continue.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const avatarResult = await uploadAvatar()

      await updateProfile(auth.currentUser, {
        displayName: profile.displayName.trim(),
        photoURL: avatarResult.url || auth.currentUser.photoURL || '',
      })

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: profile.displayName.trim(),
        bio: profile.bio.trim(),
        photoURL: avatarResult.url || profile.avatarUrl || '',
        publicId: avatarResult.publicId || profile.publicId || '',
        updatedAt: serverTimestamp(),
      })

      setSuccess('Profile updated successfully.')
      setTimeout(() => router.back(), 800)
    } catch (saveError) {
      console.log('Edit profile error:', saveError)
      setError(saveError.message || 'Unable to update profile right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#14351D" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="camera-outline" size={28} color="#57a0ff" />
            </View>
          )}
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={profile.displayName}
            onChangeText={(value) => setProfile((current) => ({ ...current, displayName: value }))}
            placeholder="Your name"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={profile.bio}
            onChangeText={(value) => setProfile((current) => ({ ...current, bio: value }))}
            placeholder="Tell learners about yourself"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={5}
            style={[styles.input, styles.textArea]}
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryText}>Save changes</Text>}
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
  avatarWrap: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 80,
    overflow: 'hidden',
    padding: 6,
  },
  avatarImage: {
    borderRadius: 74,
    height: 148,
    width: 148,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 74,
    height: 148,
    justifyContent: 'center',
    width: 148,
  },
  formGroup: { marginTop: 20 },
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderRadius: 16,
    marginTop: 24,
    paddingVertical: 16,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#B42318', fontSize: 14, marginTop: 12 },
  successText: { color: '#047857', fontSize: 14, marginTop: 12 },
})
