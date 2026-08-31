import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export default function Header({
  title,
  subtitle,
  showBack = false,
  showLogo = false,
  showSearch = false,
  showNotifications = false,
  searchMode = false,
  searchValue = '',
  onSearchChange,
  onSearchClose,
  searchPlaceholder = 'Search',
  onBackPress,
  onSearchPress,
  onNotificationPress,
  rightContent,
  containerStyle,
  titleStyle,
  subtitleStyle,
  inputRef,
}) {
  const router = useRouter()

  const handleBack = onBackPress || (() => router.back())

  return (
    <View style={[styles.header, containerStyle]}>
      {searchMode ? (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#718178" />
          <TextInput
            ref={inputRef}
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor="#8A9B8E"
            style={styles.searchInput}
            returnKeyType="search"
            autoFocus
          />
          {onSearchClose && (
            <Pressable onPress={onSearchClose} accessibilityLabel="Close search" hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={styles.leftSection}>
            {showBack && (
              <Pressable onPress={handleBack} accessibilityLabel="Go back" style={styles.actionButton} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color="#14351D" />
              </Pressable>
            )}

            {showLogo && (
              <View style={styles.brandRow}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            )}

            {title && (
              <View style={styles.titleWrap}>
                <Text style={[styles.title, titleStyle]}>{title}</Text>
                {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
              </View>
            )}
          </View>

          <View style={styles.rightSection}>
            {showSearch && (
              <Pressable onPress={onSearchPress} accessibilityLabel="Search" style={styles.actionButton} hitSlop={8}>
                <Ionicons name="search-outline" size={22} color="#14351D" />
              </Pressable>
            )}

            {showNotifications && (
              <Pressable onPress={onNotificationPress} accessibilityLabel="Open notifications" style={styles.actionButton} hitSlop={8}>
                <Ionicons name="notifications-outline" size={22} color="#14351D" />
                <View style={styles.notificationDot} />
              </Pressable>
            )}

            {rightContent}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: '#EDEFEF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  leftSection: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  rightSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  logo: {
    height: 46,
    width: 80,
  },
  brandText: {
    color: '#14351D',
    fontSize: 20,
    fontWeight: '800',
  },
  titleWrap: {
    flexShrink: 1,
  },
  title: {
    color: '#14351D',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#718178',
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  searchBox: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    color: '#14351D',
    flex: 1,
    fontSize: 15,
  },
  cancelText: {
    color: '#57a0ff',
    fontSize: 14,
    fontWeight: '700',
  },
  notificationDot: {
    backgroundColor: '#F5A623',
    borderColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 10,
  },
})