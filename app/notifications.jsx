import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'

function formatTime(value) {
  if (!value) return 'Just now'
  const date = value.toDate ? value.toDate() : new Date(value)
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeMessages = () => {}
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeMessages()

      if (!user) {
        setNotifications([])
        setLoading(false)
        return
      }

      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      unsubscribeMessages = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          setNotifications(items)
          setLoading(false)
        },
        (error) => {
          console.error('Unable to load notifications:', error)
          setNotifications([])
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribeMessages()
      unsubscribeAuth()
    }
  }, [])

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading alerts…</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerState}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? '#14331C' : '#ECFDF5',
                borderColor: isDark ? '#1E462E' : '#BBF7D0',
              },
            ]}
          >
            <Ionicons name="notifications-off-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            New course updates, tutor replies, and payment alerts will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={
                    item.type === 'payment'
                      ? 'cash-outline'
                      : item.type === 'message'
                      ? 'chatbubble-ellipses-outline'
                      : item.type === 'course'
                      ? 'school-outline'
                      : 'information-circle-outline'
                  }
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.textWrap}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title || 'New update'}</Text>
                <Text style={[styles.message, { color: colors.textMuted }]}>
                  {item.message || 'You have a new activity update.'}
                </Text>
              </View>

              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  placeholder: {
    width: 38,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 12,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 11,
    marginLeft: 8,
  },
})
