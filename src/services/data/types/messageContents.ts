import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps, TContentNested } from "@/shared/utils/dto/types"

import { Database } from "@/services/data/supabase/database.types"

import { mapDbToStoredItem, StoredItemResult, DbStoredItem, StoredItem, DbStoredItemUpdate, DbStoredItemRow } from "./storedItem"

type DbMessageContentRow = Database["public"]["Tables"]["message_contents"]["Row"]
type DbMessageContentInsert = Database["public"]["Tables"]["message_contents"]["Insert"]
type DbMessageContentUpdate = Database["public"]["Tables"]["message_contents"]["Update"]

type DbMessageContent = DbMessageContentRow | DbMessageContentInsert | DbMessageContentUpdate

type MessageContentResult = StoredItemResult

type DbMessageContentNested<T extends DbMessageContent = DbMessageContentRow,
N extends DbStoredItem = DbStoredItemRow> =
  TContentNested<T, N, "stored_items">

type MessageContent<T extends DbMessageContent = DbMessageContentRow> = OverrideProps<DtoToEntity<T>, {
  result: MessageContentResult[] | null
  args: Record<string, any> | any[] | null
}>

type MessageContentNested<T extends DbMessageContent = DbMessageContentRow,
N extends DbStoredItem = DbStoredItemRow> =
  TContentNested<MessageContent<T>,
  StoredItem<N>,
  "storedItems">

type MessageContentNestedUpdate = MessageContentNested<DbMessageContentUpdate, DbStoredItemUpdate>

const mapDbToMessageContent = <T extends DbMessageContent>(item: T) =>
  dtoToEntity(item) as unknown as MessageContent<DbMessageContentRow>

const mapDbToMessageContentNested = <T extends DbMessageContent>(item: DbMessageContentNested<T>) => {
  const { stored_items, ...messageContent } = item

  const result = dtoToEntity({
    ...mapDbToMessageContent(messageContent),
    storedItems: stored_items.map(mapDbToStoredItem)
  }) as MessageContentNested<DbMessageContentRow>

  return result
}

const mapMessageContentToDb = <T extends DbMessageContent>(messageContent: MessageContent<T>) => {
  return entityToDto(messageContent) as T
}

export { mapMessageContentToDb, mapDbToMessageContentNested }

export type {
  MessageContentNested, MessageContentNestedUpdate,
  DbMessageContentRow, DbMessageContentInsert, DbMessageContentUpdate, DbMessageContent, MessageContent
}
