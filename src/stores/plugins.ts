import { LobeChatPluginManifest } from '@lobehub/chat-plugin-sdk'
import { defineStore } from 'pinia'
import { useLiveQuery } from 'src/composables/live-query'
import { persistentReactive } from 'src/composables/persistent-reactive'
import { db } from 'src/utils/db'
import { GradioPluginManifest, HuggingPluginManifest, InstalledPlugin, McpPluginManifest, PluginsData } from 'src/utils/types'
import { buildLobePlugin, timePlugin, defaultData, whisperPlugin, videoTranscriptPlugin, buildGradioPlugin, calculatorPlugin, huggingToGradio, fluxPlugin, lobeDefaultData, gradioDefaultData, emotionsPlugin, mermaidPlugin, mcpDefaultData, dumpMcpPlugin, buildMcpPlugin } from 'src/utils/plugins'
import { computed } from 'vue'
import { genId } from 'src/utils/functions'
import artifacts from 'src/utils/artifacts-plugin'
import { IsTauri } from 'src/utils/platform-api'
import { useI18n } from 'vue-i18n'
import webSearchPlugin from 'src/utils/web-search-plugin'
import docParsePlugin from 'src/utils/doc-parse-plugin'

export const usePluginsStore = defineStore('plugins', () => {
  const installed = useLiveQuery(() => db.installedPluginsV2.toArray(), {
    initialValue: [] as InstalledPlugin[]
  })
  const availableIds = computed(() => installed.value.filter(i => i.available).map(i => i.id))
  const [data, ready] = persistentReactive<PluginsData>('#plugins-data', defaultData)
  const plugins = computed(() => [
    webSearchPlugin.plugin,
    calculatorPlugin,
    videoTranscriptPlugin,
    whisperPlugin,
    fluxPlugin,
    emotionsPlugin,
    mermaidPlugin,
    timePlugin,
    docParsePlugin.plugin,
    artifacts.plugin,
    ...installed.value.map(i => {
      if (i.type === 'lobechat') return buildLobePlugin(i.manifest, i.available)
      else if (i.type === 'gradio') return buildGradioPlugin(i.manifest, i.available)
      else return buildMcpPlugin(i.manifest, i.available, () => data[i.id])
    })
  ])

  async function installLobePlugin(manifest: LobeChatPluginManifest) {
    // @ts-expect-error - Dexie transaction doesn't support recursive type inference (LobeChatPluginManifest)
    await db.transaction('rw', db.installedPluginsV2, db.reactives, async () => {
      const id = `lobe-${manifest.identifier}`
      await db.installedPluginsV2.put({
        id,
        key: genId(),
        type: 'lobechat',
        available: true,
        manifest
      })
      await db.reactives.update('#plugins-data', {
        [`value.${id}`]: lobeDefaultData(manifest)
      })
    })
  }

  async function installGradioPlugin(manifest: GradioPluginManifest) {
    await db.transaction('rw', db.installedPluginsV2, db.reactives, async () => {
      await db.installedPluginsV2.put({
        id: manifest.id,
        key: genId(),
        type: 'gradio',
        available: true,
        manifest
      })
      await db.reactives.update('#plugins-data', {
        [`value.${manifest.id}`]: gradioDefaultData(manifest)
      })
    })
  }

  async function installHuggingPlugin(manifest: HuggingPluginManifest) {
    await installGradioPlugin(huggingToGradio(manifest))
  }

  const { t } = useI18n()
  async function installMcpPlugin(manifest: McpPluginManifest) {
    if (manifest.transport.type === 'stdio' && !IsTauri) throw new Error(t('stores.plugins.stdioRequireDesktop'))
    const dump = await dumpMcpPlugin(manifest)
    await db.transaction('rw', db.installedPluginsV2, db.reactives, async () => {
      const plugin = await db.installedPluginsV2.where('id').equals(manifest.id).first()
      if (plugin) {
        await db.installedPluginsV2.update(plugin.key, { type: 'mcp', available: true, manifest: dump })
      } else {
        await db.installedPluginsV2.add({
          id: manifest.id,
          key: genId(),
          type: 'mcp',
          available: true,
          manifest: dump
        })
      }
      await db.reactives.update('#plugins-data', {
        [`value.${manifest.id}`]: mcpDefaultData(manifest)
      })
    })
  }

  async function uninstall(id) {
    await db.transaction('rw', db.installedPluginsV2, db.assistants, async () => {
      await db.installedPluginsV2.where('id').equals(id).modify({ available: false })
      await db.assistants.filter(a => !!a.plugins[id]).modify({ [`plugins.${id}`]: undefined })
    })
  }

  return {
    data,
    ready,
    plugins,
    availableIds,
    installLobePlugin,
    installHuggingPlugin,
    installGradioPlugin,
    installMcpPlugin,
    uninstall
  }
})
