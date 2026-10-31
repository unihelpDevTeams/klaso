import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../context/ThemeContext'

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
  const { colors, isDark } = useTheme()

  const handleBack = onBackPress || (() => router.back())

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.border,
        },
        containerStyle,
      ]}
    >
      {searchMode ? (
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="search-outline" size={19} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            autoFocus
          />
          {onSearchClose && (
            <Pressable onPress={onSearchClose} accessibilityLabel="Close search" hitSlop={8}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={styles.leftSection}>
            {showBack && (
              <Pressable
                onPress={handleBack}
                accessibilityLabel="Go back"
                style={[styles.actionButton, { backgroundColor: colors.inputBg }]}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
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
                <Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textMuted }, subtitleStyle]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.rightSection}>
            {showSearch && (
              <Pressable
                onPress={onSearchPress}
                accessibilityLabel="Search"
                style={[styles.actionButton, { backgroundColor: colors.inputBg }]}
                hitSlop={8}
              >
                <Ionicons name="search-outline" size={20} color={colors.text} />
              </Pressable>
            )}

            {showNotifications && (
              <Pressable
                onPress={onNotificationPress}
                accessibilityLabel="Open notifications"
                style={[styles.actionButton, { backgroundColor: colors.inputBg }]}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
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
    gap: 8,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  logo: {
    height: 42,
    width: 76,
  },
  titleWrap: {
    flexShrink: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  searchBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    height: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notificationDot: {
    backgroundColor: '#F59E0B',
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
