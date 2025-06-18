import { Decimal } from "@cosmjs/math"
import {
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
  OfflineSigner,
} from "@cosmjs/proto-signing"
import { SigningStargateClient, coins } from "@cosmjs/stargate"
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz"
import { MsgGrant, MsgRevoke } from "cosmjs-types/cosmos/authz/v1beta1/tx"
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz"
import { Any } from "cosmjs-types/google/protobuf/any"

import { config } from "@/services/blockchain/constants"
import { EncryptionService } from "@/services/security/encryption/EncryptionService"

export interface WalletInfo {
  address: string
  mnemonic: string
}

export interface GranteeWalletInfo extends WalletInfo {
  signer: OfflineDirectSigner
}

export class WalletService {
  // eslint-disable-next-line no-use-before-define
  private static instance: WalletService

  static getInstance (): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService()
    }

    return WalletService.instance
  }

  async getAccounts (signer: OfflineDirectSigner) {
    if (!signer) {
      throw new Error("Signer not provided")
    }

    return signer.getAccounts()
  }

  async createGranteeWallet (pin: string): Promise<GranteeWalletInfo> {
    try {
      const granteeSigner = await DirectSecp256k1HdWallet.generate(24, {
        prefix: "cyber",
      })
      const [firstAccount] = await granteeSigner.getAccounts()
      const encryptedMnemonic = await EncryptionService.encryptMnemonic(
        granteeSigner.mnemonic,
        pin
      )

      return {
        address: firstAccount.address,
        mnemonic: encryptedMnemonic,
        signer: granteeSigner,
      }
    } catch (error) {
      console.error("Error creating wallet:", error)
      throw new Error(`Failed to create wallet: ${error.message}`)
    }
  }

  async connectGranteeWallet (
    encryptedMnemonic: string,
    pin: string
  ): Promise<OfflineDirectSigner> {
    try {
      const decryptedMnemonic = await EncryptionService.decryptMnemonic(
        encryptedMnemonic,
        pin
      )
      const granteeSigner = await DirectSecp256k1HdWallet.fromMnemonic(
        decryptedMnemonic,
        {
          prefix: "cyber",
        }
      )

      return granteeSigner
    } catch (error) {
      console.error("Error connecting wallet:", error)
      throw new Error(`Failed to connect wallet: ${error.message}`)
    }
  }

  async validateExternalSigner (signer: OfflineSigner): Promise<void> {
    const accounts = await signer.getAccounts()

    if (accounts.length === 0) throw new Error("No accounts in external signer")
  }

  async grantAuthorization (
    granterSigner: OfflineDirectSigner,
    granterAddress: string,
    granteeAddress: string,
    msgType: string = "/cosmwasm.wasm.v1.MsgExecuteContract",
    expiration?: Date
  ): Promise<void> {
    if (!granterSigner) {
      throw new Error("Granter signer not provided")
    }

    try {
      console.log("Granting authorization:", {
        granter: granterAddress,
        grantee: granteeAddress,
        msgType,
      })

      const genericAuth = GenericAuthorization.fromPartial({
        msg: msgType,
      })

      const grantMsg: MsgGrant = {
        granter: granterAddress,
        grantee: granteeAddress,
        grant: {
          authorization: Any.fromPartial({
            typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: GenericAuthorization.encode(genericAuth).finish(),
          }),
          expiration: expiration
            ? {
                seconds: BigInt(Math.floor(expiration.getTime() / 1000)),
                nanos: 0,
              }
            : undefined,
        },
      }

      const client = await this.getClient(granterSigner)

      const result = await client.signAndBroadcast(
        granterAddress,
        [
          {
            typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
            value: grantMsg,
          },
        ],
        {
          amount: coins("150000", config.FEE_DENOM),
          gas: "150000",
        }
      )

      if (result.code !== 0) {
        throw new Error(`Failed to grant authorization: ${result.rawLog}`)
      }

      console.log("Authorization granted:", result)
    } catch (error) {
      console.error("Error granting authorization:", error)
      throw new Error(`Failed to grant authorization: ${error.message}`)
    }
  }

  async revokeAuthorization (
    granterSigner: OfflineDirectSigner,
    granterAddress: string,
    granteeAddress: string,
    msgType: string = "/cosmwasm.wasm.v1.MsgExecuteContract"
  ): Promise<void> {
    if (!granterSigner) {
      throw new Error("Granter signer not provided")
    }

    try {
      console.log("Revoking authorization:", {
        granter: granterAddress,
        grantee: granteeAddress,
        msgType,
      })

      const msg = MsgRevoke.fromPartial({
        granter: granterAddress,
        grantee: granteeAddress,
        msgTypeUrl: msgType,
      })

      const client = await this.getClient(granterSigner)

      const result = await client.signAndBroadcast(
        granterAddress,
        [
          {
            typeUrl: "/cosmos.authz.v1beta1.MsgRevoke",
            value: msg,
          },
        ],
        {
          amount: coins("120000", config.FEE_DENOM),
          gas: "120000",
        }
      )

      if (result.code !== 0) {
        throw new Error(`Failed to revoke authorization: ${result.rawLog}`)
      }

      console.log("Authorization revoked:", result)
    } catch (error) {
      console.error("Error revoking authorization:", error)
      throw new Error(`Failed to revoke authorization: ${error.message}`)
    }
  }

  async checkExistingGrants (
    granterAddress: string,
    granteeAddress: string
  ): Promise<{ hasMsgExecGrant: boolean; hasMsgSendGrant: boolean }> {
    try {
      const response = await fetch(
        `${config.LCD_URL}/cosmos/authz/v1beta1/grants?granter=${granterAddress}&grantee=${granteeAddress}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const grants = data.grants || []

      const hasMsgExecGrant = grants.some(
        (grant: any) =>
          grant.authorization?.msg === "/cosmwasm.wasm.v1.MsgExecuteContract"
      )

      const hasMsgSendGrant = grants.some(
        (grant: any) =>
          grant.authorization?.msg === "/cosmos.bank.v1beta1.MsgSend" ||
          grant.authorization?.["@type"] ===
            "/cosmos.bank.v1beta1.SendAuthorization"
      )

      return { hasMsgExecGrant, hasMsgSendGrant }
    } catch (error) {
      console.error("Error checking existing grants:", error)

      // Return false for both if we can't check
      return { hasMsgExecGrant: false, hasMsgSendGrant: false }
    }
  }

  async sendTokensToGrantee (
    granterSigner: OfflineDirectSigner,
    granteeAddress: string,
    amountDenom: string = config.FEE_DENOM,
    amountValue: string = "1000000"
  ): Promise<void> {
    if (!granterSigner) {
      throw new Error("Granter signer not connected. Cannot send tokens.")
    }

    try {
      const [granterAccount] = await granterSigner.getAccounts()
      const granterAddress = granterAccount.address

      console.log(
        `Sending ${amountValue}${amountDenom} from ${granterAddress} to ${granteeAddress}`
      )

      const client = await this.getClient(granterSigner)
      const amount = coins(amountValue, amountDenom)

      const result = await client.sendTokens(
        granterAddress,
        granteeAddress,
        amount,
        "auto"
      )

      if (result.code !== 0) {
        throw new Error(`Failed to send tokens to grantee: ${result.rawLog}`)
      }

      console.log("Tokens sent to grantee successfully:", result)
    } catch (error) {
      console.error("Error sending tokens to grantee:", error)
      throw new Error(`Failed to send tokens to grantee: ${error.message}`)
    }
  }

  async grantSendAuthorization (
    granterSigner: OfflineDirectSigner,
    granterAddress: string,
    granteeAddress: string,
    spendLimit: string = "10000000000", // 10 billion ustake by default
    expiration?: Date
  ): Promise<void> {
    if (!granterSigner) {
      throw new Error("Granter signer not provided")
    }

    try {
      console.log("Granting send authorization:", {
        granter: granterAddress,
        grantee: granteeAddress,
        spendLimit,
      })

      const sendAuth = SendAuthorization.fromPartial({
        spendLimit: coins(spendLimit, config.FEE_DENOM),
      })

      const grantMsg: MsgGrant = {
        granter: granterAddress,
        grantee: granteeAddress,
        grant: {
          authorization: Any.fromPartial({
            typeUrl: "/cosmos.bank.v1beta1.SendAuthorization",
            value: SendAuthorization.encode(sendAuth).finish(),
          }),
          expiration: expiration
            ? {
                seconds: BigInt(Math.floor(expiration.getTime() / 1000)),
                nanos: 0,
              }
            : undefined,
        },
      }

      const client = await this.getClient(granterSigner)

      const result = await client.signAndBroadcast(
        granterAddress,
        [
          {
            typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
            value: grantMsg,
          },
        ],
        {
          amount: coins("150000", config.FEE_DENOM),
          gas: "150000",
        }
      )

      if (result.code !== 0) {
        throw new Error(`Failed to grant send authorization: ${result.rawLog}`)
      }

      console.log("Send authorization granted:", result)
    } catch (error) {
      console.error("Error granting send authorization:", error)
      throw new Error(`Failed to grant send authorization: ${error.message}`)
    }
  }

  async grantMultipleAuthorizations (
    granterSigner: OfflineDirectSigner,
    granterAddress: string,
    granteeAddress: string,
    grants: {
      grantMsgExec?: boolean
      grantMsgSend?: boolean
      msgSendSpendLimit?: string
      expiration?: Date
    }
  ): Promise<void> {
    if (!granterSigner) {
      throw new Error("Granter signer not provided")
    }

    if (!grants.grantMsgExec && !grants.grantMsgSend) {
      throw new Error("At least one grant type must be specified")
    }

    try {
      console.log("Granting multiple authorizations:", {
        granter: granterAddress,
        grantee: granteeAddress,
        grants,
      })

      const messages: any[] = []

      // Add MsgExecuteContract grant if requested
      if (grants.grantMsgExec) {
        const genericAuth = GenericAuthorization.fromPartial({
          msg: "/cosmwasm.wasm.v1.MsgExecuteContract",
        })

        const msgExecGrant: MsgGrant = {
          granter: granterAddress,
          grantee: granteeAddress,
          grant: {
            authorization: Any.fromPartial({
              typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
              value: GenericAuthorization.encode(genericAuth).finish(),
            }),
            expiration: grants.expiration
              ? {
                  seconds: BigInt(
                    Math.floor(grants.expiration.getTime() / 1000)
                  ),
                  nanos: 0,
                }
              : undefined,
          },
        }

        messages.push({
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: msgExecGrant,
        })
      }

      // Add MsgSend grant if requested
      if (grants.grantMsgSend) {
        const sendAuth = SendAuthorization.fromPartial({
          spendLimit: coins(
            grants.msgSendSpendLimit || "10000000000",
            config.FEE_DENOM
          ),
        })

        const msgSendGrant: MsgGrant = {
          granter: granterAddress,
          grantee: granteeAddress,
          grant: {
            authorization: Any.fromPartial({
              typeUrl: "/cosmos.bank.v1beta1.SendAuthorization",
              value: SendAuthorization.encode(sendAuth).finish(),
            }),
            expiration: grants.expiration
              ? {
                  seconds: BigInt(
                    Math.floor(grants.expiration.getTime() / 1000)
                  ),
                  nanos: 0,
                }
              : undefined,
          },
        }

        messages.push({
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: msgSendGrant,
        })
      }

      const client = await this.getClient(granterSigner)

      // Calculate gas based on number of grants (roughly 80k per grant + base)
      const gasLimit = (80000 * messages.length + 70000).toString()
      const gasAmount = Math.floor(parseInt(gasLimit) * 0.15).toString() // 15% of gas limit for fee

      console.log("Gas calculation:", {
        messagesCount: messages.length,
        gasLimit,
        gasAmount,
        feeCoins: `${gasAmount}${config.FEE_DENOM}`,
      })

      const result = await client.signAndBroadcast(granterAddress, messages, {
        amount: coins(gasAmount, config.FEE_DENOM),
        gas: gasLimit,
      })

      if (result.code !== 0) {
        throw new Error(`Failed to grant authorizations: ${result.rawLog}`)
      }

      console.log("Multiple authorizations granted:", result)
    } catch (error) {
      console.error("Error granting multiple authorizations:", error)
      throw new Error(
        `Failed to grant multiple authorizations: ${error.message}`
      )
    }
  }

  async checkGranteeBalance (
    granteeAddress: string
  ): Promise<{ hasTokens: boolean; balance: string }> {
    try {
      const response = await fetch(
        `${config.LCD_URL}/cosmos/bank/v1beta1/balances/${granteeAddress}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const balances = data.balances || []

      // Find balance for our fee denomination (ustake)
      const tokenBalance = balances.find(
        (balance: any) => balance.denom === config.FEE_DENOM
      )
      const balanceAmount = tokenBalance ? tokenBalance.amount : "0"

      // Consider wallet funded if it has more than 500000 ustake (0.5 token)
      const hasTokens = parseInt(balanceAmount) > 500000

      console.log("Grantee balance check:", {
        granteeAddress,
        balanceAmount,
        hasTokens,
      })

      return { hasTokens, balance: balanceAmount }
    } catch (error) {
      console.error("Error checking grantee balance:", error)

      // Return false if we can't check (conservative approach)
      return { hasTokens: false, balance: "0" }
    }
  }

  async getClient (signer: OfflineDirectSigner): Promise<SigningStargateClient> {
    if (!signer) {
      throw new Error("Signer must be provided to create a client.")
    }

    return SigningStargateClient.connectWithSigner(
      config.NODE_RPC_URL,
      signer,
      {
        gasPrice: {
          amount: Decimal.fromUserInput(config.GAS_PRICE_AMOUNT, 6),
          denom: config.FEE_DENOM,
        },
      }
    )
  }
}
declare global {
  interface Window {
    WalletService: typeof WalletService
  }
}

window.WalletService = WalletService
