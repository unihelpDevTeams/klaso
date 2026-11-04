import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
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
import Header from './components/header'
import { useTheme } from '../context/ThemeContext'
import { auth, db } from '../firebase/config'

function getTimestamp(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  return 0
}

function formatMessageTime(value) {
  if (!value) return ''
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getConversations(messages, currentUserId) {
  const conversations = new Map()

  messages.forEach((message) => {
    const isSent = message.senderId === currentUserId
    const participantId = isSent ? message.recipientId : message.senderId
    if (!participantId) return

    const current = conversations.get(participantId)
    if (!current || getTimestamp(message.createdAt) > getTimestamp(current.createdAt)) {
      conversations.set(participantId, {
        ...message,
        id: participantId,
        name: (isSent ? message.recipientName : message.senderName) || 'Klaso user',
      })
    }
  })

  return [...conversations.values()].sort(
    (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
  )
}

export default function MessagesScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(Boolean(auth.currentUser))
  const [error, setError] = useState('')

  useEffect(() => {
    const currentUserId = auth.currentUser?.uid
    if (!currentUserId) return undefined

    let sentMessages = []
    let receivedMessages = []
    const loadedQueries = new Set()
    const updateConversations = (queryName) => {
      loadedQueries.add(queryName)
      setConversations(getConversations([...sentMessages, ...receivedMessages], currentUserId))
      if (loadedQueries.size === 2) setLoading(false)
    }
    const handleQueryError = (queryName, queryError) => {
      console.error(`Unable to load ${queryName} messages:`, queryError)
      setError('Some messages could not be loaded. Please try again later.')
      loadedQueries.add(queryName)
      if (loadedQueries.size === 2) setLoading(false)
    }

    const unsubscribeSent = onSnapshot(
      query(collection(db, 'messages'), where('senderId', '==', currentUserId)),
      (snapshot) => {
        sentMessages = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        updateConversations('sent')
      },
      (queryError) => handleQueryError('sent', queryError)
    )
    const unsubscribeReceived = onSnapshot(
      query(collection(db, 'messages'), where('recipientId', '==', currentUserId)),
      (snapshot) => {
        receivedMessages = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        updateConversations('received')
      },
      (queryError) => handleQueryError('received', queryError)
    )

    return () => {
      unsubscribeSent()
      unsubscribeReceived()
    }
  }, [])

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header showBack title="Messages" subtitle="Your conversations" />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !auth.currentUser ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to view messages</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Start a chat from a tutor profile and your messages will appear here.
          </Text>
          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      ) : (
        <>
          {error ? <Text style={[styles.errorBanner, { color: colors.danger }]}>{error}</Text> : null}
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            renderItem={({ item }) => {
              const isMine = item.senderId === auth.currentUser?.uid
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat with ${item.name}`}
                  onPress={() => router.push({
                    pathname: '/chat',
                    params: { tutorId: item.id, tutorName: item.name },
                  })}
                  style={({ pressed }) => [
                    styles.conversation,
                    { backgroundColor: pressed ? colors.card : colors.background },
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="person-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeading}>
                      <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.time, { color: colors.textMuted }]}>
                        {formatMessageTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.preview, { color: colors.textMuted }]}>
                      {isMine ? 'You: ' : ''}{item.text}
                    </Text>
                  </View>
                </Pressable>
              )
            }}
          />
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loader: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
  },
  conversation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  conversationContent: {
    flex: 1,
    gap: 6,
  },
  conversationHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
  },
  preview: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
})
