import { AssistantPlugins, Avatar, Model, ModelSettings, PromptVar, Provider } from "@/shared/types"
import { mapAvatarOrDefault } from "@/shared/utils/avatar"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbAssistantRow = Database["public"]["Tables"]["user_assistants"]["Row"]
type DbAssistantInsert = Database["public"]["Tables"]["user_assistants"]["Insert"]
type DbAssistantUpdate = Database["public"]["Tables"]["user_assistants"]["Update"]
type DbAssistant = DbAssistantRow | DbAssistantInsert | DbAssistantUpdate

type Assistant<T extends DbAssistant = DbAssistantRow> = OverrideProps<DtoToEntity<T>, {
  model: Model
  avatar: Avatar
  promptVars: PromptVar[]
  provider: Provider
  modelSettings: ModelSettings
  plugins: AssistantPlugins
  promptRole: "system" | "user" | "assistant"
}>

const mapDbToAssistant = (item: DbAssistant) => {
  const result = dtoToEntity(item) as Assistant

  return mapAvatarOrDefault(result, result.name)
}

const mapAssistantToDb = (assistant: Partial<Assistant>) =>
   entityToDto(assistant) as DbAssistantInsert | DbAssistantRow

export { mapDbToAssistant, mapAssistantToDb }
export type { Assistant, DbAssistant, DbAssistantUpdate }
