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
import { useTheme } from '../context/ThemeContext'

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
  const { colors, isDark } = useTheme()

  const courseId = params.id ? String(params.id) : '1'
  const courseTitle = params.title || 'Calculus 1A: Differential & Integral'
  const tutorName = params.tutor || 'Engr. Tunde Adeleke'
  const subject = params.subject || 'Mathematics'
  const basePrice = params.price ? Number(params.price) : 3500

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

    // Simulate Paystack payment transaction
    setTimeout(async () => {
      const generatedRef = `KLASO-${Math.floor(100000 + Math.random() * 900000)}`
      setTxnRef(generatedRef)

      try {
        const user = auth.currentUser
        if (user) {
          const dateStr = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          // 1. Record enrollment in Firestore
          await addDoc(collection(db, 'enrollments'), {
            userId: user.uid,
            courseId,
            title: courseTitle,
            tutor: tutorName,
            subject,
            amount: totalAmount,
            reference: generatedRef,
            status: 'completed',
            progress: 0.1,
            completedLessons: 1,
            totalLessons: 12,
            nextLesson: 'Module 1: Getting Started',
            enrolledAt: serverTimestamp(),
            lastAccessed: 'Just now',
          })

          // 2. Record transaction in Firestore
          await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            reference: generatedRef,
            courseTitle,
            amount: totalAmount,
            paymentMethod:
              paymentMethod === 'card'
                ? 'Debit Card (Paystack)'
                : paymentMethod === 'transfer'
                ? 'Bank Transfer'
                : 'USSD Banking',
            date: dateStr,
            status: 'Completed',
            createdAt: serverTimestamp(),
          })
        }
      } catch (err) {
        console.log('Error writing checkout to Firestore:', err)
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: isDark ? '#1C2920' : '#F5FAF5' },
          ]}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isDark ? '#14331C' : '#E8F5E9' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isDark ? '#4ADE80' : '#15803D' },
                ]}
              >
                {subject}
              </Text>
            </View>
            <Text style={[styles.guaranteePill, { color: colors.textMuted }]}>
              Instant Access
            </Text>
          </View>
          <Text style={[styles.courseTitle, { color: colors.text }]}>{courseTitle}</Text>
          <Text style={[styles.tutorText, { color: colors.textMuted }]}>
            Instructor: {tutorName}
          </Text>
          <View style={styles.summaryPriceRow}>
            <Text style={[styles.summaryPriceLabel, { color: colors.textMuted }]}>
              Course Fee
            </Text>
            <Text style={[styles.summaryPriceValue, { color: colors.text }]}>
              ₦{basePrice.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Promo Code Input */}
        <View style={styles.promoContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Promo Code</Text>
          <View style={styles.promoInputRow}>
            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter code (e.g. KLASO20)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={[
                styles.promoInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              editable={!discountApplied}
            />
            <Pressable
              style={[
                styles.applyBtn,
                { backgroundColor: colors.primary },
                discountApplied && styles.applyBtnDisabled,
              ]}
              onPress={handleApplyPromo}
              disabled={discountApplied}
            >
              <Text style={styles.applyBtnText}>{discountApplied ? 'Applied' : 'Apply'}</Text>
            </Pressable>
          </View>
          {discountApplied && (
            <Text style={[styles.discountSuccessText, { color: colors.primary }]}>
              ✓ {discountPercent}% discount applied successfully (-₦{discountAmount.toLocaleString()})
            </Text>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Select Payment Method
          </Text>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = paymentMethod === method.id
            return (
              <Pressable
                key={method.id}
                onPress={() => setPaymentMethod(method.id)}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.methodIconBox,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#14331C'
                          : '#E8F5E9'
                        : isDark
                        ? '#1C2920'
                        : '#F3F4F6',
                    },
                  ]}
                >
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.methodTitle,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {method.title}
                  </Text>
                  <Text style={[styles.methodSubtitle, { color: colors.textMuted }]}>
                    {method.subtitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[styles.radioInner, { backgroundColor: colors.primary }]}
                    />
                  )}
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Price Breakdown */}
        <View
          style={[
            styles.breakdownCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.breakdownHeading, { color: colors.text }]}>
            Price Details
          </Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>
              Subtotal
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              ₦{basePrice.toLocaleString()}
            </Text>
          </View>

          {discountApplied && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.primary }]}>
                Discount ({discountPercent}%)
              </Text>
              <Text style={[styles.breakdownValue, { color: colors.primary }]}>
                -₦{discountAmount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>
              Value Added Tax (7.5%)
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              ₦{vatAmount.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.breakdownRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total to Pay</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              ₦{totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Security badges */}
        <View
          style={[
            styles.securityBox,
            {
              backgroundColor: isDark ? '#14331C' : '#F0FDF4',
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            Secured by Paystack. All financial transactions are protected with 256-bit bank encryption.
          </Text>
        </View>
      </ScrollView>

      {/* Pay CTA Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.barLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.barPrice, { color: colors.text }]}>
            ₦{totalAmount.toLocaleString()}
          </Text>
        </View>

        <Pressable
          style={[
            styles.payButton,
            { backgroundColor: colors.primary },
            isProcessing && { opacity: 0.7 },
          ]}
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
          <View
            style={[
              styles.successModalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.successIconCircle,
                { backgroundColor: isDark ? '#14331C' : '#DCFCE7' },
              ]}
            >
              <Ionicons name="checkmark" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Payment Successful!
            </Text>
            <Text style={[styles.successSub, { color: colors.textMuted }]}>
              You have been enrolled in {courseTitle}. A payment receipt has been recorded in your account.
            </Text>

            <View
              style={[
                styles.refCard,
                {
                  backgroundColor: isDark ? '#1C2920' : '#F8FAF8',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.refLabel, { color: colors.textMuted }]}>
                Transaction Reference
              </Text>
              <Text style={[styles.refCode, { color: colors.primary }]}>{txnRef}</Text>
            </View>

            <Pressable
              style={[styles.startLearningBtn, { backgroundColor: colors.primary }]}
              onPress={handleGoToLesson}
            >
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
  safeArea: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  guaranteePill: {
    fontSize: 11,
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  tutorText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  summaryPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F2F1',
    paddingTop: 10,
  },
  summaryPriceLabel: {
    fontSize: 13,
  },
  summaryPriceValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  promoContainer: {},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promoInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  discountSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },

  methodsContainer: {
    gap: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  breakdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  breakdownHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  securityText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  barPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 14,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successModalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  successSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  refCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  refLabel: {
    fontSize: 11,
  },
  refCode: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  startLearningBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startLearningText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
