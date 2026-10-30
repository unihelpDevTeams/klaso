import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { collection, getDocs, query, where } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import {
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
import { db } from '../../firebase/config'
import Header from '../components/header'

const CATEGORIES = ['All', 'Mathematics', 'Science', 'Languages', 'Computer Science', 'Business']

const DEFAULT_TUTORS = [
  {
    id: 'tutor-1',
    name: 'Dr. Ngozi Eze',
    subject: 'Science',
    specialty: 'Biology & Life Sciences (WAEC / JAMB)',
    rating: 4.9,
    reviewsCount: 142,
    hourlyRate: 3500,
    experience: '8 yrs exp • 450+ students',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    bio: 'Senior lecturer and academic strategist passionate about making complex cellular biology and biochemistry intuitive for high school and university students.',
    education: 'Ph.D. in Cellular Biology, University of Ibadan',
    slots: ['Today, 4:00 PM', 'Tomorrow, 10:00 AM', 'Tomorrow, 2:00 PM'],
    tags: ['Cell Biology', 'Genetics', 'WAEC Prep'],
  },
  {
    id: 'tutor-2',
    name: 'Engr. Tunde Adeleke',
    subject: 'Mathematics',
    specialty: 'Advanced Mathematics & Calculus',
    rating: 4.95,
    reviewsCount: 198,
    hourlyRate: 4000,
    experience: '6 yrs exp • 620+ students',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Mechanical engineering graduate with a passion for mathematics. Specializes in transforming struggling students into confident problem solvers.',
    education: 'B.Eng. Mechanical Engineering, FUTA',
    slots: ['Today, 6:00 PM', 'Saturday, 11:00 AM', 'Saturday, 3:00 PM'],
    tags: ['Calculus', 'Algebra', 'JAMB Math'],
  },
  {
    id: 'tutor-3',
    name: 'Mrs. Funmi Bello',
    subject: 'Languages',
    specialty: 'English Grammar, IELTS & Essay Writing',
    rating: 4.88,
    reviewsCount: 110,
    hourlyRate: 3000,
    experience: '10 yrs exp • 380+ students',
    avatar: 'https://images.unsplash.com/photo-1580894732488-8289bf6554c0?auto=format&fit=crop&w=400&q=80',
    bio: 'Certified IELTS instructor and literary editor. Helping learners build persuasive writing, fluent speaking, and high exam band scores.',
    education: 'M.A. English Literature, UNILAG',
    slots: ['Tomorrow, 1:00 PM', 'Friday, 5:00 PM', 'Saturday, 9:00 AM'],
    tags: ['IELTS', 'Essay Craft', 'Grammar'],
  },
  {
    id: 'tutor-4',
    name: 'Chukwuma Obi',
    subject: 'Computer Science',
    specialty: 'Python, Web Development & Algorithms',
    rating: 4.92,
    reviewsCount: 86,
    hourlyRate: 4500,
    experience: '5 yrs exp • 290+ students',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    bio: 'Full-stack software engineer and tech mentor. Learn how to write real code, build apps, and prepare for tech interviews.',
    education: 'B.Sc. Computer Science, Covenant University',
    slots: ['Today, 7:00 PM', 'Tomorrow, 6:00 PM', 'Sunday, 2:00 PM'],
    tags: ['Python', 'JavaScript', 'React'],
  },
  {
    id: 'tutor-5',
    name: 'Amina Yusuf',
    subject: 'Business',
    specialty: 'Economics, Accounting & Financial Literacy',
    rating: 4.85,
    reviewsCount: 74,
    hourlyRate: 3200,
    experience: '7 yrs exp • 210+ students',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
    bio: 'Chartered accountant helping students master financial statements, microeconomics principles, and corporate finance foundations.',
    education: 'B.Sc. Accounting, ABU Zaria • ACA Certified',
    slots: ['Tomorrow, 3:00 PM', 'Friday, 11:00 AM', 'Saturday, 4:00 PM'],
    tags: ['Microeconomics', 'Accounting', 'Business Finance'],
  },
]

export default function TutorsScreen() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [tutors, setTutors] = useState(DEFAULT_TUTORS)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Booking Modal State
  const [bookingTutor, setBookingTutor] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  // Message Modal State
  const [messagingTutor, setMessagingTutor] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [messageSent, setMessageSent] = useState(false)

  // Profile Details Modal State
  const [activeProfile, setActiveProfile] = useState(null)

  const fetchTutors = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'), where('approved', '==', true))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const firestoreTutors = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            name: data.displayName || data.name || 'Verified Tutor',
            subject: data.subject || 'General Studies',
            specialty: data.specialty || data.bio || 'Experienced Educator',
            rating: data.rating || 4.9,
            reviewsCount: data.reviewsCount || 12,
            hourlyRate: data.hourlyRate || 3000,
            experience: data.experience || 'Verified Tutor',
            avatar: data.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            bio: data.bio || 'Dedicated educator committed to your learning success.',
            education: data.education || 'Accredited Degree',
            slots: ['Tomorrow, 10:00 AM', 'Tomorrow, 2:00 PM', 'Saturday, 11:00 AM'],
            tags: data.tags || [data.subject || 'General'],
          }
        })
        // Merge or replace
        setTutors([...firestoreTutors, ...DEFAULT_TUTORS.filter((dt) => !firestoreTutors.some((ft) => ft.id === dt.id))])
      }
    } catch {
      // Keep DEFAULT_TUTORS if offline/error
    }
  }

  useEffect(() => {
    fetchTutors()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchTutors()
    setRefreshing(false)
  }

  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const matchesCategory =
        selectedCategory === 'All' || tutor.subject.toLowerCase() === selectedCategory.toLowerCase()
      const queryLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !queryLower ||
        tutor.name.toLowerCase().includes(queryLower) ||
        tutor.subject.toLowerCase().includes(queryLower) ||
        tutor.specialty.toLowerCase().includes(queryLower) ||
        tutor.tags?.some((tag) => tag.toLowerCase().includes(queryLower))

      return matchesCategory && matchesSearch
    })
  }, [tutors, selectedCategory, searchQuery])

  const handleOpenBooking = (tutor) => {
    setBookingTutor(tutor)
    setSelectedSlot(tutor.slots?.[0] || 'Tomorrow, 10:00 AM')
    setBookingConfirmed(false)
  }

  const handleConfirmBooking = () => {
    setBookingConfirmed(true)
    setTimeout(() => {
      setBookingTutor(null)
      setBookingConfirmed(false)
    }, 1800)
  }

  const handleOpenMessage = (tutor) => {
    setMessagingTutor(tutor)
    setMessageText(`Hello ${tutor.name}, I am interested in booking a session with you for ${tutor.subject}.`)
    setMessageSent(false)
  }

  const handleSendMessage = () => {
    if (!messageText.trim()) return
    setMessageSent(true)
    setTimeout(() => {
      setMessagingTutor(null)
      setMessageSent(false)
      setMessageText('')
    }, 1600)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Header
        showBack={false}
        title="Tutor Marketplace"
        subtitle="1-on-1 personalized lessons with certified educators"
      />

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#718178" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by subject, skill, or tutor name..."
            placeholderTextColor="#8A9B8E"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#718178" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Tutor List */}
      <FlatList
        data={filteredTutors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803D']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color="#B4C2B8" />
            <Text style={styles.emptyTitle}>No tutors found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search terms or selecting a different category.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.tutorCard}>
            {/* Top row: Avatar & Info */}
            <Pressable
              style={styles.cardHeader}
              onPress={() => setActiveProfile(item)}
              accessibilityLabel={`View ${item.name} profile`}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.tutorName}>{item.name}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#15803D" style={styles.verifiedIcon} />
                </View>
                <Text style={styles.specialtyText} numberOfLines={1}>
                  {item.specialty}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F5A623" />
                  <Text style={styles.ratingNumber}>{item.rating}</Text>
                  <Text style={styles.reviewCount}>({item.reviewsCount} reviews)</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.experienceText}>{item.experience}</Text>
                </View>
              </View>
            </Pressable>

            {/* Tags row */}
            {item.tags && (
              <View style={styles.tagsRow}>
                {item.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bottom Row: Rate & Action Buttons */}
            <View style={styles.cardFooter}>
              <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>Rate</Text>
                <Text style={styles.rateAmount}>₦{item.hourlyRate.toLocaleString()}<Text style={styles.rateUnit}> / hr</Text></Text>
              </View>

              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={styles.messageButton}
                  onPress={() => handleOpenMessage(item)}
                  accessibilityLabel={`Message ${item.name}`}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#15803D" />
                  <Text style={styles.messageButtonText}>Message</Text>
                </Pressable>

                <Pressable
                  style={styles.bookButton}
                  onPress={() => handleOpenBooking(item)}
                  accessibilityLabel={`Book session with ${item.name}`}
                >
                  <Text style={styles.bookButtonText}>Book Session</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal: Book Session */}
      <Modal visible={!!bookingTutor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book 1-on-1 Session</Text>
              <Pressable onPress={() => setBookingTutor(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#14351D" />
              </Pressable>
            </View>

            {bookingConfirmed ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={60} color="#15803D" />
                <Text style={styles.successTitle}>Session Booked!</Text>
                <Text style={styles.successDesc}>
                  Your lesson with {bookingTutor?.name} on {selectedSlot} has been scheduled. Check your email for calendar invite.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {bookingTutor && (
                  <View style={styles.bookingTutorHeader}>
                    <Image source={{ uri: bookingTutor.avatar }} style={styles.modalAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTutorName}>{bookingTutor.name}</Text>
                      <Text style={styles.modalTutorSub}>{bookingTutor.subject}</Text>
                      <Text style={styles.modalTutorPrice}>₦{bookingTutor.hourlyRate.toLocaleString()} / hour</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.sectionLabel}>Select Time Slot</Text>
                <View style={styles.slotsGrid}>
                  {bookingTutor?.slots?.map((slot, index) => {
                    const isSelected = selectedSlot === slot
                    return (
                      <Pressable
                        key={index}
                        onPress={() => setSelectedSlot(slot)}
                        style={[styles.slotCard, isSelected && styles.slotCardActive]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={isSelected ? '#15803D' : '#718178'}
                        />
                        <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                <View style={styles.guaranteeBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#15803D" />
                  <Text style={styles.guaranteeText}>
                    100% Satisfaction Guarantee. Free reschedule or full refund up to 2 hours prior.
                  </Text>
                </View>

                <Pressable style={styles.confirmBookingBtn} onPress={handleConfirmBooking}>
                  <Text style={styles.confirmBookingText}>Confirm & Reserve Slot</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Message Tutor */}
      <Modal visible={!!messagingTutor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message Tutor</Text>
              <Pressable onPress={() => setMessagingTutor(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#14351D" />
              </Pressable>
            </View>

            {messageSent ? (
              <View style={styles.successBox}>
                <Ionicons name="paper-plane" size={56} color="#15803D" />
                <Text style={styles.successTitle}>Message Sent!</Text>
                <Text style={styles.successDesc}>
                  {messagingTutor?.name} usually responds in under 15 minutes.
                </Text>
              </View>
            ) : (
              <View>
                <View style={styles.bookingTutorHeader}>
                  <Image source={{ uri: messagingTutor?.avatar }} style={styles.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTutorName}>{messagingTutor?.name}</Text>
                    <Text style={styles.modalTutorSub}>{messagingTutor?.specialty}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Your Message</Text>
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  numberOfLines={4}
                  placeholder="Ask a question about availability, course preparation, or learning goals..."
                  placeholderTextColor="#8A9B8E"
                  style={styles.messageInput}
                />

                <Pressable
                  style={[styles.confirmBookingBtn, !messageText.trim() && { opacity: 0.6 }]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBookingText}>Send Message</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Full Tutor Profile Details */}
      <Modal visible={!!activeProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tutor Profile</Text>
              <Pressable onPress={() => setActiveProfile(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#14351D" />
              </Pressable>
            </View>

            {activeProfile && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileBioHeader}>
                  <Image source={{ uri: activeProfile.avatar }} style={styles.largeProfileAvatar} />
                  <Text style={styles.profileName}>{activeProfile.name}</Text>
                  <Text style={styles.profileSubject}>{activeProfile.subject} • {activeProfile.specialty}</Text>
                  <View style={styles.profileStatsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.statVal}>★ {activeProfile.rating}</Text>
                      <Text style={styles.statSub}>{activeProfile.reviewsCount} reviews</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                      <Text style={styles.statVal}>₦{activeProfile.hourlyRate.toLocaleString()}</Text>
                      <Text style={styles.statSub}>Hourly Rate</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                      <Text style={styles.statVal}>Verified</Text>
                      <Text style={styles.statSub}>Identity & Degree</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.detailSectionTitle}>About Me</Text>
                <Text style={styles.profileBioText}>{activeProfile.bio}</Text>

                <Text style={styles.detailSectionTitle}>Education & Credentials</Text>
                <View style={styles.educationCard}>
                  <Ionicons name="school-outline" size={20} color="#15803D" />
                  <Text style={styles.educationText}>{activeProfile.education}</Text>
                </View>

                <Text style={styles.detailSectionTitle}>Teaching Areas</Text>
                <View style={styles.tagsRow}>
                  {activeProfile.tags?.map((tag, idx) => (
                    <View key={idx} style={[styles.tagBadge, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={[styles.tagText, { color: '#15803D' }]}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: 24 }} />

                <View style={styles.modalActionButtons}>
                  <Pressable
                    style={styles.modalSecBtn}
                    onPress={() => {
                      const tutor = activeProfile
                      setActiveProfile(null)
                      handleOpenMessage(tutor)
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#15803D" />
                    <Text style={styles.modalSecBtnText}>Send Message</Text>
                  </Pressable>

                  <Pressable
                    style={styles.modalPriBtn}
                    onPress={() => {
                      const tutor = activeProfile
                      setActiveProfile(null)
                      handleOpenBooking(tutor)
                    }}
                  >
                    <Text style={styles.modalPriBtnText}>Book Session</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderColor: '#E2EBE4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#14351D',
    flex: 1,
    fontSize: 14,
  },
  categoriesWrapper: {
    borderBottomColor: '#F0F2F1',
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  categoriesContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  categoryChip: {
    backgroundColor: '#F5FAF5',
    borderColor: '#DFE7E1',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryChipActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  categoryChipText: {
    color: '#55655B',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    gap: 16,
    padding: 16,
    paddingBottom: 40,
  },
  tutorCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    padding: 16,
    shadowColor: '#14351D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    backgroundColor: '#E8F5E9',
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tutorName: {
    color: '#14351D',
    fontSize: 17,
    fontWeight: '800',
  },
  verifiedIcon: {
    marginTop: 1,
  },
  specialtyText: {
    color: '#55655B',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  ratingNumber: {
    color: '#14351D',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewCount: {
    color: '#718178',
    fontSize: 12,
  },
  dotSeparator: {
    color: '#A0B0A5',
    marginHorizontal: 2,
  },
  experienceText: {
    color: '#718178',
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tagBadge: {
    backgroundColor: '#F3F6F4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: '#4A5B50',
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#F0F4F1',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  rateBox: {
    justifyContent: 'center',
  },
  rateLabel: {
    color: '#8A9B8E',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  rateAmount: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
  },
  rateUnit: {
    color: '#718178',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  messageButton: {
    alignItems: 'center',
    borderColor: '#CDE4D4',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  messageButtonText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    color: '#718178',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#F0F2F1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  modalTitle: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
  },
  bookingTutorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginVertical: 16,
  },
  modalAvatar: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  modalTutorName: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '700',
  },
  modalTutorSub: {
    color: '#718178',
    fontSize: 13,
    marginTop: 2,
  },
  modalTutorPrice: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionLabel: {
    color: '#14351D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  slotsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  slotCard: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderColor: '#DFE7E1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  slotCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#15803D',
  },
  slotText: {
    color: '#55655B',
    fontSize: 14,
    fontWeight: '600',
  },
  slotTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  guaranteeBox: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    padding: 12,
  },
  guaranteeText: {
    color: '#166534',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  confirmBookingBtn: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmBookingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  successTitle: {
    color: '#14351D',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
  },
  successDesc: {
    color: '#718178',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  messageInput: {
    backgroundColor: '#F5FAF5',
    borderColor: '#DFE7E1',
    borderRadius: 14,
    borderWidth: 1,
    color: '#14351D',
    fontSize: 14,
    height: 110,
    marginBottom: 20,
    padding: 14,
    textAlignVertical: 'top',
  },
  profileBioHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  largeProfileAvatar: {
    borderRadius: 45,
    height: 90,
    marginBottom: 12,
    width: 90,
  },
  profileName: {
    color: '#14351D',
    fontSize: 20,
    fontWeight: '800',
  },
  profileSubject: {
    color: '#718178',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  profileStatsRow: {
    alignItems: 'center',
    backgroundColor: '#F7FAF7',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingVertical: 12,
    width: '100%',
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
  },
  statSub: {
    color: '#718178',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    backgroundColor: '#DFE7E1',
    height: 24,
    width: 1,
  },
  detailSectionTitle: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  profileBioText: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 22,
  },
  educationCard: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  educationText: {
    color: '#14351D',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  modalSecBtn: {
    alignItems: 'center',
    borderColor: '#CDE4D4',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
  },
  modalSecBtnText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
  modalPriBtn: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalPriBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
