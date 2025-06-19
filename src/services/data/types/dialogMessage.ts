import { LanguageModelUsage } from "ai"

import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps, TContentNested } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

import {
  DbMessageContentRow,
  DbMessageContentUpdate,
  DbMessageContent,
  MessageContentNested
} from "./messageContents"
import { DbStoredItem, DbStoredItemUpdate, DbStoredItemRow } from "./storedItem"

type DbDialogMessageRow = Database["public"]["Tables"]["dialog_messages"]["Row"]
type DbDialogMessageInsert = Database["public"]["Tables"]["dialog_messages"]["Insert"]
type DbDialogMessageUpdate = Database["public"]["Tables"]["dialog_messages"]["Update"]
type DbDialogMessage = DbDialogMessageRow | DbDialogMessageInsert | DbDialogMessageUpdate

type DialogMessageStatus =
  | "pending"
  | "streaming"
  | "failed"
  | "default"
  | "inputing"
  | "processed"

type DialogMessageMap = {
  usage?: LanguageModelUsage
  warnings?: any[]
  type?: "user" | "assistant" | "system"
  status?: DialogMessageStatus
}

type DialogMessage<T extends DbDialogMessage = DbDialogMessageRow> = OverrideProps<DtoToEntity<T>, DialogMessageMap>

type DialogMessageNested<T extends DbDialogMessage = DbDialogMessageRow,
 N extends DbMessageContent = DbMessageContentRow,
 S extends DbStoredItem = DbStoredItemRow> =
  TContentNested<DialogMessage<T>,
  MessageContentNested<N, S>,
  "messageContents">

type DialogMessageNestedUpdate = DialogMessageNested<DbDialogMessageUpdate, DbMessageContentUpdate, DbStoredItemUpdate>

const mapDbToDialogMessage = (dbDialogMessage: DbDialogMessageRow) =>
   dtoToEntity(dbDialogMessage) as DialogMessage

const mapDialogMessageToDb = <T extends DbDialogMessage = DbDialogMessageRow>(dialogMessage: Partial<DialogMessage<T>>): T => {
  return entityToDto(dialogMessage) as T
}

// TODO: fix this
const mapDbToDialogMessageNested = (item: DbDialogMessage) => {
  const result = dtoToEntity(item) as DialogMessageNested

  return result
}

export { mapDbToDialogMessage, mapDialogMessageToDb, mapDbToDialogMessageNested }

export type {
  DialogMessage, DialogMessageNested,
  DbDialogMessageInsert, DbDialogMessageRow, DbDialogMessageUpdate, DialogMessageNestedUpdate
}
