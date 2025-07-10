import { useQuasar } from "quasar"
import { inject, ref } from "vue"

import { KeplerWallet } from "@/services/blockchain/kepler/KeplerWallet"
import { supabase } from "@/services/data/supabase/client"

/**
 * Response from wallet auth endpoint
 */
interface WalletAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Options for the useWalletAuth composable
 */
interface UseWalletAuthOptions {
  /** Backend URL for API calls */
  backendUrl?: string
  /** Callback function after successful authentication */
  onAuthSuccess?: (walletAddress: string, token: string) => void
  /** Callback function after authentication error */
  onAuthError?: (error: Error) => void
}

/**
 * Composable for wallet authentication using Kepler wallet
 * Connects to wallet, gets address, calls backend /auth/wallet endpoint,
 * and sets Supabase session with returned JWT
 */
export function useWalletAuth(options: UseWalletAuthOptions = {}) {
  const {
    backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001',
    onAuthSuccess,
    onAuthError
  } = options

  const $q = useQuasar()
  const keplerWallet = inject<KeplerWallet>("kepler")

  // State
  const isLoading = ref(false)

  /**
   * HTTP client for API requests
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
   * Authenticate with wallet
   * 1. Connect to Kepler wallet
   * 2. Get wallet address
   * 3. Call backend /auth/wallet endpoint
   * 4. Set Supabase session with returned JWT
   */
  async function authenticateWithWallet() {
    if (!keplerWallet) {
      throw new Error("Kepler wallet not available")
    }

    try {
      isLoading.value = true

      // Step 1: Connect to Kepler wallet
      await keplerWallet.connect()

      const walletAddress = keplerWallet.state.value.address

      if (!walletAddress) {
        throw new Error("Failed to get wallet address")
      }

      // Step 2: Call backend /auth/wallet endpoint
      const response = await apiCall<WalletAuthResponse>(`${backendUrl}/auth/wallet`, {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: walletAddress
        })
      })

      if (!response.access_token) {
        throw new Error('No access token received from backend')
      }

      // Step 3: Set Supabase session with JWT
      const { error } = await supabase.auth.setSession({
        access_token: response.access_token,
        refresh_token: "suka_refresh"
      })

      if (error) {
        console.error('Error setting Supabase session:', error)
        throw new Error(`Failed to set session: ${error.message}`)
      }

      // Success
      onAuthSuccess?.(walletAddress, response.access_token)

      $q.notify({
        message: `Welcome ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}!`,
        color: 'positive'
      })

      return { walletAddress, token: response.access_token }
    } catch (error) {
      console.error('Wallet authentication failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      $q.notify({
        message: `Login failed: ${errorMessage}`,
        color: 'negative'
      })

      onAuthError?.(error as Error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    authenticateWithWallet
  }
}
