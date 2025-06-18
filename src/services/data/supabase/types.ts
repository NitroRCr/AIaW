import { LanguageModelUsage } from "ai"

import {
  ArtifactVersion,
  AssistantPlugins,
  Avatar,
  Model,
  ModelSettings,
  PromptVar,
  Provider,
} from "@/shared/utils/types"

import { Database } from "./database.types"

type ChatMessage = Database["public"]["Tables"]["messages"]["Row"]
type Chat = Database["public"]["Tables"]["chats"]["Row"]
type ChatMember = Database["public"]["Tables"]["chat_members"]["Row"]
type UserPlugin = Database["public"]["Tables"]["user_plugins"]["Insert"]
type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
type Assistant = Database["public"]["Tables"]["user_assistants"]["Row"]
type Dialog = Database["public"]["Tables"]["dialogs"]["Row"]
type DialogMessage = Database["public"]["Tables"]["dialog_messages"]["Row"]
type MessageContent = Database["public"]["Tables"]["message_contents"]["Row"]
type StoredItem = Database["public"]["Tables"]["stored_items"]["Row"]
type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"]
// type Artifact = Database['public']['Tables']['artifacts']['Row']
type CustomProvider = Database["public"]["Tables"]["custom_providers"]["Row"]
type Subprovider = Database["public"]["Tables"]["subproviders"]["Row"]
type UserData = Database["public"]["Tables"]["user_data"]["Row"]

type SubproviderMapped = Omit<
  Subprovider,
  "custom_provider_id" | "id" | "model_map"
> & {
  id?: string
  custom_provider_id?: string
  model_map: Record<string, string>
  provider: Provider
}

type CustomProviderMapped = CustomProvider & {
  subproviders: SubproviderMapped[]
  fallback_provider: Provider
  avatar: Avatar
}

type UserDataMapped = UserData & {
  value: Record<string, any>
}

type ChatType = Database["public"]["Enums"]["chat_type"]

type ChatMapped = Database["public"]["Tables"]["chats"]["Insert"] & {
  avatar?: Avatar
  type?: ChatType
}

type StoredItemMapped = Omit<
  Database["public"]["Tables"]["stored_items"]["Insert"],
  "message_content_id" | "dialog_id" | "type"
> & {
  dialog_id?: string
  type: "text" | "file" | "quote"
  message_content_id?: string
}

type MessageContentResult = {
  type: StoredItemMapped["type"]
  content_text?: StoredItemMapped["content_text"]
  file_url?: StoredItemMapped["file_url"]
  mime_type?: StoredItemMapped["mime_type"]
}

type WorkspaceMemberRole = "admin" | "member" | "readonly"
type WorkspaceRole = "owner" | "admin" | "member" | "readonly" | "none"

type ProfileMapped = Omit<
  Database["public"]["Tables"]["profiles"]["Row"],
  "avatar"
> & {
  avatar?: Avatar
}

type WorkspaceMapped = Workspace & {
  avatar?: Avatar
  vars?: Record<string, string>
  index_content?: string
}

type ArtifactMapped = Database["public"]["Tables"]["artifacts"]["Insert"] & {
  versions: ArtifactVersion[]
}

type DialogMapped = Omit<Dialog, "msg_tree" | "msg_route"> & {
  assistant: Assistant | null
  model_override: Model | null
  input_vars: Record<string, string>
  msg_tree: Record<string, string[]>
  msg_route: number[]
  usage: LanguageModelUsage | null
}

type ChatMessageWithProfile = ChatMessage & {
  sender: ProfileMapped | null
}

type AssistantMapped = Omit<
  Assistant,
  | "plugins"
  | "model_settings"
  | "model"
  | "provider"
  | "prompt_vars"
  | "avatar"
  | "prompt_role"
> & {
  avatar: Avatar
  prompt_vars: PromptVar[]
  provider: Provider
  model: Model
  model_settings: ModelSettings
  plugins: AssistantPlugins
  prompt_role: "system" | "user" | "assistant"
}

type MessageContentMapped = Omit<
  Database["public"]["Tables"]["message_contents"]["Insert"],
  "message_id" | "stored_items" | "result"
> & {
  stored_items?: StoredItemMapped[]
  message_id?: string
  result?: MessageContentResult[]
}

type DialogMessageStatus =
  | "pending"
  | "streaming"
  | "failed"
  | "default"
  | "inputing"
  | "processed"

type DialogMessageMapped = DialogMessage & {
  message_contents: MessageContentMapped[]
  usage: LanguageModelUsage | null
  status: DialogMessageStatus
}

type WorkspaceMemberMapped = WorkspaceMember & {
  profile: ProfileMapped
}

// TODO: refactor this
type StoredItemInput = Omit<
  Database["public"]["Tables"]["stored_items"]["Insert"],
  "message_content_id" | "dialog_id"
>
type MessageContentInput = Omit<
  Database["public"]["Tables"]["message_contents"]["Insert"],
  "message_id"
> & { stored_items?: StoredItemInput[] }
type DialogMessageInput = Omit<
  Database["public"]["Tables"]["dialog_messages"]["Insert"],
  "dialog_id"
> & { message_contents: MessageContentInput[] }
type DialogInput = Database["public"]["Tables"]["dialogs"]["Insert"]

export type {
  ChatMessageWithProfile,
  Chat,
  ChatMember,
  WorkspaceMapped,
  ArtifactMapped,
  ArtifactVersion,
  Workspace,
  UserPlugin,
  Assistant,
  AssistantMapped,
  ChatMessage,
  Dialog,
  DialogMessage,
  MessageContent,
  WorkspaceMember,
  StoredItem,
  DialogMessageMapped,
  MessageContentMapped,
  DialogMapped,
  StoredItemMapped,
  CustomProviderMapped,
  SubproviderMapped,
  UserDataMapped,
  WorkspaceMemberRole,
  WorkspaceMemberMapped,
  WorkspaceRole,
  ChatMapped,
  ProfileMapped,
  MessageContentResult,
  // TODO: refactor this
  DialogMessageInput,
  DialogInput,
  MessageContentInput,
  StoredItemInput,
}
