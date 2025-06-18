import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "@/services/data/supabase/database.types"

type DbStoredItemRow = Database["public"]["Tables"]["stored_items"]["Row"]
type DbStoredItemInsert = Database["public"]["Tables"]["stored_items"]["Insert"]
type DbStoredItemUpdate = Database["public"]["Tables"]["stored_items"]["Update"]

type DbStoredItem = DbStoredItemRow | DbStoredItemInsert | DbStoredItemUpdate

type StoredItemContentType = "image" | "file" | "text" | "quote"

type StoredItemMap = {
  type: StoredItemContentType
}

type StoredItem<T extends DbStoredItem = DbStoredItemRow> = OverrideProps<DtoToEntity<T>, StoredItemMap>

type StoredItemResult = {
  type?: StoredItemContentType
  contentText?: string
  fileUrl?: string
  mimeType?: string
}

const mapDbToStoredItem = (dbStoredItem: DbStoredItemRow): StoredItem =>
   dtoToEntity(dbStoredItem) as StoredItem

const mapStoredItemToDb = <T extends DbStoredItem>(storedItem: StoredItem<T>): T =>
   entityToDto(storedItem) as T

export { mapDbToStoredItem, mapStoredItemToDb }

export type {
  StoredItem, StoredItemResult,
  DbStoredItemRow, DbStoredItemInsert, DbStoredItemUpdate, DbStoredItem
}
