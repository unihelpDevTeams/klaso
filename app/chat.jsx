import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'

function formatMessageTime(value) {
  if (!value) return ''
  const date = value.toDate ? value.toDate() : new Date(value)
  return new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function ChatScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams()
  const tutorId = String(params.tutorId || '')
  const tutorName = String(params.tutorName || 'Tutor')
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const canChat = Boolean(auth.currentUser && tutorId)

  useEffect(() => {
    if (!auth.currentUser || !tutorId) return undefined

    const unsubscribe = onSnapshot(collection(db, 'messages'), (snapshot) => {
      const currentUserId = auth.currentUser.uid
      const filtered = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((message) => {
          const sender = message.senderId
          const recipient = message.recipientId
          return (
            (sender === currentUserId && recipient === tutorId) ||
            (sender === tutorId && recipient === currentUserId)
          )
        })
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
          return timeA - timeB
        })

      setMessages(filtered)
    })

    return () => unsubscribe()
  }, [tutorId])

  const headerTitle = useMemo(() => {
    if (!tutorName || tutorName === 'undefined') return 'Tutor chat'
    return tutorName
  }, [tutorName])

  async function handleSendMessage() {
    const trimmed = messageText.trim()
    if (!trimmed || !auth.currentUser || !tutorId) return

    setSending(true)
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Student',
        recipientId: tutorId,
        recipientName: tutorName,
        text: trimmed,
        createdAt: serverTimestamp(),
      })
      setMessageText('')
    } catch (error) {
      console.error('Unable to send message:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
          <Text style={[styles.headerMeta, { color: colors.textMuted }]}>Messages</Text>
        </View>

        <View style={styles.placeholder} />
      </View>

      {!canChat ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chat unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Sign in and open a tutor profile to start a conversation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Say hello to {headerTitle} to begin the conversation.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.senderId === auth.currentUser?.uid
            return (
              <View
                style={[
                  styles.bubbleRow,
                  isMine ? styles.bubbleRight : styles.bubbleLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isMine ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: isMine ? '#FFFFFF' : colors.text }]}>
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.timeText,
                      { color: isMine ? 'rgba(255,255,255,0.8)' : colors.textMuted },
                    ]}
                  >
                    {formatMessageTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            )
          }}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Write a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Pressable
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
            style={[
              styles.sendButton,
              {
                backgroundColor: messageText.trim() ? colors.primary : colors.border,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerTextWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerMeta: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  placeholder: {
    width: 38,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  chatList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubbleLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 10,
    marginTop: 6,
  },
  inputBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
})
