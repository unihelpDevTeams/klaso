import React from 'react'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import Header from '../components/header'

export default function Profile() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showBack={false} title="Profile" subtitle="Your learning account" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.cardText}>Manage your preferences, progress, and saved learning.</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  content: { flex: 1, padding: 20 },
  title: { color: '#14351D', fontSize: 24, fontWeight: '800', marginBottom: 18 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 },
  cardTitle: { color: '#14351D', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#718178', fontSize: 14, lineHeight: 20 },
})