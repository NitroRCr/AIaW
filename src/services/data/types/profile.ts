import { Avatar } from "@/shared/utils"
import { mapAvatarOrDefault } from "@/shared/utils/avatar"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type DbProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

type DbProfile = DbProfileRow | DbProfileUpdate

type Profile<T extends DbProfile = DbProfileRow> = OverrideProps<DtoToEntity<T>, {
  avatar: Avatar
}>

type DbUserProfile = {
  user_id: string
  profile: DbProfileRow
}

type UserProfile = OverrideProps<DtoToEntity<DbUserProfile>, {
  profile: Profile
}>

const mapDbToProfile = (dbProfile: DbProfile) =>
  mapAvatarOrDefault(dtoToEntity(dbProfile) as Profile, dbProfile.name)

const mapDbToUserProfile = (member: DbUserProfile): UserProfile => {
  return {
    ...dtoToEntity(member),
    profile: mapDbToProfile(member.profile),
  }
}

const mapProfileToDb = <T extends DbProfile>(profile: Profile<T>): DbProfile =>
  entityToDto(profile) as T

export { mapDbToProfile, mapDbToUserProfile, mapProfileToDb }
export type { Profile, UserProfile, DbProfileUpdate }
