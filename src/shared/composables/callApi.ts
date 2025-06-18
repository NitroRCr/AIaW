import { Schema, Validator } from "@cfworker/json-schema"
import { Ref, toRaw } from "vue"
import { useI18n } from "vue-i18n"

import { removeUndefinedProps } from "@/shared/utils/functions"
import { ApiResultItem, Plugin, PluginApi } from "@/shared/utils/types"

import { usePluginsStore } from "@/features/plugins/store"

export function useCallApi (
  workspaceId: Ref<string>,
  dialogId: Ref<string>
) {
  const pluginsStore = usePluginsStore()
  const { t } = useI18n()

  function getPluginSettings (plugin: Plugin) {
    const settings = toRaw(pluginsStore.data[plugin.id].settings)

    if (plugin.settings.properties._workspaceId) {
      settings._workspaceId = workspaceId.value
    }

    if (plugin.settings.properties._dialogId) {
      settings._dialogId = dialogId.value
    }

    removeUndefinedProps(settings)
    const { valid } = new Validator(plugin.settings as Schema).validate(
      settings
    )

    return { valid, settings }
  }

  async function callApi (
    plugin: Plugin,
    api: PluginApi,
    args: Record<string, any>
  ): Promise<{ result?: ApiResultItem[]; error?: string }> {
    const { valid: argValid } = new Validator(
      api.parameters as Schema
    ).validate(args)

    if (!argValid) {
      return { result: [], error: t("callApi.argValidationFailed") }
    }

    const { valid: SettingsValid, settings } = getPluginSettings(plugin)

    if (!SettingsValid) {
      return { result: [], error: t("callApi.settingsValidationFailed") }
    }

    try {
      const result = await api.execute(args, settings)

      return { result, error: null }
    } catch (e) {
      return { result: [], error: e.message }
    }
  }

  return { callApi }
}
