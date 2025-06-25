import { AssistantPlugins, Avatar, Model, ModelSettings, PromptVar, Provider } from "@/shared/types"
import { mapAvatarOrDefault } from "@/shared/utils/avatar"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

import { DbWorkspaceRow, mapDbToWorkspace, Workspace } from "./workspace"

type DbAssistantRow = Database["public"]["Tables"]["user_assistants"]["Row"]
type DbAssistantInsert = Database["public"]["Tables"]["user_assistants"]["Insert"]
type DbAssistantUpdate = Database["public"]["Tables"]["user_assistants"]["Update"]
type DbAssistant = DbAssistantRow | DbAssistantInsert | DbAssistantUpdate

type AssistantSharingType = Database["public"]["Enums"]["assistant_sharing_type"]

type Assistant<T extends DbAssistant = DbAssistantRow> = OverrideProps<DtoToEntity<T>, {
  model: Model
  avatar: Avatar
  promptVars: PromptVar[]
  provider: Provider
  modelSettings: ModelSettings
  plugins: AssistantPlugins
  promptRole: "system" | "user" | "assistant"
  isShared: AssistantSharingType
}>
type AssistantWithParent = Assistant & { parent: Assistant | null, workspace: Workspace | null }
type DbAssistantWithParent = DbAssistantRow & { parent: DbAssistantRow | null, workspace: DbWorkspaceRow | null }

const mapDbToAssistantWithParent = (item: DbAssistantWithParent) => {
  const result = mapDbToAssistant(item) as AssistantWithParent

  result.parent = item.parent ? mapDbToAssistant(item.parent) : null
  result.workspace = item.workspace ? mapDbToWorkspace(item.workspace) : null

  return result
}

const mapDbToAssistant = (item: DbAssistant) => {
  const result = dtoToEntity(item) as Assistant

  return mapAvatarOrDefault(result, result.name)
}

const mapAssistantToDb = (assistant: Partial<Assistant>) =>
   entityToDto(assistant) as DbAssistantInsert | DbAssistantRow

const toAssistant = (item: Partial<AssistantWithParent>): Partial<Assistant> => {
  const { parent, workspace, ...rest } = item

  return {
    ...rest,
  }
}

export { mapDbToAssistant, mapDbToAssistantWithParent, mapAssistantToDb, toAssistant }
export type { Assistant, DbAssistant, DbAssistantUpdate, AssistantWithParent, AssistantSharingType }
