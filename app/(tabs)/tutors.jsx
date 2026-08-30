import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/header'

const tutors = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showBack={false} title="Tutors" subtitle="Meet your instructors" />
      <View style={styles.content}>
        <Text style={styles.title}>Top tutors</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dr. Ngozi Eze</Text>
          <Text style={styles.cardText}>Science and academic strategy mentor.</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default tutors

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5FAF5' },
  content: { flex: 1, padding: 20 },
  title: { color: '#14351D', fontSize: 24, fontWeight: '800', marginBottom: 18 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 },
  cardTitle: { color: '#14351D', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#718178', fontSize: 14, lineHeight: 20 },
})