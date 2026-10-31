import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'

export default function CheckoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { colors, isDark } = useTheme()

  const courseId = typeof params.id === 'string' ? params.id : ''
  const title = typeof params.title === 'string' ? params.title : ''
  const tutor = typeof params.tutor === 'string' ? params.tutor : ''
  const subject = typeof params.subject === 'string' ? params.subject : ''
  const price = typeof params.price === 'string' ? Number(params.price) : NaN
  const courseIsValid = Boolean(courseId && title && Number.isFinite(price) && price >= 0)

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {courseIsValid ? (
          <>
            <View style={[styles.course, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="book-outline" size={24} color={colors.primary} />
              {subject ? <Text style={[styles.subject, { color: colors.primary }]}>{subject}</Text> : null}
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {tutor ? <Text style={[styles.tutor, { color: colors.textMuted }]}>{tutor}</Text> : null}
              <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Course price</Text>
                <Text style={[styles.price, { color: colors.text }]}>₦{price.toLocaleString()}</Text>
              </View>
            </View>
            <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={21} color={colors.textMuted} />
              <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                Payments are not configured. You will not be charged or enrolled from this screen.
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.course, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />
            <Text style={[styles.title, { color: colors.text }]}>Course details unavailable</Text>
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              Return to the course page and try again.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.price, { color: colors.text }]}>
            {courseIsValid ? `₦${price.toLocaleString()}` : 'Unavailable'}
          </Text>
        </View>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          onPress={() => Alert.alert('Payments Unavailable', 'No payment or enrollment has been created.')}
          style={[styles.payButton, { backgroundColor: colors.textMuted }]}
        >
          <Text style={styles.payButtonText}>Payments unavailable</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', height: 56, justifyContent: 'space-between', paddingHorizontal: 16 },
  iconButton: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  content: { flexGrow: 1, gap: 14, padding: 16 },
  course: { alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, gap: 10, padding: 18 },
  subject: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  tutor: { fontSize: 13 },
  priceRow: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 12, width: '100%' },
  priceLabel: { fontSize: 13 },
  price: { fontSize: 17, fontWeight: '800' },
  notice: { alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 14 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  bottomBar: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  payButton: { alignItems: 'center', borderRadius: 10, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  payButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
})
