import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { getTutorWallet, getWalletTransactions } from '../../services/walletService'

const formatCurrency = (value) => {
  const numeric = Number(value || 0)
  return `₦${numeric.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function WalletScreen() {
  const { colors, isDark } = useTheme()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const [walletData, transactionData] = await Promise.all([
        getTutorWallet(),
        getWalletTransactions(),
      ])
      setWallet(walletData)
      setTransactions(transactionData)
    } catch (loadError) {
      console.error('Unable to load wallet:', loadError)
      setError(loadError.message || 'We could not load your wallet right now.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadWallet(false)
    }, [loadWallet])
  )

  const summaryCards = [
    {
      label: 'Available balance',
      value: wallet?.availableBalance ?? 0,
      icon: 'wallet-outline',
      tone: colors.primary,
    },
    {
      label: 'Total earnings',
      value: wallet?.totalEarnings ?? 0,
      icon: 'cash-outline',
      tone: colors.primaryDark,
    },
    {
      label: 'Pending',
      value: wallet?.pendingBalance ?? 0,
      icon: 'time-outline',
      tone: colors.warning,
    },
    {
      label: 'Withdrawn',
      value: wallet?.withdrawnAmount ?? 0,
      icon: 'arrow-down-outline',
      tone: colors.textSecondary,
    },
  ]

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWallet(true)} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Wallet</Text>
          <Pressable onPress={() => router.push('/wallet/bank-accounts')} style={[styles.smallAction, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: isDark ? '#3B1517' : '#FEE2E2', borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <View style={[styles.balanceCard, { backgroundColor: colors.primaryDark }]}>
              <Text style={styles.balanceLabel}>Current available cash</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(wallet?.availableBalance ?? 0)}</Text>
              <Text style={styles.balanceMeta}>{wallet?.totalTutorialsSold ?? 0} tutorials sold</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={() => router.push('/wallet/bank-accounts')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Bank accounts</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/wallet/withdraw')} style={[styles.secondaryButton, { backgroundColor: colors.surface }]}>
                  <Ionicons name="arrow-down-outline" size={18} color={colors.primary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Withdraw</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.grid}>
              {summaryCards.map((item) => (
                <View key={item.label} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.metricIcon, { backgroundColor: item.tone + '1A' ?? colors.primaryLight }]}>
                    <Ionicons name={item.icon} size={18} color={item.tone} />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(item.value)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent activity</Text>
            </View>

            {transactions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No wallet activity yet</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>Your sales and withdrawals will appear here.</Text>
              </View>
            ) : (
              transactions.slice(0, 6).map((transaction) => (
                <View key={transaction.id || transaction.reference || transaction.transactionId} style={[styles.transactionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.transactionIcon, { backgroundColor: transaction.type === 'withdrawal' ? colors.warningLight : colors.primaryLight }]}>
                    <Ionicons name={transaction.type === 'withdrawal' ? 'arrow-down-outline' : 'trending-up-outline'} size={18} color={transaction.type === 'withdrawal' ? colors.warning : colors.primary} />
                  </View>
                  <View style={styles.transactionMeta}>
                    <Text style={[styles.transactionTitle, { color: colors.text }]}>{transaction.description || transaction.type || 'Wallet activity'}</Text>
                    <Text style={[styles.transactionStatus, { color: colors.textMuted }]}>{transaction.status || 'completed'}</Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: transaction.type === 'withdrawal' ? colors.text : colors.primary }]}>
                    {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(transaction.amount || 0)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 36 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  smallAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginTop: 20,
    borderRadius: 22,
    padding: 20,
  },
  balanceLabel: { color: '#DDEDE1', fontSize: 13, fontWeight: '600' },
  balanceAmount: { marginTop: 12, color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  balanceMeta: { marginTop: 6, color: '#DDEDE1', fontSize: 13 },
  actionRow: { marginTop: 18, flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryButtonText: { fontWeight: '700' },
  grid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { marginTop: 12, fontSize: 12 },
  metricValue: { marginTop: 6, fontSize: 17, fontWeight: '700' },
  sectionHeader: { marginTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  transactionRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionMeta: { flex: 1, marginLeft: 12 },
  transactionTitle: { fontWeight: '600' },
  transactionStatus: { marginTop: 3, fontSize: 12 },
  transactionAmount: { fontWeight: '700', fontSize: 15 },
  emptyCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { marginTop: 6, fontSize: 13, textAlign: 'center' },
  errorCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  errorText: { fontSize: 13, fontWeight: '600' },
  loadingBox: { marginTop: 60, alignItems: 'center', justifyContent: 'center' },
})
