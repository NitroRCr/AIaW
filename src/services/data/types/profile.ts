import { Avatar } from "@/shared/utils"
import { dtoToEntity } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type Profile = DtoToEntity<Omit<DbProfileRow, 'avatar'>> & {
  avatar: Avatar
}

type DbUserProfile = {
  user_id: string
  profile: DbProfileRow
}

type UserProfile = OverrideProps<DtoToEntity<DbUserProfile>, {
  profile: Profile
}>

const mapDbToProfile = (dbProfile: DbProfileRow) =>
  dtoToEntity(dbProfile) as Profile

const mapDbToUserProfile = (member: DbUserProfile): UserProfile => {
  return {
    ...dtoToEntity(member),
    profile: mapDbToProfile(member.profile),
  }
}

export { mapDbToProfile, mapDbToUserProfile }
export type { Profile, UserProfile }
