import { LobeChatPluginManifest } from "@lobehub/chat-plugin-sdk"
import { defineStore, storeToRefs } from "pinia"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

import { IsTauri } from "@/shared/utils/platformApi"
import {
  GradioPluginManifest,
  HuggingPluginManifest,
  McpPluginDump,
  McpPluginManifest,
} from "@/shared/utils/types"

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

import { supabase } from "@/services/supabase/client"
import { UserPlugin } from "@/services/supabase/types"

import { useUserPluginsStore } from "./userPlugins"

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

    installedPlugins.value = data // .map(i => ({ ...i, manifest: i.manifest as PluginManifest }))
  }

  async function upsertPlugin (plugin: Omit<UserPlugin, "user_id">) {
    const { data, error } = await supabase
      .from("user_plugins")
      .upsert(plugin)
      .select()
      .single()

    if (error) {
      console.error("❌ Failed to put plugin:", error.message)

      return
    }

    if (installedPlugins.value.find((i) => i.id === plugin.id)) {
      installedPlugins.value = installedPlugins.value.map((i) =>
        i.id === plugin.id ? data : i
      )
    } else {
      installedPlugins.value.push(data)
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
          i.available
        )
      } else if (i.type === "gradio") {
        return buildGradioPlugin(
          i.manifest as GradioPluginManifest,
          i.available
        )
      } else return buildMcpPlugin(i.manifest as McpPluginDump, i.available)
    }),
  ])

  async function installLobePlugin (manifest: LobeChatPluginManifest) {
    const key = `lobe-${manifest.identifier}`
    await upsertPlugin({
      key,
      type: "lobechat",
      available: true,
      manifest,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    data.value[key] = lobeDefaultData(manifest)
  }

  async function installGradioPlugin (manifest: GradioPluginManifest) {
    await upsertPlugin({
      key: manifest.id,
      type: "gradio",
      available: true,
      manifest,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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

    const dump = await dumpMcpPlugin(manifest)
    await upsertPlugin({
      key: manifest.id,
      type: "mcp",
      available: true,
      manifest: dump,
    })
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
