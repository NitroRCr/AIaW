import { LobeChatPluginManifest } from "@lobehub/chat-plugin-sdk"
import { defineStore, storeToRefs } from "pinia"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

import {
  GradioPluginManifest,
  HuggingPluginManifest,
  McpPluginDump,
  McpPluginManifest,
} from "@/shared/types"
import { IsTauri } from "@/shared/utils/platformApi"

import { useAssistantsStore } from "@/features/assistants/store"
import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"
import artifacts from "@/features/plugins/buildin/artifactsPlugin"
import authzPlugin from "@/features/plugins/buildin/cosmosAuthz"
import { keplerPlugin } from "@/features/plugins/buildin/keplerPlugin"
import webSearchPlugin from "@/features/plugins/buildin/webSearchPlugin"
import {
  buildGradioPlugin,
  buildLobePlugin,
  buildMcpPlugin,
  calculatorPlugin,
  docParsePlugin,
  dumpMcpPlugin,
  emotionsPlugin,
  fluxPlugin,
  gradioDefaultData,
  huggingToGradio,
  lobeDefaultData,
  mcpDefaultData,
  mermaidPlugin,
  timePlugin,
  videoTranscriptPlugin,
  whisperPlugin,
} from "@/features/plugins/utils/plugins"

import { supabase } from "@/services/data/supabase/client"
import { mapDbToUserPlugin, mapUserPluginToDb, UserPlugin, DbUserPluginInsert } from "@/services/data/types/plugins"

import { useUserPluginsStore } from "./userPlugins"

/**
 * Store for managing plugins in the application
 *
 * This store handles plugin installation, availability, and management.
 * It integrates with the assistants store to manage assistant-plugin associations.
 *
 * @dependencies
 * - {@link useAssistantsStore} - For updating assistant plugins
 * - {@link useUserPluginsStore} - For plugin data storage
 * - {@link useUserLoginCallback} - For initialization after login
 *
 * @database
 * - Table: "user_plugins" - Stores installed plugin data
 */
export const usePluginsStore = defineStore("plugins", () => {
  const assistantsStore = useAssistantsStore()
  const installedPlugins = ref<UserPlugin[]>([])
  const isLoaded = ref(false)

  async function fetchPlugins () {
    const { data, error } = await supabase
      .from("user_plugins")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Failed to fetch chats:", error.message)

      return
    }

    installedPlugins.value = data.map(mapDbToUserPlugin) // .map(i => ({ ...i, manifest: i.manifest as PluginManifest }))
  }

  async function upsertPlugin(plugin: UserPlugin<DbUserPluginInsert>) {
    const { data, error } = await supabase
      .from("user_plugins")
      .upsert(mapUserPluginToDb(plugin) as DbUserPluginInsert)
      .select()
      .single()

    if (error) {
      console.error("❌ Failed to put plugin:", error.message)

      return
    }

    if (installedPlugins.value.find((i) => i.id === plugin.id)) {
      installedPlugins.value = installedPlugins.value.map((i) =>
        i.id === plugin.id ? mapDbToUserPlugin(data) : i
      )
    } else {
      installedPlugins.value.push(mapDbToUserPlugin(data))
    }

    return data.id
  }

  // async function deletePlugin (id: string) {
  //   const { error } = await supabase.from("user_plugins").delete().eq("id", id)

  //   if (error) {
  //     console.error("❌ Failed to delete plugin:", error.message)

  //     return
  //   }

  //   installedPlugins.value = installedPlugins.value.filter((i) => i.id !== id)
  // }

  const availableKeys = computed(() =>
    installedPlugins.value.filter((i) => i.available).map((i) => i.key)
  )
  const { data, ready } = storeToRefs(useUserPluginsStore())

  const plugins = computed(() => [
    webSearchPlugin.plugin,
    calculatorPlugin,
    videoTranscriptPlugin,
    whisperPlugin,
    fluxPlugin,
    emotionsPlugin,
    mermaidPlugin,
    docParsePlugin,
    timePlugin,
    keplerPlugin,
    artifacts.plugin,
    authzPlugin,
    ...installedPlugins.value.map((i) => {
      if (i.type === "lobechat") {
        return buildLobePlugin(
          i.manifest as LobeChatPluginManifest,
          { available: i.available }
        )
      } else if (i.type === "gradio") {
        return buildGradioPlugin(
          i.manifest as GradioPluginManifest,
          { available: i.available }
        )
      } else {
        return buildMcpPlugin(
        i.manifest as McpPluginDump,
        { available: i.available }
        )
      }
    }),
  ])

  async function installLobePlugin (manifest: LobeChatPluginManifest) {
    const key = `lobe-${manifest.identifier}`
    await upsertPlugin({
      key,
      type: "lobechat",
      available: true,
      manifest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    data.value[key] = lobeDefaultData(manifest)
  }

  async function installGradioPlugin (manifest: GradioPluginManifest) {
    await upsertPlugin({
      key: manifest.id,
      type: "gradio",
      available: true,
      manifest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as UserPlugin<DbUserPluginInsert>)
    data.value[manifest.id] = gradioDefaultData(manifest)
  }

  async function installHuggingPlugin (manifest: HuggingPluginManifest) {
    await installGradioPlugin(huggingToGradio(manifest))
  }

  const { t } = useI18n()

  async function installMcpPlugin (manifest: McpPluginManifest) {
    if (manifest.transport.type === "stdio" && !IsTauri) {
      throw new Error(t("stores.plugins.stdioRequireDesktop"))
    }

    const dump = await dumpMcpPlugin(manifest, { includeCapabilities: true })
    await upsertPlugin({
      key: manifest.id,
      type: "mcp",
      available: true,
      manifest: dump,
    } as UserPlugin<DbUserPluginInsert>)
    data.value[manifest.id] = mcpDefaultData(manifest)
  }

  async function uninstall (key: string) {
    // const plugin = installedPlugins.value.find(i => i.key === id)
    // if (!plugin) {
    //   console.error('❌ Plugin not found:', id)
    //   return
    // }
    const { error } = await supabase
      .from("user_plugins")
      .update({ available: false })
      .eq("key", key)

    if (error) {
      console.error(`❌ Failed to uninstall plugin: ${key}`, error.message)

      return
    }

    for (const assistant of assistantsStore.assistants) {
      if (assistant.plugins[key]) {
        assistantsStore.update(assistant.id, {
          plugins: { ...assistant.plugins, [key]: undefined },
        })
      }
    }
    installedPlugins.value = installedPlugins.value.filter((i) => i.key !== key)
  }

  async function init () {
    isLoaded.value = false
    installedPlugins.value = []
    await fetchPlugins()
    isLoaded.value = true
  }

  useUserLoginCallback(init)

  return {
    data,
    isLoaded: computed(() => ready.value && isLoaded.value),
    plugins,
    availableKeys,
    installLobePlugin,
    installHuggingPlugin,
    installGradioPlugin,
    installMcpPlugin,
    uninstall,
  }
})
