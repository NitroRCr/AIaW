import type { OfflineAminoSigner, StdSignDoc } from "@cosmjs/amino"
import {
  SigningCosmWasmClient,
  CosmWasmClient,
} from "@cosmjs/cosmwasm-stargate"
import {
  AccountData,
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing"
import { GasPrice } from "@cosmjs/stargate"
import { ref } from "vue"

import {
  saveMnemonic,
  getMnemonic,
  removeMnemonic,
} from "@/shared/store/tauriStore"
import { IsTauri } from "@/shared/utils/platformApi"

import { config } from "@/services/blockchain/constants"
import { CYBER_CONTRACT_ADDRESS } from "@/services/blockchain/kepler/KeplerWallet"
import type { TxStatusResponse } from "@/services/blockchain/kepler/types"
import { parseTxStatus } from "@/services/blockchain/kepler/utils"
import { EncryptionService } from "@/services/security/encryption/EncryptionService"

export interface CosmosSignerState {
  isConnected: boolean
  address: string | null
  type: "keplr" | "mnemonic" | null
}

type CyberOfflineSigner = (OfflineDirectSigner | OfflineAminoSigner) & {
  getAccounts: () => Promise<readonly AccountData[]>
}

export function createCosmosSigner () {
  console.log("createCosmosSigner")
  const state = ref<CosmosSignerState>({
    isConnected: false,
    address: null,
    type: null,
  })
  const client = ref<CosmWasmClient | null>(null)
  let offlineSigner: CyberOfflineSigner | null = null

  // Initialize CosmWasmClient
  if (typeof window !== "undefined") {
    CosmWasmClient.connect(config.NODE_RPC_URL)
      .then((cosmWasmClient) => {
        client.value = cosmWasmClient
      })
      .catch(console.error)
  }

  // Auto load mnemonic from tauri-store (if exists)
  if (IsTauri) {
    getMnemonic().then(async (encryptedMnemonic) => {
      if (encryptedMnemonic) {
        console.log("Encrypted mnemonic found in store")
        // Note: We can't auto-connect here as we need the PIN
        // The PIN will be requested by the PIN modal when needed
      }
    })
  }

  const connectWithKeplr = async () => {
    try {
      if (!window.keplr) {
        throw new Error("Keplr extension not installed")
      }

      // Enable access to chain
      await window.keplr.enable(config.CHAIN_ID)

      // Get the offline signer
      offlineSigner = window.keplr.getOfflineSigner(config.CHAIN_ID)

      // Get user's account
      const accounts = await offlineSigner.getAccounts()
      const address = accounts[0].address

      state.value = { isConnected: true, address, type: "keplr" }
    } catch (error) {
      console.error("Failed to connect with Keplr:", error)
      throw error
    }
  }

  const connectWithMnemonic = async (mnemonic: string, pin: string) => {
    try {
      // Create wallet from mnemonic
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "cyber",
      })

      // Get accounts
      const accounts = await wallet.getAccounts()
      const address = accounts[0].address

      offlineSigner = wallet
      state.value = { isConnected: true, address, type: "mnemonic" }

      // Save encrypted mnemonic in tauri-store
      if (IsTauri) {
        const encryptedMnemonic = await EncryptionService.encryptMnemonic(
          mnemonic,
          pin
        )
        await saveMnemonic(encryptedMnemonic)
      }
    } catch (error) {
      console.error("Failed to connect with mnemonic:", error)
      throw error
    }
  }

  const disconnect = () => {
    state.value = { isConnected: false, address: null, type: null }
    offlineSigner = null

    // Remove mnemonic from tauri-store
    if (IsTauri) {
      removeMnemonic()
    }
  }

  const signTransaction = async (signDoc: StdSignDoc) => {
    try {
      if (!offlineSigner) {
        throw new Error("No signer available")
      }

      const accounts = await offlineSigner.getAccounts()

      // Create a new signDoc with our chain configuration
      const newSignDoc: StdSignDoc = {
        ...signDoc,
        chain_id: config.CHAIN_ID,
        fee: {
          ...signDoc.fee,
          amount: signDoc.fee.amount.map((coin) => ({
            ...coin,
            denom: config.FEE_DENOM,
          })),
        },
      }

      if ("signAmino" in offlineSigner) {
        return await offlineSigner.signAmino(accounts[0].address, newSignDoc)
      } else {
        throw new Error("Signer does not support amino signing")
      }
    } catch (error) {
      console.error("Failed to sign transaction:", error)
      throw error
    }
  }

  const executeTransaction = async (
    msg: Record<string, any>,
    contractAddress: string = CYBER_CONTRACT_ADDRESS
  ) => {
    try {
      if (!offlineSigner) {
        throw new Error("No signer available")
      }

      const accounts = await offlineSigner.getAccounts()
      const sender = accounts[0]

      // Create signing client
      const gasPrice = GasPrice.fromString(
        `${config.GAS_PRICE_AMOUNT}${config.FEE_DENOM}`
      )
      const signingClient = await SigningCosmWasmClient.connectWithSigner(
        config.NODE_RPC_URL,
        offlineSigner,
        { gasPrice }
      )

      // Execute transaction
      const result = await signingClient.execute(
        sender.address,
        contractAddress,
        msg,
        "auto"
      )

      return result
    } catch (error) {
      console.error("Failed to execute transaction:", error)
      throw error
    }
  }

  const getTx = async (
    transactionHash: string
  ): Promise<TxStatusResponse | null> => {
    if (!client.value) {
      throw new Error("CosmWasm client not initialized")
    }

    const tx = await client.value.getTx(transactionHash)

    if (!tx) {
      return null
    }

    return parseTxStatus(tx)
  }

  const waitForTransaction = async (
    txHash: string,
    timeoutMs: number = 30000,
    pollIntervalMs: number = 1000
  ) => {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      try {
        const result = await getTx(txHash)

        if (result) return result
      } catch (error) {
        console.error(`Error while polling transaction ${txHash}:`, error)
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    throw new Error(`Transaction confirmation timed out after ${timeoutMs}ms`)
  }

  const getOfflineSigner = () => {
    return offlineSigner
  }

  return {
    state,
    connectWithKeplr,
    connectWithMnemonic,
    disconnect,
    signTransaction,
    executeTransaction,
    getTx: waitForTransaction,
    getOfflineSigner,
  }
}

export type CosmosWallet = ReturnType<typeof createCosmosSigner>
