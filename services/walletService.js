import { auth } from '../firebase/config'

const API_URL = String(process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '')

async function requestWalletApi(path, { method = 'GET', body } = {}) {
  if (!API_URL) {
    throw new Error('Backend URL is not configured. Set EXPO_PUBLIC_API_URL in the Klaso app environment.')
  }

  const user = auth.currentUser
  if (!user) {
    throw new Error('Please sign in before continuing.')
  }

  let token = await user.getIdToken()
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    let response
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('The server took too long to respond. Please try again.')
      }
      throw new Error('Unable to reach the Klaso server. Check your connection and try again.')
    } finally {
      clearTimeout(timeoutId)
    }

    if (response.status === 401 && attempt === 0) {
      token = await user.getIdToken(true)
      continue
    }

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status}). Please try again.`)
    }
    return data
  }

  throw new Error('Your session expired. Please sign in again.')
}

function normalizeBankList(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.banks)
      ? payload.banks
      : Array.isArray(payload?.data)
        ? payload.data
      : Array.isArray(payload?.data?.banks)
        ? payload.data.banks
        : []
  const uniqueBanks = new Map()

  for (const bank of entries) {
    if (!bank || typeof bank !== 'object' || bank.code == null || typeof bank.name !== 'string') {
      continue
    }
    const code = String(bank.code).trim()
    const name = bank.name.trim()
    if (code && name && !uniqueBanks.has(code)) {
      uniqueBanks.set(code, { code, name, country: String(bank.country || 'NG') })
    }
  }

  if (uniqueBanks.size === 0) {
    throw new Error(payload?.error || 'The server returned no supported banks. Try again later.')
  }
  return [...uniqueBanks.values()]
}

function normalizeBankAccount(account) {
  if (!account || typeof account !== 'object') return null
  const id = account.id || account.bankAccountId
  if (typeof id !== 'string' || !id) return null
  return {
    id,
    accountName: typeof account.accountName === 'string' ? account.accountName : '',
    bankName: typeof account.bankName === 'string' ? account.bankName : '',
    accountNumberMasked: typeof account.accountNumberMasked === 'string'
      ? account.accountNumberMasked
      : '••••',
    isDefault: account.isDefault === true,
    isVerified: account.isVerified === true,
    country: typeof account.country === 'string' ? account.country : 'NG',
    currency: typeof account.currency === 'string' ? account.currency : 'NGN',
  }
}

export async function getTutorWallet() {
  const data = await requestWalletApi('/api/wallet')

  return data.wallet || {
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    reservedBalance: 0,
    withdrawnAmount: 0,
    totalTutorialsSold: 0,
    lastTransactions: [],
  }
}

export async function getWalletTransactions() {
  const data = await requestWalletApi('/api/wallet/transactions')

  return Array.isArray(data.transactions) ? data.transactions : []
}

export async function getBankList() {
  const data = await requestWalletApi('/api/wallet/banks')
  return normalizeBankList(data)
}

export async function resolveBankAccount({ bankCode, accountNumber, country = 'NG' }) {
  if (!bankCode || !accountNumber) {
    throw new Error('Bank details are incomplete.')
  }

  const data = await requestWalletApi('/api/wallet/banks/resolve', {
    method: 'POST',
    body: { bankCode: String(bankCode).trim(), accountNumber: String(accountNumber).replace(/\D/g, ''), country },
  })
  const account = data.account || data
  const accountName = typeof account.accountName === 'string' ? account.accountName.trim() : ''
  return {
    bankCode: String(account.bankCode || bankCode).trim(),
    accountName,
    resolved: account.resolved === true && accountName.length > 0,
  }
}

export async function getBankAccounts() {
  const data = await requestWalletApi('/api/wallet/bank-accounts')
  const accounts = Array.isArray(data.accounts) ? data.accounts : null
  if (!accounts) {
    throw new Error('The server returned an invalid saved bank accounts response.')
  }
  return accounts.map(normalizeBankAccount).filter(Boolean)
}

export async function saveBankAccount({ bankCode, accountNumber, country = 'NG', isDefault = false }) {
  const data = await requestWalletApi('/api/wallet/bank-accounts', {
    method: 'POST',
    body: { bankCode, accountNumber, country, isDefault },
  })
  const account = normalizeBankAccount(data.account)
  if (!account) throw new Error('The server returned an invalid saved bank account.')
  return account
}

export async function setDefaultBankAccount(accountId) {
  return requestWalletApi(`/api/wallet/bank-accounts/${encodeURIComponent(accountId)}/default`, {
    method: 'PUT',
  })
}

export async function deleteBankAccount(accountId) {
  return requestWalletApi(`/api/wallet/bank-accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })
}

export async function requestWithdrawal({ amount, bankAccountId, currency = 'NGN' }) {
  if (!amount || !bankAccountId) {
    throw new Error('A valid amount and bank account are required.')
  }

  const data = await requestWalletApi('/api/wallet/withdraw', {
    method: 'POST',
    body: { amount: Number(amount), bankAccountId, currency },
  })
  return data.withdrawal || data
}

export async function getWalletWithdrawals() {
  const data = await requestWalletApi('/api/wallet/withdrawals')

  return Array.isArray(data.withdrawals) ? data.withdrawals : []
}
