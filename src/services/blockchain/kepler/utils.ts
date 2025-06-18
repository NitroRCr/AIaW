import type { IndexedTx, Event } from "@cosmjs/cosmwasm-stargate"

import type { TxStatusResponse } from "./types"

// Fields to extract from cyberlink event
const FIELD_NAMES = ["gid", "gids", "fid", "fids"]

export const parseEvents = (
  events: readonly Event[]
): Record<string, string> => {
  const wasmEvent = events.find((e) => e.type === "wasm")?.attributes || []

  const result: Record<string, string> = {}

  FIELD_NAMES.forEach((key) => {
    const value = wasmEvent.find((a) => a.key === key)?.value

    if (value) {
      result[key] = value
    }
  })

  return result
}

export const parseTxStatus = async (
  tx: IndexedTx
): Promise<TxStatusResponse> => {
  if (tx.code === 0) {
    return {
      status: "confirmed",
      result: parseEvents(tx.events),
    }
  }

  return {
    status: "failed",
    error: String(tx.code) || "Transaction failed",
  }
}
