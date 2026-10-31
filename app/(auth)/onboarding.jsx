import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'

const SLIDES = [
  {
    eyebrow: 'EXCELLENCE IN LEARNING',
    title: 'Your next academic breakthrough starts here.',
    subtitle: 'Access top WAEC, JAMB & university curriculum courses taught by Nigeria’s best educators.',
    image: require('../../assets/images/onboarding.png'),
  },
  {
    eyebrow: 'EXPERT 1-ON-1 TUTORING',
    title: 'Book verified tutors on your own schedule.',
    subtitle: 'Connect with certified degree holders for personalized guidance, exam prep, and homework support.',
    image: require('../../assets/images/onboarding.png'),
  },
]

export default function Onboarding() {
  const { colors, isDark } = useTheme()
  const [slideIndex, setSlideIndex] = useState(0)

  const currentSlide = SLIDES[slideIndex]

  const handleNext = () => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex(slideIndex + 1)
    } else {
      router.push('/(auth)/SignUp')
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            hitSlop={12}
            onPress={() => router.replace('/(tabs)')}
            style={styles.skipButton}
          >
            <Text style={[styles.skipText, { color: colors.primary }]}>Skip</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <View style={[styles.eyebrowLine, { backgroundColor: colors.primary }]} />
            <Text style={[styles.eyebrowText, { color: colors.primary }]}>
              {currentSlide.eyebrow}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{currentSlide.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {currentSlide.subtitle}
          </Text>
          <Image
            source={currentSlide.image}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  slideIndex === idx
                    ? [styles.activeDot, { backgroundColor: colors.primary }]
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleNext}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>
              {slideIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={[styles.loginButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.loginButtonText, { color: colors.text }]}>
              I already have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logo: {
    height: 52,
    width: 130,
  },
  skipButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  eyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  eyebrowLine: {
    height: 3,
    width: 20,
    borderRadius: 2,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    maxWidth: 360,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 320,
    textAlign: 'center',
  },
  image: {
    height: 230,
    marginTop: 20,
    maxWidth: 360,
    width: '100%',
  },
  footer: {
    paddingBottom: 28,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  activeDot: {
    borderRadius: 4,
    height: 8,
    width: 26,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loginButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
})
