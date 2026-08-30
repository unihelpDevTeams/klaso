import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import React from 'react'
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

export default function Onboarding() {
  return (
    <SafeAreaView style={styles.safeArea}>
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
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="arrow-forward" size={16} color="#57a0ff" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>LEARN WITH CONFIDENCE</Text>
          </View>
          <Text style={styles.title}>Your next breakthrough starts here.</Text>
          <Text style={styles.subtitle}>
            Access quality lessons and learn from approved tutors, all in one place.
          </Text>
          <Image
            source={require('../../assets/images/onboarding.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination} accessibilityLabel="Step 1 of 3">
            <View style={styles.activeDot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/SignUp')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
          >
            <Text style={styles.loginButtonText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
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
    height: 58,
    width: 142,
  },
  skipButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
  },
  skipText: {
    color: '#57a0ff',
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
    marginBottom: 14,
  },
  eyebrowLine: {
    backgroundColor: '#F5A623',
    height: 3,
    width: 24,
  },
  eyebrowText: {
    color: '#57a0ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F5A623',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    maxWidth: 360,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5D6D61',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 340,
    textAlign: 'center',
  },
  image: {
    height: 245,
    marginTop: 20,
    maxWidth: 390,
    width: '100%',
  },
  footer: {
    paddingBottom: 12,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 18,
  },
  activeDot: {
    backgroundColor: '#57a0ff',
    borderRadius: 4,
    height: 8,
    width: 24,
  },
  dot: {
    backgroundColor: '#B7D5BC',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#57a0ff',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  loginButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginTop: 4,
  },
  loginButtonText: {
    color: '#57a0ff',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
})
