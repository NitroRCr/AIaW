import { StoredItem, StoredItemResult } from "@/services/data/types/storedItem"

type UserMessageContent = {
  id: string
  type: "user-message"
  text: string
  storedItems: StoredItem[]
}

type AssistantMessageContent = {
  type: "assistant-message"
  text: string
  reasoning?: string
}

type AssistantToolContent = {
  type: "assistant-tool"
  pluginId: string
  name: string
  args: any
  result?: StoredItemResult[]
  status: "calling" | "failed" | "completed"
  error?: string
}

export type {
  UserMessageContent,
  AssistantMessageContent,
  AssistantToolContent,
}
