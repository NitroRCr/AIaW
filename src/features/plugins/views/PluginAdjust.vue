<template>
  <view-common-header back-to="..">
    <q-toolbar-title v-if="plugin">
      {{ plugin.title }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container v-if="assistant && plugin">
    <q-page>
      <q-list
        px="xs:2 md:4"
        pt-2
      >
        <template v-if="assistantPlugin.infos.length">
          <q-item>
            <q-item-section
              avatar
              text-sec
              w="xs:120px sm:200px"
            >
              {{ $t("pluginAdjust.infoProvider") }}
            </q-item-section>
            <q-item-section text-on-sur-var>
              {{ $t("pluginAdjust.parameters") }}
            </q-item-section>
            <q-item-section side>
              <div>
                {{ $t("pluginAdjust.enable") }}
              </div>
            </q-item-section>
          </q-item>
          <q-item
            v-for="info of assistantPlugin.infos"
            :key="info.name"
          >
            <q-item-section
              avatar
              w="xs:120px sm:200px"
            >
              <q-item-label>{{ info.name }}</q-item-label>
              <q-item-label caption>
                {{ apiMap[info.name]?.description ?? "" }}
              </q-item-label>
            </q-item-section>
            <q-item-section>
              <json-input
                :schema="apiMap[info.name].parameters"
                v-model="info.args"
                component="input"
              />
            </q-item-section>
            <q-item-section side>
              <q-checkbox v-model="info.enabled" />
            </q-item-section>
          </q-item>
          <q-separator spaced />
        </template>
        <template v-if="assistantPlugin.tools.length">
          <q-item>
            <q-item-section text-sec>
              {{ $t("pluginAdjust.toolCall") }}
            </q-item-section>
            <q-item-section side>
              <div>
                {{ $t("pluginAdjust.enable") }}
              </div>
            </q-item-section>
          </q-item>
          <q-item
            v-for="tool of assistantPlugin.tools"
            :key="tool.name"
          >
            <q-item-section>
              <q-item-label>{{ tool.name }}</q-item-label>
              <q-item-label caption>
                {{ apiMap[tool.name]?.description ?? "" }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-checkbox v-model="tool.enabled" />
            </q-item-section>
          </q-item>
          <q-separator spaced />
        </template>
        <template v-if="plugin.promptVars?.length">
          <q-item>
            <q-item-section text-sec>
              {{ $t("pluginAdjust.variables") }}
            </q-item-section>
          </q-item>
          <prompt-var-input
            v-for="promptVar of plugin.promptVars"
            :key="promptVar.id"
            :prompt-var="promptVar"
            v-model="assistantPlugin.vars[promptVar.name]"
            component="item"
          />
        </template>
        <q-item-label
          caption
          p="x-4 y-2"
          text-on-sur-var
        >
          {{ $t("pluginAdjust.globalSettingsTip") }}
          <router-link
            :to="`/plugins/${plugin.id}`"
            pri-link
          >
            {{ $t("pluginAdjust.pluginSettings") }}
          </router-link>
        </q-item-label>
      </q-list>
      <hint-card
        mt="250px"
        v-if="
          !assistantPlugin.infos.length &&
            !assistantPlugin.tools.length &&
            !assistantPlugin.resources.length &&
            !plugin.promptVars?.length
        "
        img-url="/emotions/nachoneko/7.webp"
        :message="$t('pluginAdjust.noConfigurableItems')"
      />

      <!-- Sticky Save Button -->
      <sticky-save-button
        @click="saveAssistant"
        :loading="assistantsStore.isSaving"
        :disabled="!assistantsStore.hasChanges"
        :tooltip="assistantsStore.hasChanges ? $t('Save changes to assistant') : $t('Changes saved')"
      />
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, toRaw } from "vue"
import { useI18n } from "vue-i18n"

import HintCard from "@/shared/components/HintCard.vue"
import JsonInput from "@/shared/components/input/JsonInput.vue"
import { useSetTitle } from "@/shared/composables/setTitle"
import { PluginApi } from "@/shared/types"

import { useAssistantsStore } from "@/features/assistants/store"
import { usePluginsStore } from "@/features/plugins/store"
import PromptVarInput from "@/features/prompt/components/PromptVarInput.vue"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
import ErrorNotFound from "@/pages/ErrorNotFound.vue"

defineEmits(["toggle-drawer"])

const $q = useQuasar()
const assistantsStore = useAssistantsStore()

const props = defineProps<{
  id: string
  assistantId: string
}>()

const assistant = computed(() =>
  assistantsStore.assistants.find((a) => a.id === props.assistantId)
)

async function saveAssistant() {
  if (!assistant.value) return

  try {
    await assistantsStore.put(toRaw(assistant.value))
    $q.notify({
      type: 'positive',
      message: 'Plugin settings saved'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error saving plugin settings'
    })
  }
}

const pluginsStore = usePluginsStore()
const plugin = computed(() =>
  pluginsStore.plugins.find((p) => p.id === props.id)
)
const assistantPlugin = computed(() => assistant.value?.plugins[props.id])
const apiMap = computed(() => {
  const val: Record<string, PluginApi> = {}
  plugin.value?.apis.forEach((a) => {
    val[a.name] = a
  })

  return val
})

const { t } = useI18n()
useSetTitle(
  computed(
    () =>
      plugin.value &&
      `${t("pluginAdjust.pluginFunction")} - ${plugin.value.title}`
  )
)
</script>
