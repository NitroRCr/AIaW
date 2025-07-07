import { useQuasar } from 'quasar'
import { ref, computed, readonly } from 'vue'

import { privyAuthService } from '@/services/auth/privyAuthService'
import { supabase } from '@/services/data/supabase/client'

interface PrivyUser {
  id: string
  walletAddress?: string
  email?: string
  metadata?: Record<string, any>
}

interface PrivyAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface UsePrivyAuthOptions {
  /** Backend URL для получения custom JWT */
  backendUrl?: string
  /** Callback после успешной аутентификации */
  onAuthSuccess?: (user: PrivyUser, token: string) => void
  /** Callback при ошибке аутентификации */
  onAuthError?: (error: Error) => void
}

/**
 * Composable для Privy аутентификации
 * Использует простую HTTP интеграцию с backend
 */
export function usePrivyAuth(options: UsePrivyAuthOptions = {}) {
  const {
    backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001',
    onAuthSuccess,
    onAuthError
  } = options

  const $q = useQuasar()

  // State
  const isLoading = ref(false)
  const currentUser = ref<PrivyUser | null>(null)
  const customJWT = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!currentUser.value && !!customJWT.value)

  /**
   * HTTP клиент для API запросов
   */
  async function apiCall<T>(url: string, options: any = {}): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Аутентификация с помощью email
   */
  async function loginWithEmail(email: string, code: string) {
    try {
      isLoading.value = true

      // Создаем mock Privy user для демонстрации
      // const mockPrivyId = `did:privy:cmc1lhine01gwl70m6f81zhsk:${email.replace('@', '_').replace('.', '_')}`

      const privyUser = await privyAuthService.auth.email.loginWithCode(email, code)

      const user: PrivyUser = {
        id: privyUser.user.id,
        email,
        metadata: { loginMethod: 'email' }
      }

      const response = await apiCall<PrivyAuthResponse>(`${backendUrl}/auth/privy`, {
        method: 'POST',
        body: JSON.stringify({
          privy_user_id: user.id,
          email: user.email,
          metadata: user.metadata
        })
      })

      if (response.access_token) {
        currentUser.value = user
        customJWT.value = response.access_token

        // Устанавливаем сессию в Supabase SDK
        await supabase.auth.setSession({ access_token: response.access_token, refresh_token: "hujnani" }).then(({ data, error }) => {
          console.log('data', data)
          console.log('error', error)

          if (error) {
            console.error('Error setting session:', error)
          }
        })

        onAuthSuccess?.(user, response.access_token)

        $q.notify({
          message: `Welcome ${email}!`,
          color: 'positive'
        })

        return { user, token: response.access_token }
      }

      throw new Error('No access token received')
    } catch (error) {
      console.error('Email login failed:', error)
      $q.notify({
        message: 'Login failed: ' + (error as Error).message,
        color: 'negative'
      })
      onAuthError?.(error as Error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Аутентификация с помощью wallet address
   */
  async function loginWithWallet(walletAddress: string) {
    try {
      isLoading.value = true

      // Создаем mock Privy user для демонстрации
      const mockPrivyId = `did:privy:cmc1lhine01gwl70m6f81zhsk:wallet_${walletAddress.toLowerCase()}`

      const user: PrivyUser = {
        id: mockPrivyId,
        walletAddress,
        metadata: { loginMethod: 'wallet' }
      }

      const response = await apiCall<PrivyAuthResponse>(`${backendUrl}/auth/privy`, {
        method: 'POST',
        body: JSON.stringify({
          privy_user_id: user.id,
          wallet_address: user.walletAddress,
          metadata: user.metadata
        })
      })

      if (response.access_token) {
        currentUser.value = user
        customJWT.value = response.access_token

        // Сохраняем в localStorage
        localStorage.setItem('privy_user', JSON.stringify(user))
        localStorage.setItem('privy_jwt', response.access_token)

        // Устанавливаем сессию в Supabase SDK
        await supabase.auth.setSession({ access_token: response.access_token, refresh_token: "" })

        onAuthSuccess?.(user, response.access_token)

        $q.notify({
          message: `Welcome ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}!`,
          color: 'positive'
        })

        return { user, token: response.access_token }
      }

      throw new Error('No access token received')
    } catch (error) {
      console.error('Wallet login failed:', error)
      $q.notify({
        message: 'Login failed: ' + (error as Error).message,
        color: 'negative'
      })
      onAuthError?.(error as Error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Восстановление сессии из localStorage
   */
  function restoreSession() {
    try {
      const savedUser = localStorage.getItem('privy_user')
      const savedJWT = localStorage.getItem('privy_jwt')

      if (savedUser && savedJWT) {
        const user = JSON.parse(savedUser) as PrivyUser

        // Проверяем валидность токена
        if (isTokenValid(savedJWT)) {
          currentUser.value = user
          customJWT.value = savedJWT

          console.log('Session restored from localStorage')

          return true
        } else {
          // Токен истек, очищаем
          clearSession()
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      clearSession()
    }

    return false
  }

  /**
   * Очистка сессии
   */
  function clearSession() {
    localStorage.removeItem('privy_user')
    localStorage.removeItem('privy_jwt')
    currentUser.value = null
    customJWT.value = null
  }

  /**
   * Выход из системы
   */
  async function logout() {
    try {
      isLoading.value = true

      clearSession()

      $q.notify({
        message: 'Successfully logged out',
        color: 'positive'
      })
    } catch (error) {
      console.error('Logout failed:', error)
      $q.notify({
        message: 'Logout failed',
        color: 'negative'
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Получение информации о текущем пользователе
   */
  function getUserInfo() {
    return {
      user: currentUser.value,
      token: customJWT.value,
      isAuthenticated: isAuthenticated.value
    }
  }

  /**
   * Обновление JWT токена
   */
  async function refreshToken() {
    if (!currentUser.value) {
      throw new Error('No user to refresh token for')
    }

    try {
      isLoading.value = true

      const response = await apiCall<PrivyAuthResponse>(`${backendUrl}/auth/privy`, {
        method: 'POST',
        body: JSON.stringify({
          privy_user_id: currentUser.value.id,
          wallet_address: currentUser.value.walletAddress,
          email: currentUser.value.email,
          metadata: currentUser.value.metadata
        })
      })

      if (response.access_token) {
        customJWT.value = response.access_token
        localStorage.setItem('privy_jwt', response.access_token)

        return response.access_token
      }

      throw new Error('No access token received from backend')
    } catch (error) {
      console.error('Failed to refresh token:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Проверка валидности токена
   */
  function isTokenValid(token?: string): boolean {
    const jwt = token || customJWT.value

    if (!jwt) return false

    try {
      // Декодируем JWT payload
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)

      // Проверяем не истек ли токен (с запасом в 60 секунд)
      return payload.exp > (now + 60)
    } catch (error) {
      console.error('Error validating token:', error)

      return false
    }
  }

  /**
   * Тестирование соединения с backend
   */
  async function testBackendConnection() {
    try {
      const response = await apiCall(`${backendUrl}/auth/test`)
      console.log('Backend connection test:', response)

      return true
    } catch (error) {
      console.error('Backend connection failed:', error)

      return false
    }
  }

  // Восстанавливаем сессию при создании composable
  restoreSession()

  return {
    // State
    isLoading: readonly(isLoading),
    isAuthenticated: readonly(isAuthenticated),
    currentUser: readonly(currentUser),
    customJWT: readonly(customJWT),

    // Methods
    loginWithEmail,
    loginWithWallet,
    logout,
    getUserInfo,
    refreshToken,
    isTokenValid,
    testBackendConnection,
    restoreSession,
    clearSession
  }
}
