import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { useAppDialog } from '../../context/AppDialogContext'
import { deleteBankAccount, getBankAccounts, getBankList, resolveBankAccount, saveBankAccount, setDefaultBankAccount } from '../../services/walletService'

export default function BankAccountsScreen() {
  const { colors } = useTheme()
  const showAlert = useAppDialog()
  const [accounts, setAccounts] = useState([])
  const [banks, setBanks] = useState([])
  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountVerified, setAccountVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showBankPicker, setShowBankPicker] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [accountActionId, setAccountActionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [bankListLoading, setBankListLoading] = useState(true)
  const [bankListError, setBankListError] = useState('')
  const loadRequestRef = useRef(null)

  const loadData = useCallback(async () => {
    if (loadRequestRef.current) return loadRequestRef.current

    const request = (async () => {
      setLoading(true)
      setBankListLoading(true)
      try {
        const [bankResult, accountResult] = await Promise.allSettled([
          getBankList(),
          getBankAccounts(),
        ])

        if (bankResult.status === 'fulfilled') {
          setBanks(bankResult.value)
          setBankListError('')
        } else {
          console.error('Unable to load bank list:', bankResult.reason)
          setBankListError('We couldn’t load the bank list. Please try again.')
        }

        if (accountResult.status === 'fulfilled') {
          setAccounts(accountResult.value)
        } else {
          console.error('Unable to load saved bank accounts:', accountResult.reason)
          showAlert('Accounts not available', 'We couldn’t load your saved bank accounts. Please try again.')
        }
      } finally {
        setLoading(false)
        setBankListLoading(false)
      }
    })()
    loadRequestRef.current = request
    try {
      await request
    } finally {
      loadRequestRef.current = null
    }
  }, [showAlert])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleSave = async () => {
    if (!bankCode || !bankName || !accountNumber || !accountVerified || !accountName) {
      showAlert('Complete account details', 'Choose a bank and verify the account number before saving.')
      return
    }

    setSaving(true)
    try {
      await saveBankAccount({
        bankCode,
        accountNumber,
        isDefault: accounts.length === 0,
      })
      setBankCode('')
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      setAccountVerified(false)
      await loadData()
      showAlert('Bank account saved', 'Your bank account is ready to use for payouts.')
    } catch (error) {
      console.error('Unable to save bank account:', error)
      showAlert('Account not saved', 'We couldn’t save this bank account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyAccount = async () => {
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      showAlert('Check account details', 'Select a bank and enter a valid 10-digit account number.')
      return
    }

    setVerifying(true)
    setAccountName('')
    setAccountVerified(false)
    try {
      const result = await resolveBankAccount({ bankCode, accountNumber })
      if (!result.resolved || !result.accountName) {
        throw new Error('Account holder details could not be verified.')
      }
      setAccountName(result.accountName)
      setAccountVerified(true)
    } catch (error) {
      console.error('Unable to verify bank account:', error)
      showAlert('Account couldn’t be verified', 'Check the bank and account number, then try again.')
    } finally {
      setVerifying(false)
    }
  }

  const filteredBanks = banks.filter((bank) =>
    bank &&
    typeof bank === 'object' &&
    bank.code != null &&
    typeof bank.name === 'string' &&
    bank.name.trim().toLowerCase().includes(bankSearch.trim().toLowerCase())
  )

  const handleDefault = async (accountId) => {
    if (accountActionId) return
    setAccountActionId(accountId)
    try {
      await setDefaultBankAccount(accountId)
      await loadData()
    } catch (error) {
      console.error('Unable to set default bank account:', error)
      showAlert('Default account not changed', 'We couldn’t update your default bank account. Please try again.')
    } finally {
      setAccountActionId('')
    }
  }

  const handleDelete = async (accountId) => {
    showAlert('Remove bank account?', 'This account will no longer be available for payouts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (accountActionId) return
          setAccountActionId(accountId)
          try {
            await deleteBankAccount(accountId)
            await loadData()
          } catch (error) {
            console.error('Unable to remove bank account:', error)
            showAlert('Account not removed', 'We couldn’t remove this bank account. Please try again.')
          } finally {
            setAccountActionId('')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Bank accounts</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Add a payout account</Text>

          <Text style={[styles.label, { color: colors.textMuted }]}>Bank</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bankName ? `Selected bank: ${bankName}` : 'Choose a bank'}
            onPress={() => setShowBankPicker(true)}
            disabled={verifying}
            style={[styles.bankPickerButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          >
            <Text style={[styles.bankPickerText, { color: bankName ? colors.text : colors.textMuted }]}>
              {bankName || 'Choose your bank'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>

          <Text style={[styles.label, { color: colors.textMuted }]}>Account number</Text>
          <TextInput
            value={accountNumber}
            editable={!verifying}
            onChangeText={(value) => {
              setAccountNumber(value.replace(/\D/g, '').slice(0, 10))
              setAccountName('')
              setAccountVerified(false)
            }}
            placeholder="0123456789"
            keyboardType="number-pad"
            maxLength={10}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          />

          <Pressable
            onPress={handleVerifyAccount}
            disabled={verifying || !bankCode || accountNumber.length !== 10}
            style={[styles.verifyButton, { borderColor: colors.primary, opacity: verifying || !bankCode || accountNumber.length !== 10 ? 0.55 : 1 }]}
          >
            {verifying ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text style={[styles.verifyButtonText, { color: colors.primary }]}>
              {verifying ? 'Verifying...' : accountVerified ? 'Account verified' : 'Verify account'}
            </Text>
          </Pressable>

          <Text style={[styles.label, { color: colors.textMuted }]}>Account holder name</Text>
          <TextInput
            value={accountName}
            editable={false}
            placeholder="Name will appear after verification"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textMuted }]}
          />

          <Pressable onPress={handleSave} disabled={saving || !accountVerified} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving || !accountVerified ? 0.6 : 1 }]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save bank account</Text>}
          </Pressable>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved accounts</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{accounts.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} /></View>
        ) : accounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No payout accounts yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Add your primary bank account to receive tutor payouts.</Text>
          </View>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.accountTopRow}>
                <View>
                  <Text style={[styles.accountName, { color: colors.text }]}>{account.accountName || 'Bank account'}</Text>
                  <Text style={[styles.accountDetail, { color: colors.textMuted }]}>{account.bankName} • {account.accountNumberMasked || '••••'}</Text>
                </View>
                {account.isDefault ? (
                  <View style={[styles.defaultTag, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.accountActions}>
                {!account.isDefault ? (
                  <Pressable disabled={Boolean(accountActionId)} onPress={() => handleDefault(account.id)} style={[styles.inlineButton, { borderColor: colors.border, opacity: accountActionId ? 0.6 : 1 }]}>
                    <Text style={[styles.inlineButtonText, { color: colors.primary }]}>Make default</Text>
                  </Pressable>
                ) : null}
                <Pressable disabled={Boolean(accountActionId)} onPress={() => handleDelete(account.id)} style={[styles.inlineButton, { borderColor: colors.border, opacity: accountActionId ? 0.6 : 1 }]}>
                  <Text style={[styles.inlineButtonText, { color: colors.danger }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {banks.length > 0 ? (
          <Pressable
            onPress={() => setShowBankPicker(true)}
            style={[styles.supportedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.supportedTitle, { color: colors.text }]}>Supported banks</Text>
            <Text style={[styles.supportedText, { color: colors.textMuted }]}>
              Browse all {banks.length} supported banks
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={showBankPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowBankPicker(false)}
            accessibilityLabel="Close bank picker"
          />
          <View style={[styles.bankModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose your bank</Text>
              <Pressable onPress={() => setShowBankPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <TextInput
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholder="Search banks"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            />
            <ScrollView style={styles.bankList} keyboardShouldPersistTaps="handled">
              {bankListLoading ? (
                <View style={styles.bankListStatus}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading banks...</Text>
                </View>
              ) : bankListError ? (
                <View style={styles.bankListStatus}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>{bankListError}</Text>
                  <Pressable onPress={loadData} style={[styles.retryButton, { borderColor: colors.border }]}>
                    <Text style={[styles.retryButtonText, { color: colors.primary }]}>Retry</Text>
                  </Pressable>
                </View>
              ) : filteredBanks.map((bank, index) => (
                <Pressable
                  key={`${String(bank.code)}-${index}`}
                  style={[styles.bankOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setBankName(bank.name.trim())
                    setBankCode(String(bank.code))
                    setAccountName('')
                    setAccountVerified(false)
                    setBankSearch('')
                    setShowBankPicker(false)
                  }}
                >
                  <Text style={[styles.bankOptionText, { color: colors.text }]}>{bank.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
              {!bankListLoading && !bankListError && filteredBanks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matching banks.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  formCard: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  bankPickerButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  bankPickerText: { fontSize: 14 },
  readOnlyInput: { opacity: 0.85 },
  verifyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  verifyButtonText: { fontSize: 13, fontWeight: '700' },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  bankModal: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
    padding: 16,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  bankList: { marginTop: 10 },
  bankListStatus: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  retryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: { fontSize: 13, fontWeight: '700' },
  bankOption: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  bankOptionText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700' },
  listHeaderRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionHint: { fontSize: 12 },
  accountCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountName: { fontWeight: '700', fontSize: 16 },
  accountDetail: { marginTop: 4, fontSize: 12 },
  defaultTag: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  defaultText: { fontWeight: '700', fontSize: 11 },
  accountActions: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  inlineButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  inlineButtonText: { fontWeight: '700', fontSize: 12 },
  emptyCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { marginTop: 6, textAlign: 'center', fontSize: 13 },
  supportedCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  supportedTitle: { fontSize: 16, fontWeight: '700' },
  supportedText: { marginTop: 8, fontSize: 12 },
  loadingBox: { marginTop: 20, alignItems: 'center', justifyContent: 'center' },
})
