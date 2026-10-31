import Ionicons from '@expo/vector-icons/Ionicons'
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'
import Header from '../components/header'

export default function TutorsScreen() {
  const { colors, isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Booking Modal State
  const [bookingTutor, setBookingTutor] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)

  // Message Modal State
  const [messagingTutor, setMessagingTutor] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Profile Details Modal State
  const [activeProfile, setActiveProfile] = useState(null)

  // Listen to Firestore verified tutors live
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'tutor'),
      where('approved', '==', true)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            const name = data.displayName || data.name || ''
            return {
              id: docSnap.id,
              name,
              subject: data.subject || '',
              specialty: data.specialty || data.bio || '',
              rating: typeof data.rating === 'number' ? data.rating : null,
              reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : null,
              hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : null,
              experience: data.experience || '',
              avatar: data.photoURL || null,
              bio: data.bio || '',
              education: data.education || '',
              slots: Array.isArray(data.slots) ? data.slots : [],
              tags: Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === 'string') : data.subject ? [data.subject] : [],
            }
          }).filter((tutor) => tutor.name)
          setTutors(list)
        } else {
          // If empty, start with empty list to allow real seeder
          setTutors([])
        }
        setLoading(false)
      },
      (error) => {
        console.log('Error listening to tutors:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }

  const categories = useMemo(
    () => ['All', ...new Set(tutors.map((tutor) => tutor.subject).filter(Boolean))],
    [tutors]
  )

  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        tutor.subject.toLowerCase() === selectedCategory.toLowerCase()
      const queryLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !queryLower ||
        tutor.name.toLowerCase().includes(queryLower) ||
        tutor.subject.toLowerCase().includes(queryLower) ||
        tutor.specialty.toLowerCase().includes(queryLower) ||
        tutor.tags.some((tag) => tag.toLowerCase().includes(queryLower))

      return matchesCategory && matchesSearch
    })
  }, [tutors, selectedCategory, searchQuery])

  const handleOpenBooking = (tutor) => {
    setBookingTutor(tutor)
    setSelectedSlot(tutor.slots[0] || null)
    setBookingConfirmed(false)
  }

  const handleConfirmBooking = async () => {
    if (!bookingTutor || !selectedSlot) return
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in before requesting a tutoring session.')
      return
    }
    setSubmittingBooking(true)
    try {
      await addDoc(collection(db, 'bookings'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || null,
        userName: auth.currentUser.displayName || null,
        tutorId: bookingTutor.id,
        tutorName: bookingTutor.name,
        subject: bookingTutor.subject || null,
        hourlyRate: bookingTutor.hourlyRate,
        slot: selectedSlot,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setBookingConfirmed(true)
      setTimeout(() => {
        setBookingTutor(null)
        setSubmittingBooking(false)
      }, 1500)
    } catch (err) {
      console.log('Booking error:', err)
      Alert.alert('Booking Not Sent', 'The booking request could not be saved. Please try again.')
      setSubmittingBooking(false)
    }
  }

  const handleOpenMessaging = (tutor) => {
    setMessagingTutor(tutor)
    setMessageText('')
    setMessageSent(false)
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messagingTutor) return
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in before messaging a tutor.')
      return
    }
    setSendingMessage(true)
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || null,
        recipientId: messagingTutor.id,
        recipientName: messagingTutor.name,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      })
      setMessageSent(true)
      setTimeout(() => {
        setMessagingTutor(null)
        setSendingMessage(false)
      }, 1400)
    } catch (err) {
      console.log('Send message error:', err)
      Alert.alert('Message Not Sent', 'Your message could not be saved. Please try again.')
      setSendingMessage(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        showBack={false}
        title="Find a Tutor"
        subtitle="1-on-1 personalized academic sessions"
      />

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          placeholder="Search by name, subject, or specialty..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Subject Filter Chips */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          data={categories}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item
            return (
              <Pressable
                onPress={() => setSelectedCategory(item)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.card
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : isDark
                        ? colors.textSecondary
                        : '#4B5563',
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )
          }}
        />
      </View>

      {/* Tutors List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Finding verified educators...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTutors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tutorsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                ]}
              >
                <Ionicons name="school-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {tutors.length === 0
                  ? 'No Verified Tutors Registered Yet'
                  : 'No Matching Tutors Found'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {tutors.length === 0
                  ? 'New tutors can register through Sign Up or the admin panel.'
                  : `No tutors match "${searchQuery}" in category ${selectedCategory}.`}
              </Text>

            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.tutorCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setActiveProfile(item)}
            >
              {/* Card Header: Avatar, Name, Specialty, Rate */}
              <View style={styles.cardHeader}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.tutorName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                  {item.specialty ? (
                    <Text style={[styles.specialty, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.specialty}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    {item.rating !== null ? (
                      <View style={styles.starWrap}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={[styles.rating, { color: colors.text }]}>{item.rating}</Text>
                        {item.reviewsCount !== null ? (
                          <Text style={[styles.reviews, { color: colors.textMuted }]}>
                            ({item.reviewsCount})
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {item.experience ? (
                      <Text style={[styles.experience, { color: colors.textMuted }]}>
                        {item.experience}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Hourly Price Tag */}
                {item.hourlyRate !== null ? <View
                  style={[
                    styles.priceBadge,
                    { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.priceAmount,
                      { color: isDark ? '#4ADE80' : '#15803D' },
                    ]}
                  >
                    ₦{item.hourlyRate.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.priceUnit,
                      { color: isDark ? '#86EFAC' : '#166534' },
                    ]}
                  >
                    / hr
                  </Text>
                </View> : null}
              </View>

              {/* Bio summary */}
              {item.bio ? <Text
                style={[styles.bioSummary, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.bio}
              </Text> : null}

              {/* Subject & Skill Tags */}
              <View style={styles.tagsRow}>
                {item.tags?.slice(0, 3).map((tag, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isDark ? '#1C2920' : '#F3F4F6',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: isDark ? colors.textSecondary : '#4B5563' },
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons: Message & Book Session */}
              <View
                style={[
                  styles.cardActions,
                  { borderColor: isDark ? '#233228' : '#F3F4F6' },
                ]}
              >
                <Pressable
                  style={[
                    styles.actionBtnSecondary,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? colors.card : colors.surface,
                    },
                  ]}
                  onPress={() => handleOpenMessaging(item)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.primary} />
                  <Text style={[styles.actionBtnSecText, { color: colors.primary }]}>
                    Message
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenBooking(item)}
                >
                  <Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.actionBtnPriText}>Book 1-on-1</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* BOOKING MODAL */}
      <Modal visible={!!bookingTutor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {bookingConfirmed ? (
              <View style={styles.confirmState}>
                <View
                  style={[
                    styles.successCircle,
                    { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                  ]}
                >
                  <Ionicons name="checkmark-done" size={42} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Booking Request Sent
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Your booking request for {bookingTutor?.name} was saved for{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {selectedSlot}
                  </Text>
                  . The tutor will need to confirm the session details.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Book Tutoring Session
                    </Text>
                    <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                      with {bookingTutor?.name}
                    </Text>
                  </View>
                  <Pressable onPress={() => setBookingTutor(null)}>
                    <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* Tutor Card in Modal */}
                <View
                  style={[
                    styles.modalTutorPreview,
                    {
                      backgroundColor: isDark ? '#1C2920' : '#F8FAF8',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {bookingTutor?.avatar ? (
                    <Image source={{ uri: bookingTutor.avatar }} style={styles.miniAvatar} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniName, { color: colors.text }]}>
                      {bookingTutor?.name}
                    </Text>
                    <Text style={[styles.miniSubject, { color: colors.textMuted }]}>
                      {[bookingTutor?.subject, bookingTutor?.hourlyRate != null ? `₦${bookingTutor.hourlyRate.toLocaleString()}/hr` : null].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                </View>

                {/* Slot Selector */}
                <Text style={[styles.slotSelectHeading, { color: colors.text }]}>
                  Available Time Slots
                </Text>
                <View style={styles.slotsList}>
                  {bookingTutor?.slots.length ? bookingTutor.slots.map((slot, index) => {
                    const isPicked = selectedSlot === slot
                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.slotButton,
                          {
                            backgroundColor: isPicked
                              ? colors.primary
                              : isDark
                              ? '#1C2920'
                              : '#F9FAFB',
                            borderColor: isPicked ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Ionicons
                          name={isPicked ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={isPicked ? '#FFFFFF' : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.slotButtonText,
                            {
                              color: isPicked
                                ? '#FFFFFF'
                                : isDark
                                ? colors.text
                                : '#374151',
                              fontWeight: isPicked ? '700' : '500',
                            },
                          ]}
                        >
                          {slot}
                        </Text>
                      </Pressable>
                    )
                  }) : (
                    <Text style={[styles.modalSub, { color: colors.textMuted }]}>No availability has been provided.</Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.sheetActions}>
                  <Pressable
                    style={[
                      styles.cancelSheetBtn,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setBookingTutor(null)}
                  >
                    <Text style={[styles.cancelSheetBtnText, { color: colors.textMuted }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.confirmSheetBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleConfirmBooking}
                    disabled={submittingBooking || !selectedSlot}
                  >
                    {submittingBooking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmSheetBtnText}>
                        {bookingTutor?.hourlyRate != null ? `Request Session (₦${bookingTutor.hourlyRate.toLocaleString()})` : 'Request Session'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MESSAGING MODAL */}
      <Modal visible={!!messagingTutor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {messageSent ? (
              <View style={styles.confirmState}>
                <View
                  style={[
                    styles.successCircle,
                    { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
                  ]}
                >
                  <Ionicons name="paper-plane" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Message Sent
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Your message to {messagingTutor?.name} has been saved.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Message Tutor
                    </Text>
                    <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                      Ask questions before booking a class
                    </Text>
                  </View>
                  <Pressable onPress={() => setMessagingTutor(null)}>
                    <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                  </Pressable>
                </View>

                <TextInput
                  placeholder={`Hi ${
                    messagingTutor?.name?.split(' ')[0] || 'Tutor'
                  }, I'd like to ask about your preparation sessions...`}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.messageInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={messageText}
                  onChangeText={setMessageText}
                />

                <View style={styles.sheetActions}>
                  <Pressable
                    style={[
                      styles.cancelSheetBtn,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setMessagingTutor(null)}
                  >
                    <Text style={[styles.cancelSheetBtnText, { color: colors.textMuted }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.confirmSheetBtn,
                      {
                        backgroundColor: messageText.trim()
                          ? colors.primary
                          : isDark
                          ? '#233228'
                          : '#D1D5DB',
                      },
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmSheetBtnText}>Send Message</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* FULL TUTOR PROFILE MODAL */}
      <Modal visible={!!activeProfile} animationType="slide">
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.profileModalHeader,
              { borderBottomColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Pressable onPress={() => setActiveProfile(null)}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.profileModalTitle, { color: colors.text }]}>
              Educator Profile
            </Text>
            <Pressable onPress={() => setActiveProfile(null)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.profileModalBody}
            showsVerticalScrollIndicator={false}
          >
            {activeProfile && (
              <>
                <View style={styles.profileTopBlock}>
                  {activeProfile.avatar ? (
                    <Image source={{ uri: activeProfile.avatar }} style={styles.bigAvatar} />
                  ) : (
                    <View style={[styles.bigAvatar, styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '700' }}>
                        {activeProfile.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.bigName, { color: colors.text }]}>
                    {activeProfile.name}
                  </Text>
                  {activeProfile.specialty ? <Text style={[styles.bigSpecialty, { color: colors.primary }]}>{activeProfile.specialty}</Text> : null}
                  {activeProfile.subject ? <Text style={[styles.bigSubject, { color: colors.textMuted }]}>{activeProfile.subject}</Text> : null}

                  {/* Profile Stats Row */}
                  <View
                    style={[
                      styles.profileStatsRow,
                      {
                        backgroundColor: isDark ? colors.card : '#F7FAF7',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.statCol}>
                      <Text style={[styles.statVal, { color: colors.text }]}>
                        {activeProfile.rating != null ? `★ ${activeProfile.rating}` : '—'}
                      </Text>
                      <Text style={[styles.statSub, { color: colors.textMuted }]}>
                        {activeProfile.reviewsCount != null ? `${activeProfile.reviewsCount} Reviews` : 'Reviews'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.statCol}>
                      <Text style={[styles.statVal, { color: colors.text }]}>
                        {activeProfile.hourlyRate != null ? `₦${activeProfile.hourlyRate.toLocaleString()}` : '—'}
                      </Text>
                      <Text style={[styles.statSub, { color: colors.textMuted }]}>
                        Per Hour
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.statCol}>
                      <Text style={[styles.statVal, { color: colors.text }]}>
                        {activeProfile.experience ? activeProfile.experience.split('•')[0]?.trim() : '—'}
                      </Text>
                      <Text style={[styles.statSub, { color: colors.textMuted }]}>
                        Experience
                      </Text>
                    </View>
                  </View>
                </View>

                {/* About Section */}
                {activeProfile.bio ? <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>About the Tutor</Text>
                  <Text style={[styles.profileBioText, { color: colors.textSecondary }]}>{activeProfile.bio}</Text>
                </> : null}

                {/* Education Section */}
                {activeProfile.education ? <>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Qualifications & Degree</Text>
                <View
                  style={[
                    styles.educationCard,
                    {
                      backgroundColor: isDark ? colors.card : '#F5FAF5',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
                  <Text style={[styles.educationText, { color: colors.text }]}>
                    {activeProfile.education}
                  </Text>
                </View>
                </> : null}

                {/* Action Buttons */}
                <View style={styles.modalActionButtons}>
                  <Pressable
                    style={[
                      styles.modalSecBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: isDark ? colors.card : colors.surface,
                      },
                    ]}
                    onPress={() => {
                      const t = activeProfile
                      setActiveProfile(null)
                      handleOpenMessaging(t)
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                    <Text style={[styles.modalSecBtnText, { color: colors.primary }]}>
                      Message
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalPriBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      const t = activeProfile
                      setActiveProfile(null)
                      handleOpenBooking(t)
                    }}
                  >
                    <Text style={styles.modalPriBtnText}>Book 1-on-1</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  categoriesWrapper: {
    marginBottom: 10,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },

  tutorsList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  tutorCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F1A13',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: '800',
  },
  specialty: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  starWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviews: {
    fontSize: 11,
  },
  metaDot: {
    fontSize: 10,
  },
  experience: {
    fontSize: 11,
  },
  priceBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: '600',
  },

  bioSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnSecText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  actionBtnPriText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  seedBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },

  modalTutorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  miniAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  miniName: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniSubject: {
    fontSize: 12,
    marginTop: 2,
  },

  slotSelectHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  slotsList: {
    gap: 8,
    marginBottom: 20,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  slotButtonText: {
    fontSize: 13,
  },

  messageInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelSheetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSheetBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmSheetBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSheetBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  confirmState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  // Full Profile Modal
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  profileModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileModalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  profileTopBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bigAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  bigName: {
    fontSize: 20,
    fontWeight: '800',
  },
  bigSpecialty: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  bigSubject: {
    fontSize: 13,
    marginTop: 2,
  },

  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 16,
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  statSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  profileBioText: {
    fontSize: 14,
    lineHeight: 22,
  },
  educationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  educationText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 10,
  },
  modalSecBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSecBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalPriBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPriBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
