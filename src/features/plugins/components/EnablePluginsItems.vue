<template>
  <q-item
    v-for="plugin in pluginsStore.plugins.filter(
      (p) => p.available && (p.apis.length || p.prompt)
    )"
    :key="plugin.id"
    :clickable="dense"
    @click="dense && setPlugin(plugin, !assistant.plugins[plugin.id]?.enabled)"
  >
    <q-item-section
      avatar
      v-if="pluginsStore.data[plugin.id]"
      min-w-0
    >
      <a-avatar
        :avatar="pluginsStore.data[plugin.id].avatar"
        :size="dense ? '32px' : '40px'"
      />
    </q-item-section>
    <q-item-section>
      <q-item-label>
        {{ plugin.title
        }}<plugin-type-badge
          v-if="!dense"
          :type="plugin.type"
          ml-2
          lh="1.1em"
        />
      </q-item-label>
      <q-item-label
        caption
        v-if="!dense"
      >
        {{ plugin.description }}
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <div
        flex
        items-center
      >
        <q-btn
          flat
          dense
          round
          icon="sym_o_tune"
          :to="`${assistant.id}/plugins/${plugin.id}`"
          v-if="assistant.plugins[plugin.id]?.enabled && !dense"
          :title="$t('assistantView.pluginFunction')"
          mr-2
        />
        <q-checkbox
          :model-value="!!assistant.plugins[plugin.id]?.enabled"
          @update:model-value="setPlugin(plugin, $event)"
          :dense
        />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { toRaw } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { syncRef } from "@/shared/composables"
import { AssistantPlugin, Plugin } from "@/shared/types"

import { useAssistantsStore } from "@/features/assistants/store"
import PluginTypeBadge from "@/features/plugins/components/PluginTypeBadge.vue"
import { usePluginsStore } from "@/features/plugins/store"

import { Assistant } from "@/services/data/types/assistant"

const props = defineProps<{
  assistantId: string
  dense?: boolean
}>()

const store = useAssistantsStore()

const assistant = syncRef<Assistant>(
  () => store.assistants.find((a) => a.id === props.assistantId),
  (val) => {
    store.put(toRaw(val))
  },
  { valueDeep: true }
)
const pluginsStore = usePluginsStore()

function setPlugin (plugin: Plugin, enabled: boolean) {
  if (enabled && !assistant.value.plugins[plugin.id]) {
    const assistantPlugin: AssistantPlugin = {
      enabled: true,
      infos: [],
      tools: [],
      resources: [],
      vars: {},
    }
    plugin.apis.forEach((api) => {
      if (api.type === "tool") {
        assistantPlugin.tools.push({
          name: api.name,
          enabled: true,
        })
      } else if (api.type === "info") {
        assistantPlugin.infos.push({
          name: api.name,
          enabled: true,
          args: {},
        })
      }
    })
    assistant.value.plugins[plugin.id] = assistantPlugin
  } else {
    assistant.value.plugins[plugin.id].enabled = enabled
  }
}
</script>
