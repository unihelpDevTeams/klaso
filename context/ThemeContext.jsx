import React, { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const THEME_KEY = '@klaso_theme_preference'

export const lightColors = {
  isDark: false,
  background: '#F8FAF9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  headerBg: '#FFFFFF',
  border: '#E5EAE7',
  borderSubtle: '#F0F4F2',
  text: '#14351D',
  textSecondary: '#47554E',
  textMuted: '#718178',
  primary: '#15803D',
  primaryDark: '#14351D',
  primaryLight: '#E8F5E9',
  primaryMint: '#F0FDF4',
  accent: '#57a0ff',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  inputBg: '#F5FAF5',
  inputBorder: '#DFE7E1',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#EDEFEF',
  statCardBg: '#F5FAF5',
}

export const darkColors = {
  isDark: true,
  background: '#0B110D',
  surface: '#131B16',
  card: '#16221B',
  headerBg: '#111713',
  border: '#233228',
  borderSubtle: '#1A271F',
  text: '#F1F5F2',
  textSecondary: '#A9B8AF',
  textMuted: '#7C8E83',
  primary: '#22C55E',
  primaryDark: '#15803D',
  primaryLight: '#182E20',
  primaryMint: '#132A1C',
  accent: '#60A5FA',
  warning: '#FBBF24',
  warningLight: '#2E2208',
  danger: '#EF4444',
  dangerLight: '#301313',
  inputBg: '#19241E',
  inputBorder: '#283A2E',
  tabBarBg: '#111713',
  tabBarBorder: '#1F2E25',
  statCardBg: '#18241D',
}

const ThemeContext = createContext({
  colors: lightColors,
  isDark: false,
  themePreference: 'system',
  setThemePreference: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme()
  const [themePreference, setThemePreferenceState] = useState('system') // 'light' | 'dark' | 'system'

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY)
        if (saved) {
          setThemePreferenceState(saved)
        }
      } catch {
        // Fallback to system
      }
    }
    loadTheme()
  }, [])

  const setThemePreference = async (pref) => {
    setThemePreferenceState(pref)
    try {
      await AsyncStorage.setItem(THEME_KEY, pref)
    } catch {
      // Ignore
    }
  }

  const isDark =
    themePreference === 'system'
      ? systemScheme === 'dark'
      : themePreference === 'dark'

  const colors = isDark ? darkColors : lightColors

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setThemePreference(next)
  }

  return (
    <ThemeContext.Provider
      value={{
        colors,
        isDark,
        themePreference,
        setThemePreference,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      colors: lightColors,
      isDark: false,
      themePreference: 'system',
      setThemePreference: () => {},
      toggleTheme: () => {},
    }
  }
  return context
}
