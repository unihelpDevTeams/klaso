import Ionicons from '@expo/vector-icons/Ionicons'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { updateProfile } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
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

export default function EditProfileScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(() => ({
    displayName: auth.currentUser?.displayName || '',
    bio: '',
    avatarUrl: auth.currentUser?.photoURL || '',
  }))
  const [avatarUri, setAvatarUri] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    // Fetch existing bio from Firestore
    async function loadUserDoc() {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid))
        if (snap.exists()) {
          const data = snap.data()
          setProfile({
            displayName: data.displayName || currentUser.displayName || '',
            bio: data.bio || '',
            avatarUrl: data.photoURL || currentUser.photoURL || '',
          })
          if (data.photoURL) {
            setAvatarUri(data.photoURL)
          }
        }
      } catch {
        // Ignore
      }
    }
    loadUserDoc()
  }, [])

  async function pickAvatar() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setError('Permission to access photos is required.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets?.[0]) {
        setAvatarUri(result.assets[0].uri)
        setError('')
      }
    } catch {
      setError('Unable to pick an image. Please try again.')
    }
  }

  async function uploadAvatar() {
    if (!avatarUri) return { url: '', publicId: '', resourceType: 'image' }
    if (avatarUri.startsWith('http://') || avatarUri.startsWith('https://')) {
      return { url: avatarUri, publicId: '', resourceType: 'image' }
    }

    const filename = avatarUri.split('/').pop() || `avatar-${Date.now()}.jpg`
    const formData = new FormData()
    formData.append('file', new File(avatarUri), filename)
    const idToken = await auth.currentUser.getIdToken()

    const response = await fetch(
      `${API_URL}/api/upload-media?folder=klaso%2Fprofiles`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Avatar upload failed.')
    }

    return {
      url: data.url,
      publicId: data.key,
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[
            styles.avatarWrap,
            {
              backgroundColor: isDark ? '#1C2920' : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
          onPress={pickAvatar}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
              ]}
            >
              <Ionicons name="camera-outline" size={32} color={colors.primary} />
            </View>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            value={profile.displayName}
            onChangeText={(value) =>
              setProfile((current) => ({ ...current, displayName: value }))
            }
            placeholder="Your name"
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
          <Text style={[styles.label, { color: colors.text }]}>Bio & Learning Goals</Text>
          <TextInput
            value={profile.bio}
            onChangeText={(value) =>
              setProfile((current) => ({ ...current, bio: value }))
            }
            placeholder="Share your academic goals, targets, or tutoring focus..."
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

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary },
            loading && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryText}>Save Changes</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  placeholder: { width: 36 },
  container: { padding: 18, paddingBottom: 32 },

  avatarWrap: {
    alignSelf: 'center',
    borderRadius: 60,
    borderWidth: 1,
    overflow: 'visible',
    position: 'relative',
    marginTop: 8,
  },
  avatarImage: {
    borderRadius: 56,
    height: 112,
    width: 112,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 56,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  formGroup: { marginTop: 18 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },

  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 24,
    paddingVertical: 15,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 12 },
  successText: { color: '#15803D', fontSize: 13, fontWeight: '700', marginTop: 12 },
})
