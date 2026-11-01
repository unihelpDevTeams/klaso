import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { getBankAccounts, getTutorWallet, requestWithdrawal } from '../../services/walletService'

const formatCurrency = (value) => {
  const numeric = Number(value || 0)
  return `₦${numeric.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function WithdrawScreen() {
  const { colors } = useTheme()
  const [wallet, setWallet] = useState({ availableBalance: 0 })
  const [accounts, setAccounts] = useState([])
  const [amount, setAmount] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [walletData, accountData] = await Promise.all([getTutorWallet(), getBankAccounts()])
      setWallet(walletData)
      setAccounts(accountData)
      const defaultAccount = accountData.find((account) => account.isDefault) || accountData[0]
      if (defaultAccount) setSelectedAccount(defaultAccount.id)
    } catch (error) {
      Alert.alert('Withdrawal', error.message || 'Unable to load withdrawal details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleSubmit = async () => {
    const numericAmount = Number(amount)
    if (!selectedAccount) {
      Alert.alert('Withdrawal', 'Add and select a bank account before requesting a payout.')
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Withdrawal', 'Enter a valid amount to withdraw.')
      return
    }

    if (numericAmount > Number(wallet.availableBalance || 0)) {
      Alert.alert('Withdrawal', 'Your available balance is lower than the requested amount.')
      return
    }

    setSubmitting(true)
    try {
      await requestWithdrawal({ amount: numericAmount, bankAccountId: selectedAccount })
      Alert.alert('Withdrawal request sent', 'Your payout has been created and is being processed.')
      setAmount('')
      await loadData()
      router.back()
    } catch (error) {
      Alert.alert('Withdrawal', error.message || 'Unable to process the withdrawal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Withdraw</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <>
            <View style={[styles.balanceCard, { backgroundColor: colors.primaryDark }]}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(wallet.availableBalance || 0)}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="25000"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Payout account</Text>
              {accounts.length === 0 ? (
                <Pressable onPress={() => router.push('/wallet/bank-accounts')} style={[styles.linkCard, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Add a bank account first</Text>
                </Pressable>
              ) : (
                accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    onPress={() => setSelectedAccount(account.id)}
                    style={[styles.accountChoice, { backgroundColor: selectedAccount === account.id ? colors.primaryLight : colors.inputBg, borderColor: selectedAccount === account.id ? colors.primary : colors.inputBorder }]}>
                    <View>
                      <Text style={[styles.accountBank, { color: colors.text }]}>{account.bankName}</Text>
                      <Text style={[styles.accountMeta, { color: colors.textMuted }]}>{account.accountName} • {account.accountNumberMasked || '••••'}</Text>
                    </View>
                    {selectedAccount === account.id ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                  </Pressable>
                ))
              )}

              <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.submitButton, { backgroundColor: colors.primary }]}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Request withdrawal</Text>}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
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
  loadingBox: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  balanceCard: {
    marginTop: 20,
    borderRadius: 20,
    padding: 18,
  },
  balanceLabel: { color: '#DDEDE1', fontSize: 12, fontWeight: '600' },
  balanceAmount: { marginTop: 8, color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  card: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  label: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  linkCard: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  linkText: { fontWeight: '700' },
  accountChoice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountBank: { fontWeight: '700' },
  accountMeta: { marginTop: 4, fontSize: 12 },
  submitButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700' },
})
