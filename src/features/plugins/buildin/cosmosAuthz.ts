import { toUtf8 } from "@cosmjs/encoding"
import { Decimal } from "@cosmjs/math"
import { coins } from "@cosmjs/proto-signing"
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx"

import { Plugin } from "@/shared/types"
import { IsTauri, IsWeb } from "@/shared/utils/platformApi"

import { useAuthStore } from "@/features/auth/store/auth"

import { chainConfig } from "@/services/blockchain/consts"
import {
  CYBER_CONTRACT_ADDRESS,
  getLocalStorageWalletState,
} from "@/services/blockchain/kepler/KeplerWallet"

import { WalletService, pinModalService } from "@/services"

// Helper function to request PIN for grantee on Web if needed
const requestPinForGranteeIfNeeded = async (authStore: ReturnType<typeof useAuthStore>): Promise<boolean> => {
  if (!IsWeb) return true

  // If grantee signer already exists, no need for PIN
  if (authStore.granteeSigner) return true

  // If no grantee mnemonic saved, can't request PIN
  if (!authStore.walletInfo?.mnemonic) {
    throw new Error("Grantee wallet not found. Please set up your grantee wallet first.")
  }

  try {
    // Request PIN using the service
    const result = await pinModalService.requestPin(
      "Blockchain Authentication",
      "Enter your PIN to access blockchain functions"
    )

    if (!result.success || !result.pin) {
      return false
    }

    // Connect grantee wallet with PIN
    await authStore.connectGranteeWallet(authStore.walletInfo.mnemonic, result.pin).catch((error) => {
      console.error(error)

      throw new Error("Invalid PIN")
    })

    return true
  } catch (error) {
    console.error("Failed to authenticate with PIN:", error)
    pinModalService.showError(error.message ?? "Failed to authenticate with PIN. Please try again.")
    await requestPinForGranteeIfNeeded(authStore)

    return false
  }
}

// Function to get wallet state depending on platform
const getWalletState = () => {
  if (IsTauri) {
    // For Tauri, we use CosmosWallet through inject, but since we can't use inject here,
    // we'll rely on authStore which should be connected
    const authStore = useAuthStore()

    return {
      isConnected:
        authStore.isGranterActuallyConnected && !!authStore.granterSigner,
      address: authStore.granterSigner ? null : null, // We'll get address from signer when needed
    }
  } else {
    // For Web, use Kepler wallet state
    return getLocalStorageWalletState()
  }
}

// Function to get granter address
const getGranterAddress = async () => {
  const authStore = useAuthStore()

  if (authStore.granterSigner) {
    const accounts = await authStore.granterSigner.getAccounts()

    return accounts[0]?.address
  }

  if (!IsTauri) {
    // Fallback to localStorage for Web
    const walletState = getLocalStorageWalletState()

    return walletState.address
  }

  throw new Error("No granter address available")
}

const authzPlugin: Plugin = {
  id: "cosmos-authz",
  type: "builtin",
  available: true,
  title: "Cosmos Authz",
  description:
    "BLOCKCHAIN EXECUTOR - CALLS APIs TO PERFORM OPERATIONS. When user requests token transfer (send/send), this plugin CALLS execute-send API to actually send tokens on blockchain. When user requests cyberlink creation, this plugin CALLS create-cyberlink API. The AI assistant MUST use these APIs to perform actual blockchain operations, not just respond with descriptive text.",
  apis: [
    {
      type: "tool",
      name: "broadcast-mcp-tx",
      description:
        "Broadcasts a transaction body (JSON) received from MCP using grantee client. Use this for all operations except send.",
      parameters: {
        type: "object",
        properties: {
          msg: {
            type: "object",
            description: "Transaction message JSON (as received from MCP)",
          },
        },
        required: ["msg"],
      },
      async execute(args) {
        console.log("[PLUGIN] Executing broadcast-mcp-tx", args)
        const { msg } = args
        const authStore = useAuthStore()
        const walletService = WalletService.getInstance()
        const walletState = getWalletState()

        if (!walletState.isConnected) {
          if (IsTauri) {
            throw new Error(
              "Cosmos wallet not connected. Please connect your wallet first."
            )
          } else {
            throw new Error(
              "Kepler wallet not connected. Please connect Kepler wallet first."
            )
          }
        }

        // For Web, we use lazy loading of PIN modal
        const hasGranteeSigner = await requestPinForGranteeIfNeeded(authStore)

        if (!hasGranteeSigner) {
          throw new Error(
            "Authentication cancelled. Please try again."
          )
        }

        // For Tauri or if already connected - standard check
        if (!authStore.isConnected || !authStore.granteeSigner) {
          console.log({
            isConnected: authStore.isConnected,
            granteeSigner: authStore.granteeSigner,
          })
          throw new Error(
            "Grantee wallet not connected or signer not available. Please ensure grantee wallet is set up and connected."
          )
        }

        try {
          const granterAddress = await getGranterAddress()
          const granteeAccounts = await authStore.granteeSigner.getAccounts()

          if (granteeAccounts.length === 0) {
            throw new Error("No accounts found for grantee signer.")
          }

          const granteeAccount = granteeAccounts[0]
          const granteeClient = await walletService.getClient(
            authStore.granteeSigner
          )

          // Wrap MCP JSON in MsgExecuteContract
          const execContractMsg = {
            sender: granterAddress,
            contract: CYBER_CONTRACT_ADDRESS,
            msg: toUtf8(JSON.stringify(msg)),
            funds: [],
          }

          const execMsg = {
            grantee: granteeAccount.address,
            msgs: [
              {
                typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
                value: MsgExecuteContract.encode(execContractMsg).finish(),
              },
            ],
          }

          const tx = await granteeClient.signAndBroadcast(
            granteeAccount.address,
            [
              {
                typeUrl: "/cosmos.authz.v1beta1.MsgExec",
                value: execMsg,
              },
            ],
            {
              amount: coins("210000", chainConfig.FEE_DENOM),
              gas: "210000",
            }
          )

          if (tx.code !== 0) {
            const errorMessage = tx.rawLog || "Transaction failed"
            throw new Error(
              `Transaction failed with code ${tx.code} ${errorMessage}`
            )
          }

          return [
            {
              type: "text",
              contentText: `✅ **Transaction Broadcasted Successfully**\n\n**Transaction Hash:** ${tx.transactionHash}\n**Gas Used:** ${tx.gasUsed}\n**Gas Wanted:** ${tx.gasWanted}\n**Block Height:** ${tx.height}\n\n**Explorer Link:** https://cybernode.ai/network/cyber/tx/${tx.transactionHash}`,
            },
          ]
        } catch (error) {
          console.error("Error broadcasting MCP tx:", error)
          throw new Error(`Failed to broadcast MCP tx: ${error.message}`)
        }
      },
    },
    {
      type: "tool",
      name: "execute-send",
      description:
        'REQUIRED ACTION: Execute blockchain token transfer. When user says ANY of these phrases: "send tokens", "transfer tokens", "send tokens", "transfer tokens", "send tokens", "send X to address", "transfer X to address" - you MUST call this API immediately. DO NOT respond with text like "tokens sent" - CALL THIS API TO ACTUALLY SEND THEM. Example user input: "send 100 ustake to cyber1abc" -> REQUIRED ACTION: call execute-send with {toAddress: "cyber1abc", amount: "100"}',
      parameters: {
        type: "object",
        properties: {
          toAddress: {
            type: "string",
            description: "Recipient wallet address (must start with cyber1...)",
          },
          amount: {
            type: "string",
            description: 'Amount to send as string (e.g. "100", "50.5")',
          },
        },
        required: ["toAddress", "amount"],
      },
      async execute (args) {
        console.log("[PLUGIN] Executing execute-send")
        const { toAddress, amount } = args
        const authStore = useAuthStore()
        const walletService = WalletService.getInstance()
        const walletState = getWalletState()

        if (!walletState.isConnected) {
          if (IsTauri) {
            throw new Error(
              "Cosmos wallet not connected. Please connect your wallet first."
            )
          } else {
            throw new Error(
              "Kepler wallet not connected. Please connect Kepler wallet first."
            )
          }
        }

        // For Web we use lazy loading of PIN modal
        const hasGranteeSigner = await requestPinForGranteeIfNeeded(authStore)

        if (!hasGranteeSigner) {
          throw new Error(
            "Authentication cancelled. Please try again."
          )
        }

        // For Tauri or if already connected - standard check
        if (!authStore.isConnected || !authStore.granteeSigner) {
          console.log({
            isConnected: authStore.isConnected,
            granteeSigner: authStore.granteeSigner,
          })
          throw new Error(
            "Grantee wallet not connected or signer not available. Please ensure grantee wallet is set up and connected."
          )
        }

        try {
          // Validate and sanitize amount
          if (!amount || typeof amount !== "string") {
            throw new Error("Invalid amount format")
          }

          // Remove any non-numeric characters except decimal point
          const sanitizedAmount = amount.replace(/[^\d.]/g, "")

          // Ensure only one decimal point
          const parts = sanitizedAmount.split(".")

          if (parts.length > 2) {
            throw new Error("Invalid amount format: multiple decimal points")
          }

          // Ensure decimal places don't exceed 6
          if (parts[1] && parts[1].length > 6) {
            throw new Error("Amount cannot have more than 6 decimal places")
          }

          const granterAddress = await getGranterAddress()
          const granteeAccounts = await authStore.granteeSigner.getAccounts()

          if (granteeAccounts.length === 0) {
            throw new Error("No accounts found for grantee signer.")
          }

          const granteeAccount = granteeAccounts[0]
          const granteeClient = await walletService.getClient(
            authStore.granteeSigner
          )

          // Convert amount to proper format
          const amountDecimal = Decimal.fromUserInput(sanitizedAmount, 0)
          const amountString = amountDecimal.atomics.toString()
          console.log("[PLUGIN] Amount decimal:", {
            amountDecimal,
            amountString,
          })

          console.log("Transaction details:", {
            granterAddress,
            toAddress,
            originalAmount: amount,
            sanitizedAmount,
            amountString,
          })

          // Create MsgSend directly instead of MsgExecuteContract
          const sendMsg = MsgSend.fromPartial({
            fromAddress: granterAddress,
            toAddress,
            amount: coins(amountString, chainConfig.FEE_DENOM),
          })

          // Use MsgExec to execute the MsgSend with authorization
          const execMsg: MsgExec = {
            grantee: granteeAccount.address,
            msgs: [
              {
                typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                value: MsgSend.encode(sendMsg).finish(),
              },
            ],
          }

          const tx = await granteeClient.signAndBroadcast(
            granteeAccount.address,
            [
              {
                typeUrl: "/cosmos.authz.v1beta1.MsgExec",
                value: execMsg,
              },
            ],
            {
              amount: coins("210000", chainConfig.FEE_DENOM),
              gas: "210000",
            }
          )

          if (tx.code !== 0) {
            const errorMessage = tx.rawLog || "Transaction failed"
            throw new Error(
              `Transaction failed with code ${tx.code} ${errorMessage}`
            )
          }

          return [
            {
              type: "text",
              contentText: `✅ **Token Transfer Successful** **Explorer Link:** https://cybernode.ai/network/cyber/tx/${tx.transactionHash}`,
            },
          ]
        } catch (error) {
          console.error("Error executing send transaction:", error)
          throw new Error(`Failed to execute transaction: ${error.message}`)
        }
      },
    },
  ],
  fileparsers: [],
  settings: {
    type: "object",
    properties: {},
  },
  prompt: `CRITICAL INSTRUCTIONS FOR AI ASSISTANT:

1. When user writes "send X tokens to cyber1..." or "send X tokens to cyber1..." I MUST immediately call execute-send API
2. For ALL OTHER blockchain operations (cyberlink creation, update, delete, etc.) I MUST call broadcast-mcp-tx API with the JSON transaction body received from MCP
3. I NEVER respond with text like "tokens sent" or "operation completed" without calling the API first
4. I ALWAYS call the API to perform the actual blockchain operation

EXAMPLES OF REQUIRED API CALLS:
- User: "send 100 ustake to cyber1abc123" → I call execute-send({toAddress: "cyber1abc123", amount: "100"})
- User: "send 50 tokens to cyber1def456" → I call execute-send({toAddress: "cyber1def456", amount: "50"})

I am a blockchain executor that PERFORMS operations by calling APIs, not a text generator that describes operations.
when user asks to create/update/delete cyberlink use MCP tool to create transaction body and pass this body as msg
to broadcast-mcp-tx; fid is mandatory field, take it from the data returned by MCP plugin and add to cyberlink
transaction body, here is correct msg example
{
  "update_cyberlink": {
    "cyberlink": {
      "type": "Post",
      "from": "Any",
      "to": "Any",
      "value": "Andryha test updated"
    },
    "fid": "Post:24"
  }
}
  use fid, don't use gid!
`,
  promptVars: [],
}

export default authzPlugin
