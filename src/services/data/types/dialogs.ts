import { Model } from "@/shared/types"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

import { Assistant } from "./assistant"

type DbDialogRow = Database["public"]["Tables"]["dialogs"]["Row"]
type DbDialogInsert = Database["public"]["Tables"]["dialogs"]["Insert"]
type DbDialog = DbDialogRow | DbDialogInsert

type DialogMap = {
  modelOverride: Model
  inputVars?: Record<string, string>
  assistant: Assistant
}

type Dialog<T extends DbDialog = DbDialogRow> = OverrideProps<DtoToEntity<T>, DialogMap>

const mapDbToDialog = (dbDialog: DbDialog) =>
  dtoToEntity(dbDialog) as Dialog

const mapDialogToDb = <T extends DbDialog = DbDialogRow>(dialog: Dialog<T>): T =>
  entityToDto(dialog) as T

export { mapDbToDialog, mapDialogToDb }
export type { DbDialogInsert, Dialog }
