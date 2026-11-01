import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { reload, sendEmailVerification, signOut } from 'firebase/auth'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'
import { auth } from '../../firebase/config'
import { useTheme } from '../../context/ThemeContext'

export default function VerifyEmailScreen() {
  const router = useRouter()
  const { email: emailParam, resendRequired } = useLocalSearchParams()
  const { colors, isDark } = useTheme()
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam || auth.currentUser?.email || ''
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [statusMessage, setStatusMessage] = useState(
    resendRequired === 'true' ? 'The verification email could not be sent. Resend it below.' : ''
  )
  const [isError, setIsError] = useState(resendRequired === 'true')

  useEffect(() => {
    if (!auth.currentUser) router.replace('/(auth)/login')
  }, [router])

  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const checkVerification = async () => {
    const user = auth.currentUser
    if (!user || checking) return

    setChecking(true)
    setStatusMessage('')
    setIsError(false)
    try {
      await reload(user)
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true)
        router.replace('/(tabs)')
        return
      }

      setIsError(true)
      setStatusMessage('Your email is not verified yet. Open the link we sent, then check again.')
    } catch (error) {
      console.error('Unable to check email verification:', error)
      setIsError(true)
      setStatusMessage('We could not check verification right now. Check your connection and try again.')
    } finally {
      setChecking(false)
    }
  }

  const resendVerification = async () => {
    const user = auth.currentUser
    if (!user || resending || resendCooldown > 0) return

    setResending(true)
    setStatusMessage('')
    setIsError(false)
    try {
      await sendEmailVerification(user)
      setResendCooldown(30)
      setStatusMessage('A new verification link has been sent.')
    } catch (error) {
      console.error('Unable to resend verification email:', error)
      setIsError(true)
      setStatusMessage('We could not send another email. Please try again shortly.')
    } finally {
      setResending(false)
    }
  }

  const useAnotherAccount = async () => {
    await signOut(auth)
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header
        title="Verify your email"
        subtitle="Verification is required to continue"
        containerStyle={{ backgroundColor: colors.surface }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="mail-unread-outline" size={38} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Check your inbox</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We sent a verification link to
          </Text>
          <Text style={[styles.email, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}>
            {email}
          </Text>

          <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Open the link in that email to verify your address. You will remain here until verification is complete. Check spam if it does not arrive.
            </Text>
          </View>

          {statusMessage ? (
            <Text style={[styles.statusMessage, { color: isError ? colors.danger : colors.primary }]}>
              {statusMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={checkVerification}
            disabled={checking}
            style={[styles.primaryButton, { backgroundColor: colors.primary }, checking && styles.disabledButton]}
          >
            {checking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />}
            <Text style={styles.primaryButtonText}>{checking ? 'Checking...' : 'I’ve verified my email'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={resendVerification}
            disabled={resending || resendCooldown > 0}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }, (resending || resendCooldown > 0) && styles.disabledButton]}
          >
            {resending ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={18} color={colors.primary} />}
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              {resending ? 'Sending...' : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend verification email'}
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={useAnotherAccount} style={styles.accountButton}>
            <Text style={[styles.accountButtonText, { color: colors.textMuted }]}>Use another account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  content: { alignItems: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  iconCircle: { alignItems: 'center', borderRadius: 30, height: 72, justifyContent: 'center', marginBottom: 22, width: 72 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  email: { borderRadius: 10, borderWidth: 1, fontSize: 14, fontWeight: '700', marginTop: 12, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10, textAlign: 'center' },
  notice: { alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 24, padding: 14, width: '100%' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  statusMessage: { fontSize: 13, lineHeight: 19, marginTop: 14, textAlign: 'center' },
  primaryButton: { alignItems: 'center', borderRadius: 11, flexDirection: 'row', gap: 9, height: 50, justifyContent: 'center', marginTop: 22, paddingHorizontal: 16, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 8, height: 48, justifyContent: 'center', marginTop: 10, paddingHorizontal: 16, width: '100%' },
  secondaryButtonText: { fontSize: 13, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  accountButton: { marginTop: 20, minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 },
  accountButtonText: { fontSize: 13, fontWeight: '600' },
})