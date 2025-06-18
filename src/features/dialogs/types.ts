import { StoredItemMapped } from "@/services/supabase/types"

type UserMessageContent = {
  type: "user-message"
  text: string
  stored_items: StoredItemMapped[]
}

type AssistantMessageContent = {
  type: "assistant-message"
  text: string
  reasoning?: string
}

type AssistantToolContent = {
  type: "assistant-tool"
  plugin_id: string
  name: string
  args: any
  result?: any[]
  status: "calling" | "failed" | "completed"
  error?: string
}

export type {
  UserMessageContent,
  AssistantMessageContent,
  AssistantToolContent,
}
