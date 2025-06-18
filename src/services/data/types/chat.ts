import { Avatar } from "@/shared/utils"
import { mapAvatarOrDefault } from "@/shared/utils/avatar"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { OverrideProps, DtoToEntity } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

import { Profile } from "./profile"

type DbChatMessageRow = Database["public"]["Tables"]["messages"]["Row"]
type DbChatMessageInsert = Database["public"]["Tables"]["messages"]["Insert"]
type DbChatMessage = DbChatMessageRow | DbChatMessageInsert

type DbChatRow = Database["public"]["Tables"]["chats"]["Row"]
type DbChatInsert = Database["public"]["Tables"]["chats"]["Insert"]
type DbChat = DbChatRow | DbChatInsert

// type DbChatMember = Database["public"]["Tables"]["chat_members"]["Row"]

type ChatType = Database["public"]["Enums"]["chat_type"]

type ChatMap = {
  avatar: Avatar
}

type Chat<T extends DbChat = DbChatRow> = OverrideProps<DtoToEntity<T>, ChatMap>

type ChatMessage<T extends DbChatMessage = DbChatMessageRow> = DtoToEntity<T> & {
  sender: Profile | null
}

const mapDbToChat = (chat: DbChat) => {
  const result = dtoToEntity(chat) as Chat

  return mapAvatarOrDefault(result, result.name)
}

const mapDbToChatMessage = <T extends DbChatMessage>(message: T) => {
  return dtoToEntity(message) as ChatMessage<T>
}

const mapChatMessageToDb = <T extends DbChatMessage = DbChatMessageRow>(item: ChatMessage<T>) => {
  const { sender, ...rest } = item

  return { ...entityToDto(rest), sender }
}

export { mapDbToChat, mapDbToChatMessage, mapChatMessageToDb }
export type {
  Chat, ChatMessage, ChatType,
  DbChatInsert, DbChatMessageInsert
}
