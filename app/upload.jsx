import Ionicons from '@expo/vector-icons/Ionicons'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { router, useNavigation } from 'expo-router'
import { onIdTokenChanged } from 'firebase/auth'
import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
const OTHER = 'Other'
const SUCCESS = '#15803D'

const SUBJECTS = [
  'Mathematics',
  'Science (Biology/Chemistry/Physics)',
  'Languages (English & Literature)',
  'Computer Science & Coding',
  'Economics & Business',
  'General Academics',
]

const LEVELS = [
  'WAEC / WASSCE',
  'NECO',
  'JAMB / UTME',
  'Post-UTME',
  'University courses',
  'General skills',
]

const INITIAL_FORM = {
  title: '',
  description: '',
  hashtags: '',
  subject: '',
  subjectOther: '',
  level: '',
  levelOther: '',
  price: '',
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// expo-image-picker reports video duration in milliseconds.
function formatVideoDuration(milliseconds) {
  const total = Math.round(Number(milliseconds) / 1000)
  if (!Number.isFinite(total) || total <= 0) return ''

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function formatFileSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return ''
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`
  return `${Math.round(value / 1024)} KB`
}

function parseHashtags(raw) {
  const seen = new Set()
  return raw
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#+/, '').replace(/[^A-Za-z0-9_]/g, '').toLowerCase())
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false
      seen.add(tag)
      return true
    })
    .slice(0, 10)
    .map((tag) => `#${tag}`)
}

function resolveChoice(choice, other) {
  return choice === OTHER ? other.trim() : choice
}

function validate(form, videoAsset) {
  const e = {}
  const title = form.title.trim()
  const description = form.description.trim()

  if (!videoAsset?.uri) e.video = 'Select the lesson video.'

  if (!title) e.title = 'Enter a lesson title.'
  else if (title.length < 5) e.title = 'Use at least 5 characters.'

  if (!description) e.description = 'Describe what students will learn.'
  else if (description.length < 20) e.description = 'Use at least 20 characters.'

  if (!form.subject) e.subject = 'Select a subject.'
  else if (form.subject === OTHER && !form.subjectOther.trim()) e.subjectOther = 'Enter the subject.'

  if (form.level === OTHER && !form.levelOther.trim()) e.levelOther = 'Enter the target level.'

  if (form.price === '') e.price = 'Enter a price. Use 0 for a free lesson.'

  return e
}

function friendlyError(error) {
  const message = String(error?.message || '')
  if (/network request failed|failed to fetch|network error/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message || 'Unable to publish this lesson right now.'
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function UploadScreen() {
  const { colors, isDark } = useTheme()
  const navigation = useNavigation()

  const [access, setAccess] = useState('checking') // checking | allowed | pending | denied
  const [form, setForm] = useState(INITIAL_FORM)
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [thumbnailUri, setThumbnailUri] = useState('')
  const [videoAsset, setVideoAsset] = useState(null)
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(null) // video | thumbnail | publish
  const [submitError, setSubmitError] = useState('')
  const [published, setPublished] = useState(false)

  const allowLeave = useRef(false)
  const leaveTimer = useRef(null)
  const descriptionRef = useRef(null)

  /* ------------------------- access control ------------------------ */

  useEffect(() => {
    let unsubscribeProfile = () => {}

    const unsubscribeAuth = onIdTokenChanged(auth, (user) => {
      unsubscribeProfile()
      if (!user) {
        setAccess('denied')
        return
      }

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          const profile = snapshot.data()
          if (profile?.role === 'tutor' && profile?.approved === true) setAccess('allowed')
          else if (profile?.role === 'tutor') setAccess('pending')
          else setAccess('denied')
        },
        () => setAccess('denied')
      )
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile()
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, [])

  /* ------------------------- unsaved changes ------------------------ */

  const dirty = useMemo(
    () =>
      !!videoAsset ||
      !!thumbnailUri ||
      Object.entries(form).some(([, value]) => String(value).trim().length > 0),
    [form, videoAsset, thumbnailUri]
  )

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeave.current) return

      if (loading) {
        event.preventDefault()
        Alert.alert('Upload in progress', 'Please wait until the lesson has finished publishing.')
        return
      }

      if (!dirty) return

      event.preventDefault()
      Alert.alert('Discard this lesson?', 'The details and files you selected will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ])
    })
    return unsubscribe
  }, [navigation, dirty, loading])

  /* ----------------------------- form ------------------------------ */

  const errors = useMemo(() => validate(form, videoAsset), [form, videoAsset])
  const showError = (field) => (touched[field] || attempted) && errors[field]
  const hashtags = useMemo(() => parseHashtags(form.hashtags), [form.hashtags])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    if (submitError) setSubmitError('')
  }

  function touch(field) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }))
  }

  /* ------------------------------ media ---------------------------- */

  async function pickThumbnail() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })
      if (!result.canceled && result.assets?.[0]) {
        setThumbnailUri(result.assets[0].uri)
        setSubmitError('')
      }
    } catch {
      setSubmitError('Unable to open your photo library. Please try again.')
    }
  }

  async function pickVideo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
      })
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        setVideoAsset(asset)
        setDuration(formatVideoDuration(asset.duration))
        touch('video')
        setSubmitError('')
      }
    } catch {
      setSubmitError('Unable to open your video library. Please try again.')
    }
  }

  function removeVideo() {
    setVideoAsset(null)
    setDuration('')
  }

  async function uploadMedia(uri, folder, name) {
    const filename = name || uri.split('/').pop() || `media-${Date.now()}`
    const formData = new FormData()
    formData.append('file', new File(uri), filename)

    const idToken = await auth.currentUser.getIdToken()
    const response = await fetch(`${API_URL}/api/upload-media?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Media upload failed.')
    return data
  }

  async function removeUploaded(keys) {
    if (!keys.length) return
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) return
      await Promise.all(
        keys.map(async (key) => {
          const response = await fetch(`${API_URL}/api/delete-media`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
          })
          if (!response.ok) console.error('Unable to remove failed lesson upload:', await response.text())
        })
      )
    } catch (cleanupError) {
      console.error('Unable to clean up failed lesson uploads:', cleanupError)
    }
  }

  /* ----------------------------- submit ---------------------------- */

  async function handleSubmit() {
    if (loading) return
    setAttempted(true)
    setSubmitError('')

    if (Object.keys(errors).length > 0) {
      setSubmitError('Some details are missing or incorrect. Check the highlighted fields.')
      return
    }

    const user = auth.currentUser
    if (!user) {
      setSubmitError('Your session has expired. Sign in again to continue.')
      return
    }

    const price = Math.round(Number(form.price))
    const subject = resolveChoice(form.subject, form.subjectOther)
    const level = resolveChoice(form.level, form.levelOther)
    const title = form.title.trim()
    const description = form.description.trim()

    setLoading(true)
    const uploadedKeys = []

    try {
      setStage('video')
      const uploadedVideo = await uploadMedia(videoAsset.uri, 'klaso/lessons', videoAsset.fileName)
      uploadedKeys.push(uploadedVideo.key)

      let uploadedThumbnail = null
      if (thumbnailUri) {
        setStage('thumbnail')
        uploadedThumbnail = await uploadMedia(thumbnailUri, 'klaso/lessons')
        if (uploadedThumbnail?.key) uploadedKeys.push(uploadedThumbnail.key)
      }

      setStage('publish')
      const batch = writeBatch(db)
      const courseRef = doc(collection(db, 'courses'))
      const lessonRef = doc(collection(db, 'lessons'))

      batch.set(courseRef, {
        title,
        headline: description,
        subject,
        ...(level ? { level } : {}),
        ...(duration ? { duration } : {}),
        price,
        thumbnailUrl: uploadedThumbnail?.url || '',
        thumbnailKey: uploadedThumbnail?.key || '',
        videoUrl: uploadedVideo.url,
        videoKey: uploadedVideo.key,
        tutor: {
          name: user.displayName || '',
          ...(user.photoURL ? { avatar: user.photoURL } : {}),
        },
        status: 'published',
        createdBy: user.uid,
        lessonId: lessonRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      batch.set(lessonRef, {
        title,
        description,
        hashtags,
        subject,
        level,
        duration,
        price,
        thumbnailUrl: uploadedThumbnail?.url || '',
        thumbnailKey: uploadedThumbnail?.key || '',
        videoUrl: uploadedVideo.url,
        videoKey: uploadedVideo.key,
        courseId: courseRef.id,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })

      await batch.commit()

      allowLeave.current = true
      setPublished(true)
      leaveTimer.current = setTimeout(() => router.back(), 1100)
    } catch (uploadError) {
      console.log('Upload lesson error:', uploadError)
      setSubmitError(friendlyError(uploadError))
      await removeUploaded(uploadedKeys)
    } finally {
      setLoading(false)
      setStage(null)
    }
  }

  /* ------------------------------ UI ------------------------------- */

  const header = (
    <View style={[styles.headerRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={[styles.iconButton, { backgroundColor: colors.borderSubtle }]}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]}>New lesson</Text>
      <View style={styles.headerSpacer} />
    </View>
  )

  if (access !== 'allowed') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {header}
        <View style={styles.gate}>
          {access === 'checking' ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <View style={[styles.gateIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons
                  name={access === 'pending' ? 'time-outline' : 'lock-closed-outline'}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.gateTitle, { color: colors.text }]}>
                {access === 'pending' ? 'Application under review' : 'Tutor access required'}
              </Text>
              <Text style={[styles.gateText, { color: colors.textMuted }]}>
                {access === 'pending'
                  ? 'Your tutor profile is being reviewed. You can publish lessons as soon as it is approved.'
                  : 'Only approved tutors can publish lessons and course videos.'}
              </Text>
              {access === 'denied' && (
                <Pressable
                  accessibilityRole="button"
                  style={[styles.gateButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/become-tutor')}
                >
                  <Text style={styles.gateButtonText}>Apply as a tutor</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const steps = [
    { id: 'video', label: 'Uploading video' },
    ...(thumbnailUri ? [{ id: 'thumbnail', label: 'Uploading cover image' }] : []),
    { id: 'publish', label: 'Publishing lesson' },
  ]

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {header}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {/* Media */}
          <Section title="Video" colors={colors}>
            {videoAsset ? (
              <View style={[styles.mediaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.mediaIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="videocam" size={20} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[styles.mediaName, { color: colors.text }]}>
                    {videoAsset.fileName || 'Selected video'}
                  </Text>
                  <Text style={[styles.mediaMeta, { color: colors.textMuted }]}>
                    {[duration, formatFileSize(videoAsset.fileSize)].filter(Boolean).join('  ·  ') || 'Ready to upload'}
                  </Text>
                </View>
                <Pressable onPress={pickVideo} disabled={loading} hitSlop={8}>
                  <Text style={[styles.inlineAction, { color: colors.primary }]}>Replace</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Remove video"
                  onPress={removeVideo}
                  disabled={loading}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={pickVideo}
                disabled={loading}
                style={[
                  styles.dropZone,
                  { borderColor: showError('video') ? colors.danger : colors.border, backgroundColor: colors.card },
                ]}
              >
                <Ionicons name="videocam-outline" size={26} color={colors.primary} />
                <Text style={[styles.dropTitle, { color: colors.text }]}>Select lesson video</Text>
                <Text style={[styles.mediaMeta, { color: colors.textMuted }]}>MP4, MOV or WebM from your library</Text>
              </Pressable>
            )}
            {!!showError('video') && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.video}</Text>}
          </Section>

          <Section title="Cover image" hint="Optional. A 16:9 image works best." colors={colors}>
            {thumbnailUri ? (
              <View>
                <Image source={{ uri: thumbnailUri }} style={[styles.thumbnail, { borderColor: colors.border }]} />
                <View style={styles.thumbActions}>
                  <Pressable onPress={pickThumbnail} disabled={loading} hitSlop={8}>
                    <Text style={[styles.inlineAction, { color: colors.primary }]}>Replace</Text>
                  </Pressable>
                  <Pressable onPress={() => setThumbnailUri('')} disabled={loading} hitSlop={8}>
                    <Text style={[styles.inlineAction, { color: colors.textMuted }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={pickThumbnail}
                disabled={loading}
                style={[styles.thumbEmpty, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Ionicons name="image-outline" size={24} color={colors.primary} />
                <Text style={[styles.dropTitle, { color: colors.text }]}>Add cover image</Text>
              </Pressable>
            )}
          </Section>

          {/* Details */}
          <Section title="Details" colors={colors}>
            <Field
              label="Title"
              value={form.title}
              onChangeText={(v) => updateField('title', v)}
              onBlur={() => touch('title')}
              placeholder="Differential equations: first-order methods"
              autoCapitalize="sentences"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => descriptionRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
              error={showError('title')}
            />

            <Field
              ref={descriptionRef}
              label="Description"
              value={form.description}
              onChangeText={(v) => updateField('description', v)}
              onBlur={() => touch('description')}
              placeholder="What the lesson covers, who it is for, and what students will be able to do afterwards."
              multiline
              maxLength={1000}
              autoCapitalize="sentences"
              editable={!loading}
              error={showError('description')}
              counter={`${form.description.length}/1000`}
              inputStyle={styles.textArea}
            />

            <SelectField
              label="Subject"
              placeholder="Select a subject"
              sheetTitle="Subject"
              options={SUBJECTS}
              value={form.subject}
              onSelect={(v) => updateField('subject', v)}
              onTouched={() => touch('subject')}
              error={showError('subject')}
              otherLabel="Your subject"
              otherPlaceholder="e.g. Further Mathematics"
              otherValue={form.subjectOther}
              onChangeOther={(v) => updateField('subjectOther', v)}
              onOtherBlur={() => touch('subjectOther')}
              otherError={showError('subjectOther')}
              disabled={loading}
            />

            <SelectField
              label="Target level (optional)"
              placeholder="Select a level"
              sheetTitle="Target level"
              options={LEVELS}
              value={form.level}
              onSelect={(v) => updateField('level', v)}
              onTouched={() => touch('level')}
              otherLabel="Your level"
              otherPlaceholder="e.g. SAT, A-Levels"
              otherValue={form.levelOther}
              onChangeOther={(v) => updateField('levelOther', v)}
              onOtherBlur={() => touch('levelOther')}
              otherError={showError('levelOther')}
              disabled={loading}
            />

            <View style={styles.fieldStack}>
              <Field
                label="Hashtags (optional)"
                value={form.hashtags}
                onChangeText={(v) => updateField('hashtags', v)}
                placeholder="calculus, waec, jamb"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {hashtags.length > 0 && (
                <View style={styles.tagRow}>
                  {hashtags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Section>

          {/* Pricing */}
          <Section title="Pricing" colors={colors}>
            <Field
              label="Price"
              value={form.price}
              onChangeText={(v) => updateField('price', v.replace(/[^0-9]/g, ''))}
              onBlur={() => touch('price')}
              placeholder="3500"
              keyboardType="number-pad"
              maxLength={7}
              prefix="₦"
              editable={!loading}
              error={showError('price')}
              hint={
                form.price !== '' && Number(form.price) === 0
                  ? 'This lesson will be free for students.'
                  : 'Enter 0 to make this lesson free.'
              }
            />
          </Section>

          {!!submitError && (
            <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.bannerText, { color: colors.danger }]}>{submitError}</Text>
            </View>
          )}

          {published && (
            <View style={[styles.banner, { backgroundColor: `${SUCCESS}1A` }]}>
              <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
              <Text style={[styles.bannerText, { color: SUCCESS }]}>Lesson published. It is now live.</Text>
            </View>
          )}

          {loading && (
            <View style={[styles.progress, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {steps.map((step) => {
                const currentIndex = steps.findIndex((s) => s.id === stage)
                const index = steps.findIndex((s) => s.id === step.id)
                const done = index < currentIndex
                const active = index === currentIndex
                return (
                  <View key={step.id} style={styles.progressRow}>
                    {done ? (
                      <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
                    ) : active ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.progressText,
                        { color: active || done ? colors.text : colors.textMuted },
                        active && styles.progressTextActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                )
              })}
              <Text style={[styles.mediaMeta, { color: colors.textMuted }]}>
                Keep the app open until this finishes. Large videos can take a few minutes.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading || published, busy: loading }}
            onPress={handleSubmit}
            disabled={loading || published}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              (loading || published) && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitText}>Publish lesson</Text>
            )}
          </Pressable>
          <Text style={[styles.footerNote, { color: colors.textMuted }]}>
            Published lessons go live in the catalog immediately.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Section({ title, hint, colors, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {!!hint && <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

const Field = forwardRef(function Field(
  { label, error, hint, prefix, counter, onBlur, inputStyle, multiline, editable = true, ...inputProps },
  ref
) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const hasError = !!error

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.inputBg,
            borderColor: hasError ? colors.danger : focused ? colors.primary : colors.border,
          },
          multiline && styles.inputWrapMultiline,
          !editable && styles.disabled,
        ]}
      >
        {!!prefix && <Text style={[styles.prefix, { color: colors.textSecondary }]}>{prefix}</Text>}
        <TextInput
          ref={ref}
          {...inputProps}
          multiline={multiline}
          editable={editable}
          accessibilityLabel={label}
          style={[styles.input, { color: colors.text }, multiline && styles.inputMultiline, inputStyle]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
      </View>
      {(hasError || !!hint || !!counter) && (
        <View style={styles.helperRow}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.helperText, { color: hasError ? colors.danger : colors.textMuted }]}
          >
            {hasError ? error : hint || ''}
          </Text>
          {!!counter && <Text style={[styles.helperText, { color: colors.textMuted }]}>{counter}</Text>}
        </View>
      )}
    </View>
  )
})

/** Dropdown (bottom sheet) with an automatic "Other" option that reveals a text input. */
function SelectField({
  label,
  placeholder,
  sheetTitle,
  options,
  value,
  onSelect,
  onTouched,
  error,
  otherLabel,
  otherPlaceholder,
  otherValue,
  onChangeOther,
  onOtherBlur,
  otherError,
  disabled,
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const allOptions = useMemo(() => [...options, OTHER], [options])
  const hasError = !!error

  function close() {
    setOpen(false)
    onTouched?.()
  }

  return (
    <View style={styles.fieldStack}>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${value || placeholder}`}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.inputBg,
              borderColor: hasError ? colors.danger : open ? colors.primary : colors.border,
            },
            disabled && styles.disabled,
          ]}
        >
          <Text numberOfLines={1} style={[styles.selectValue, { color: value ? colors.text : colors.textMuted }]}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
        {hasError && <Text style={[styles.helperText, { color: colors.danger }]}>{error}</Text>}
      </View>

      {value === OTHER && (
        <Field
          label={otherLabel}
          value={otherValue}
          onChangeText={onChangeOther}
          onBlur={onOtherBlur}
          placeholder={otherPlaceholder}
          autoCapitalize="sentences"
          autoFocus
          maxLength={60}
          error={otherError}
        />
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
          <View
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 12) }]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{sheetTitle || label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <FlatList
              data={allOptions}
              keyExtractor={(item) => item}
              bounces={false}
              style={styles.sheetList}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />
              )}
              renderItem={({ item }) => {
                const selected = item === value
                return (
                  <Pressable
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(item)
                      close()
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && { backgroundColor: colors.primaryLight },
                      pressed && !selected && { backgroundColor: colors.borderSubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: selected ? colors.primary : colors.text },
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item === OTHER ? 'Other (type your own)' : item}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },

  // Header
  headerRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 38 },

  // Access gate
  gate: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  gateIcon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  gateTitle: { fontSize: 18, fontWeight: '700' },
  gateText: { fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  gateButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  gateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  container: { padding: 20, paddingBottom: 32 },

  // Sections
  section: { marginBottom: 28 },
  sectionHead: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionHint: { fontSize: 13, marginTop: 2 },
  sectionBody: { gap: 16 },

  // Media
  dropZone: {
    alignItems: 'center',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 6,
    paddingVertical: 28,
  },
  dropTitle: { fontSize: 15, fontWeight: '600' },
  mediaRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  mediaIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  mediaName: { fontSize: 14, fontWeight: '600' },
  mediaMeta: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  inlineAction: { fontSize: 14, fontWeight: '600' },
  thumbnail: { aspectRatio: 16 / 9, borderRadius: 12, borderWidth: 1, width: '100%' },
  thumbActions: { flexDirection: 'row', gap: 20, marginTop: 10 },
  thumbEmpty: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },

  // Fields
  fieldStack: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputWrapMultiline: { alignItems: 'flex-start' },
  prefix: { fontSize: 15, fontWeight: '600', marginRight: 6 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  inputMultiline: { paddingTop: 13, textAlignVertical: 'top' },
  textArea: { height: 120 },
  selectValue: { flex: 1, fontSize: 15, paddingVertical: 12 },
  helperRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  helperText: { flexShrink: 1, fontSize: 12, lineHeight: 16 },
  errorText: { fontSize: 12, lineHeight: 16 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '600' },

  // Feedback
  banner: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    padding: 12,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  progress: { borderRadius: 12, borderWidth: 1, gap: 12, padding: 14 },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  progressText: { fontSize: 14 },
  progressTextActive: { fontWeight: '600' },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerNote: { fontSize: 12, marginTop: 8, textAlign: 'center' },

  // Bottom sheet
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', borderRadius: 2, height: 4, marginBottom: 8, width: 36 },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetList: { flexGrow: 0 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  optionText: { flex: 1, fontSize: 15, paddingRight: 12 },
  optionTextSelected: { fontWeight: '700' },
})