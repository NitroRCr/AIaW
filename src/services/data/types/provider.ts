import { Avatar, Provider } from "@/shared/utils"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbCustomProviderRow = Database["public"]["Tables"]["custom_providers"]["Row"]
type DbCustomProviderInsert = Database["public"]["Tables"]["custom_providers"]["Insert"]
type DbCustomProvider = DbCustomProviderRow | DbCustomProviderInsert

type DbSubproviderInsert = Database["public"]["Tables"]["subproviders"]["Insert"]
type DbSubproviderRow = Database["public"]["Tables"]["subproviders"]["Row"]
type DbSubprovider = DbSubproviderRow | DbSubproviderInsert

type DbCustomProviderWithSubproviders = DbCustomProviderRow & {
  subproviders: DbSubproviderRow[]
}

type Subprovider<T extends DbSubprovider = DbSubprovider> = OverrideProps<DtoToEntity<T>, {
  provider: Provider
  modelMap: Record<string, string>
}>

type CustomProvider<T extends DbCustomProvider = DbCustomProvider> = OverrideProps<DtoToEntity<T>, {
  avatar: Avatar
  fallbackProvider: Provider
}> & {
  subproviders: Subprovider[]
}

const mapDbToSubprovider = (dbSubprovider: DbSubproviderRow) => {
  return {
    ...dtoToEntity(dbSubprovider),
    provider: dtoToEntity(dbSubprovider.provider) as Provider,
  } as Subprovider
}

const mapSubproviderToDb = (providerId: string, subprovider: Subprovider) => {
  return {
    ...entityToDto(subprovider),
    custom_provider_id: providerId,
  }
}

const mapDbToCustomProvider = (item: DbCustomProviderWithSubproviders) => {
  const entity = dtoToEntity(item)

  return {
    ...entity,
    avatar: entity.avatar ? entity.avatar : {
      type: "icon",
      icon: "sym_o_dashboard_customize",
      hue: Math.floor(Math.random() * 360),
    },
    fallbackProvider: entity.fallbackProvider ? entity.fallbackProvider : null,
    subproviders: item.subproviders.map(mapDbToSubprovider),
  } as CustomProvider
}

const mapCustomProviderToDb = (customProvider: CustomProvider) => {
  return {
    ...entityToDto(customProvider),
    subproviders: customProvider.subproviders.map((sp) => mapSubproviderToDb(customProvider.id, sp)),
  }
}

export { mapDbToCustomProvider, mapCustomProviderToDb, mapDbToSubprovider, mapSubproviderToDb }

export type { CustomProvider, Subprovider }
