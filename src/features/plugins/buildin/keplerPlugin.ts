import { Object as TObject } from "@sinclair/typebox"

import { IsTauri } from "@/shared/utils/platformApi"
import { Plugin } from "@/shared/utils/types"

import { useAuthStore } from "@/features/auth/store/auth"

import { getLocalStorageWalletState } from "../../../services/blockchain/kepler/KeplerWallet"

// Function to get wallet address depending on platform
const getWalletAddress = async () => {
  if (IsTauri) {
    // For Tauri, use CosmosWallet through authStore
    const authStore = useAuthStore()

    if (authStore.isGranterActuallyConnected && authStore.granterSigner) {
      const accounts = await authStore.granterSigner.getAccounts()

      return {
        isConnected: true,
        address: accounts[0]?.address || "No address found",
      }
    } else {
      return {
        isConnected: false,
        address: "Cosmos wallet not connected",
      }
    }
  } else {
    // For Web, use Kepler wallet state from localStorage
    const state = getLocalStorageWalletState()

    return {
      isConnected: state.isConnected,
      address: state.isConnected
        ? state.address
        : "Kepler wallet not connected",
    }
  }
}

export const keplerPlugin: Plugin = {
  id: "kepler-plugin",
  type: "builtin",
  available: true,
  apis: [
    {
      type: "tool",
      name: "my-address",
      description:
        "My wallet address (Cosmos wallet in Tauri, Kepler wallet in Web)",
      prompt: "Use this tool to obtain current address of the wallet",
      parameters: TObject({}),
      async execute () {
        const walletInfo = await getWalletAddress()

        return [
          {
            type: "text",
            contentText: walletInfo.address,
          },
        ]
      },
    },
  ],
  fileparsers: [],
  settings: TObject({}),
  title: "Wallet Plugin",
  description:
    "Cross-platform wallet utilities (Cosmos wallet for Tauri, Kepler wallet for Web)",
}
