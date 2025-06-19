import { Validator } from "@cfworker/json-schema"
import { useQuasar } from "quasar"
import { toRaw } from "vue"
import { useI18n } from "vue-i18n"

import { MarketAssistantSchema } from "@/shared/types"

import { defaultModelSettings } from "@/features/assistants/consts"
import { useAssistantsStore } from "@/features/assistants/store"
import { AssistantDefaultPrompt } from "@/features/dialogs/utils/dialogTemplateDefinitions"

/**
 * Composable providing actions for managing assistants within workspaces
 *
 * This composable offers methods to add, update, and manage assistants
 * associated with specific workspaces.
 *
 * @returns Object containing assistant management methods
 */
export function useAssistantActions () {
  const assistantsStore = useAssistantsStore()
  const $q = useQuasar()
  const { t } = useI18n()

  /**
   * Adds a new assistant to the specified workspace
   *
   * This method:
   * 1. Validates the assistant data against the MarketAssistantSchema
   * 2. Extracts relevant fields from the assistant data
   * 3. Adds the assistant to the store with default values for optional fields
   * 4. Shows appropriate notification based on success/failure
   *
   * @param item - The assistant data to add
   * @param workspaceId - The ID of the workspace to add the assistant to
   */
  function add (item, workspaceId) {
    if (!new Validator(MarketAssistantSchema).validate(item).valid) {
      $q.notify({
        message: t("assistantsMarket.formatError"),
        color: "negative",
      })

      return
    }

    const {
      name,
      avatar,
      prompt,
      promptVars,
      promptTemplate,
      model,
      modelSettings,
      author,
      homepage,
      description,
    } = toRaw(item)
    assistantsStore
      .add({
        name,
        avatar,
        prompt,
        promptVars: promptVars ?? [],
        promptTemplate: promptTemplate ?? AssistantDefaultPrompt,
        workspaceId,
        model,
        modelSettings: modelSettings ?? { ...defaultModelSettings },
        author,
        homepage,
        description,
      })
      .then(() => {
        $q.notify({
          message: t("assistantsMarket.added"),
        })
      })
      .catch((err) => {
        console.error(err)
        $q.notify({
          message: t("assistantsMarket.addError"),
          color: "negative",
        })
      })
  }

  return {
    add,
  }
}
