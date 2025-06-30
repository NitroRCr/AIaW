import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database, Json } from "../supabase/database.types"

type DbUserSettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"]
type DbUserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]
type DbUserSettingsUpdate = Database["public"]["Tables"]["user_settings"]["Update"]
type DbUserSettings = DbUserSettingsRow | DbUserSettingsInsert | DbUserSettingsUpdate

type UserSettingsMap = {
  value: Json
  schemaDefinition: Json
  tags: string[]
}

type UserSettings<T extends DbUserSettings = DbUserSettingsRow> = OverrideProps<DtoToEntity<T>, UserSettingsMap>

const mapDbToUserSettings = <T extends DbUserSettingsRow>(dbUserSettings: T) => dtoToEntity(dbUserSettings) as UserSettings

const mapUserSettingsToDb = <T extends DbUserSettings>(userSettings: UserSettings<T>): T =>
   entityToDto(userSettings) as T

export { mapDbToUserSettings, mapUserSettingsToDb }
export type { DbUserSettingsInsert, DbUserSettings, DbUserSettingsUpdate, UserSettings }
