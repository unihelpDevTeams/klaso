import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
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

const PAYMENT_METHODS = [
  {
    id: 'card',
    title: 'Debit / Credit Card',
    subtitle: 'Mastercard, Visa, Verve (Instant activation)',
    icon: 'card-outline',
  },
  {
    id: 'transfer',
    title: 'Bank Transfer',
    subtitle: 'Direct transfer to dedicated virtual account',
    icon: 'business-outline',
  },
  {
    id: 'ussd',
    title: 'USSD Banking',
    subtitle: 'Quick payment via your bank USSD code',
    icon: 'phone-portrait-outline',
  },
]

export default function CheckoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const courseId = params.id ? String(params.id) : '1'
  const courseTitle = params.title || 'Mastering Algebra Basics & Linear Equations'
  const tutorName = params.tutor || 'Engr. Tunde Adeleke'
  const subject = params.subject || 'Mathematics'
  const basePrice = params.price ? Number(params.price) : 12500

  const [paymentMethod, setPaymentMethod] = useState('card')
  const [promoCode, setPromoCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountApplied, setDiscountApplied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [txnRef, setTxnRef] = useState('')

  const discountAmount = Math.round(basePrice * (discountPercent / 100))
  const vatAmount = Math.round((basePrice - discountAmount) * 0.075)
  const totalAmount = basePrice - discountAmount + vatAmount

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase()
    if (code === 'KLASO20' || code === 'UNIHELP') {
      setDiscountPercent(20)
      setDiscountApplied(true)
      Alert.alert('Promo Applied!', '20% discount applied to your checkout!')
    } else if (code === 'WELCOME') {
      setDiscountPercent(15)
      setDiscountApplied(true)
      Alert.alert('Promo Applied!', '15% welcome discount applied!')
    } else {
      Alert.alert('Invalid Code', 'The promo code entered is not valid or has expired.')
    }
  }

  const handlePay = async () => {
    setIsProcessing(true)

    // Simulate payment transaction with delay
    setTimeout(async () => {
      const generatedRef = `KLASO-${Math.floor(100000 + Math.random() * 900000)}`
      setTxnRef(generatedRef)

      try {
        const user = auth.currentUser
        if (user) {
          // Record enrollment in Firestore
          await addDoc(collection(db, 'enrollments'), {
            userId: user.uid,
            courseId,
            courseTitle,
            tutor: tutorName,
            subject,
            amount: totalAmount,
            reference: generatedRef,
            status: 'completed',
            progress: 0,
            completedLessons: 0,
            enrolledAt: serverTimestamp(),
          })
        }
      } catch {
        // Continue even if offline
      }

      setIsProcessing(false)
      setShowSuccessModal(true)
    }, 1500)
  }

  const handleGoToLesson = () => {
    setShowSuccessModal(false)
    router.replace({
      pathname: '/screens/lesson',
      params: { lessonId: courseId, title: courseTitle },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#14351D" />
        </Pressable>
        <Text style={styles.headerTitle}>Order Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{subject}</Text>
            </View>
            <Text style={styles.guaranteePill}>Instant Access</Text>
          </View>
          <Text style={styles.courseTitle}>{courseTitle}</Text>
          <Text style={styles.tutorText}>Instructor: {tutorName}</Text>
          <View style={styles.summaryPriceRow}>
            <Text style={styles.summaryPriceLabel}>Course Fee</Text>
            <Text style={styles.summaryPriceValue}>₦{basePrice.toLocaleString()}</Text>
          </View>
        </View>

        {/* Promo Code Input */}
        <View style={styles.promoContainer}>
          <Text style={styles.sectionTitle}>Promo Code</Text>
          <View style={styles.promoInputRow}>
            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter code (e.g. KLASO20)"
              placeholderTextColor="#8A9B8E"
              autoCapitalize="characters"
              style={styles.promoInput}
              editable={!discountApplied}
            />
            <Pressable
              style={[styles.applyBtn, discountApplied && styles.applyBtnDisabled]}
              onPress={handleApplyPromo}
              disabled={discountApplied}
            >
              <Text style={styles.applyBtnText}>{discountApplied ? 'Applied' : 'Apply'}</Text>
            </Pressable>
          </View>
          {discountApplied && (
            <Text style={styles.discountSuccessText}>
              ✓ {discountPercent}% discount applied successfully (-₦{discountAmount.toLocaleString()})
            </Text>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsContainer}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = paymentMethod === method.id
            return (
              <Pressable
                key={method.id}
                onPress={() => setPaymentMethod(method.id)}
                style={[styles.methodCard, isSelected && styles.methodCardActive]}
              >
                <View style={[styles.methodIconBox, isSelected && styles.methodIconBoxActive]}>
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={isSelected ? '#15803D' : '#718178'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodTitle, isSelected && styles.methodTitleActive]}>
                    {method.title}
                  </Text>
                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Price Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownHeading}>Price Details</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownValue}>₦{basePrice.toLocaleString()}</Text>
          </View>

          {discountApplied && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: '#15803D' }]}>
                Discount ({discountPercent}%)
              </Text>
              <Text style={[styles.breakdownValue, { color: '#15803D' }]}>
                -₦{discountAmount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Value Added Tax (7.5%)</Text>
            <Text style={styles.breakdownValue}>₦{vatAmount.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total to Pay</Text>
            <Text style={styles.totalValue}>₦{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Security badges */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark" size={20} color="#15803D" />
          <Text style={styles.securityText}>
            Secured by Paystack. All financial transactions are protected with 256-bit bank encryption.
          </Text>
        </View>
      </ScrollView>

      {/* Pay CTA Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.barLabel}>Total</Text>
          <Text style={styles.barPrice}>₦{totalAmount.toLocaleString()}</Text>
        </View>

        <Pressable
          style={[styles.payButton, isProcessing && { opacity: 0.7 }]}
          onPress={handlePay}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay Now</Text>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={44} color="#15803D" />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSub}>
              You have been enrolled in {courseTitle}. A payment receipt was sent to your email.
            </Text>

            <View style={styles.refCard}>
              <Text style={styles.refLabel}>Transaction Reference</Text>
              <Text style={styles.refCode}>{txnRef}</Text>
            </View>

            <Pressable style={styles.startLearningBtn} onPress={handleGoToLesson}>
              <Text style={styles.startLearningText}>Start Learning Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
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
  header: {
    alignItems: 'center',
    borderBottomColor: '#F0F2F1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  summaryCard: {
    backgroundColor: '#F7FAF7',
    borderColor: '#E8EFEA',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  guaranteePill: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  courseTitle: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  tutorText: {
    color: '#718178',
    fontSize: 13,
    marginTop: 4,
  },
  summaryPriceRow: {
    alignItems: 'center',
    borderTopColor: '#E8EFEA',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
  },
  summaryPriceLabel: {
    color: '#718178',
    fontSize: 13,
  },
  summaryPriceValue: {
    color: '#14351D',
    fontSize: 16,
    fontWeight: '800',
  },
  promoContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promoInput: {
    backgroundColor: '#F5FAF5',
    borderColor: '#DFE7E1',
    borderRadius: 12,
    borderWidth: 1,
    color: '#14351D',
    flex: 1,
    fontSize: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  applyBtn: {
    alignItems: 'center',
    backgroundColor: '#14351D',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  applyBtnDisabled: {
    backgroundColor: '#8A9B8E',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  discountSuccessText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  methodsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  methodCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  methodCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#15803D',
  },
  methodIconBox: {
    alignItems: 'center',
    backgroundColor: '#F5FAF5',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  methodIconBoxActive: {
    backgroundColor: '#E8F5E9',
  },
  methodTitle: {
    color: '#14351D',
    fontSize: 14,
    fontWeight: '700',
  },
  methodTitleActive: {
    color: '#15803D',
  },
  methodSubtitle: {
    color: '#718178',
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    alignItems: 'center',
    borderColor: '#CDE4D4',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioCircleActive: {
    borderColor: '#15803D',
  },
  radioInner: {
    backgroundColor: '#15803D',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EFEA',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  breakdownHeading: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  breakdownLabel: {
    color: '#718178',
    fontSize: 13,
  },
  breakdownValue: {
    color: '#14351D',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: '#F0F2F1',
    height: 1,
    marginVertical: 10,
  },
  totalLabel: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    color: '#15803D',
    fontSize: 18,
    fontWeight: '900',
  },
  securityBox: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  securityText: {
    color: '#166534',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0F2F1',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: 'absolute',
    right: 0,
  },
  barLabel: {
    color: '#8A9B8E',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  barPrice: {
    color: '#14351D',
    fontSize: 20,
    fontWeight: '900',
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
  },
  successIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: 16,
    width: 72,
  },
  successTitle: {
    color: '#14351D',
    fontSize: 20,
    fontWeight: '800',
  },
  successSub: {
    color: '#718178',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  refCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderColor: '#DFE7E1',
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 18,
    padding: 12,
    width: '100%',
  },
  refLabel: {
    color: '#8A9B8E',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  refCode: {
    color: '#14351D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  startLearningBtn: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  startLearningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
})
