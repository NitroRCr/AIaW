import { DtoToEntity } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbUserData = Database["public"]["Tables"]["user_data"]["Row"]

type UserData = DtoToEntity<DbUserData> & {
  value: Record<string, any>
}

export type { UserData, DbUserData }
