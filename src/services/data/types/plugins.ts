import { PluginManifest } from "@/shared/utils"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbUserPluginRow = Database["public"]["Tables"]["user_plugins"]["Row"]
type DbUserPluginInsert = Database["public"]["Tables"]["user_plugins"]["Insert"]
type DbUserPluginUpdate = Database["public"]["Tables"]["user_plugins"]["Update"]
type DbUserPlugin = DbUserPluginRow | DbUserPluginInsert | DbUserPluginUpdate
type UserPlugin<T extends DbUserPlugin = DbUserPluginRow> = DtoToEntity<T>

const mapDbToUserPlugin = (dbUserPlugin: DbUserPluginRow) => {
  return {
    ...dtoToEntity(dbUserPlugin),
    manifest: dbUserPlugin.manifest as PluginManifest,
  }
}

const mapUserPluginToDb = <T extends DbUserPlugin> (userPlugin: UserPlugin<T>) => entityToDto(userPlugin)

export { mapDbToUserPlugin, mapUserPluginToDb }

export type { UserPlugin, DbUserPluginInsert }
