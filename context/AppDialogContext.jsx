import Ionicons from '@expo/vector-icons/Ionicons'
import React, { createContext, useCallback, useContext, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from './ThemeContext'

const AppDialogContext = createContext(() => {})

export function AppDialogProvider({ children }) {
  const { colors } = useTheme()
  const [dialog, setDialog] = useState(null)

  const showAlert = useCallback((title, message, buttons) => {
    setDialog({
      title: title || 'Klaso',
      message: message || '',
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    })
  }, [])

  const closeDialog = useCallback(() => setDialog(null), [])

  const handleButtonPress = (button) => {
    closeDialog()
    button.onPress?.()
  }

  return (
    <AppDialogContext.Provider value={showAlert}>
      {children}
      <Modal
        visible={Boolean(dialog)}
        transparent
        animationType="fade"
        onRequestClose={closeDialog}
      >
        <View style={styles.overlay}>
          <View
            accessibilityViewIsModal
            style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            </View>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              {dialog?.title}
            </Text>
            {dialog?.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {dialog.message}
              </Text>
            ) : null}
            <View
              style={[
                styles.actions,
                dialog?.buttons.length > 2 && styles.actionsStacked,
              ]}
            >
              {dialog?.buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive'
                const isCancel = button.style === 'cancel'
                return (
                  <Pressable
                    key={`${button.text}-${index}`}
                    accessibilityRole="button"
                    onPress={() => handleButtonPress(button)}
                    style={({ pressed }) => [
                      styles.action,
                      isCancel
                        ? [styles.cancelAction, { borderColor: colors.border }]
                        : { backgroundColor: isDestructive ? colors.danger : colors.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        { color: isCancel ? colors.text : '#FFFFFF' },
                      ]}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppDialogContext.Provider>
  )
}

export function useAppDialog() {
  return useContext(AppDialogContext)
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 14,
    width: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  action: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  cancelAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
})
