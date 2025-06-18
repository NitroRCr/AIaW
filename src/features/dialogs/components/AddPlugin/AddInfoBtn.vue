<template>
  <q-btn
    v-if="pluginInfos.length"
    icon="sym_o_attachment"
  >
    <q-menu>
      <q-list>
        <template
          v-for="{ plugin, apis } of pluginInfos"
          :key="plugin.id"
        >
          <q-item-label
            header
            py-2
          >
            {{ plugin.title }}
          </q-item-label>
          <q-item
            v-for="api of apis"
            :key="api.name"
            min-h="40px"
            clickable
            @click="call(plugin, api)"
            v-close-popup
            max-w="300px"
          >
            <q-item-section avatar>
              <q-icon
                :name="
                  api.infoType === 'resource'
                    ? 'sym_o_description'
                    : 'sym_o_prompt_suggestion'
                "
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>
                {{ api.name }}
              </q-item-label>
              <q-item-label
                v-if="api.description"
                caption
                lines="2"
              >
                {{ api.description }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, toRef } from "vue"
import { useI18n } from "vue-i18n"

import { useCallApi } from "@/shared/composables/callApi"
import {
  ApiResultItem,
  AssistantPlugins,
  Plugin,
  PluginApi,
} from "@/shared/types"

import JsonInputDialog from "./JsonInputDialog.vue"

const props = defineProps<{
  plugins: Plugin[]
  assistantPlugins: AssistantPlugins,
  dialogId: string,
  workspaceId: string
}>()

const pluginInfos = computed<{ plugin: Plugin; apis: PluginApi[] }[]>(() =>
  props.plugins
    .map((p) => ({
      plugin: p,
      apis: p.apis.filter((a) => {
        const plugin = props.assistantPlugins[p.id]

        return (
          a.type === "info" &&
          ["resource", "prompt"].includes(a.infoType) &&
          plugin?.infos.some((i) => i.name === a.name && i.enabled)
        )
      }),
    }))
    .filter((p) => p.apis.length)
)

const $q = useQuasar()
const { callApi } = useCallApi(toRef(props, "workspaceId"), toRef(props, "dialogId"))
const { t } = useI18n()

function handleResult (res: Awaited<ReturnType<typeof callApi>>) {
  console.log("[--- handleResult", res)
  res.error &&
    $q.notify({
      message: res.error,
      color: "negative",
    })
  res.result && emit("add", res.result)
}

function call (plugin: Plugin, api: PluginApi) {
  if (!Object.keys(api.parameters.properties).length) {
    callApi(plugin, api, {}).then(handleResult)
  } else {
    const { args } = props.assistantPlugins[plugin.id].infos.find(
      (i) => i.name === api.name
    )
    $q.dialog({
      component: JsonInputDialog,
      componentProps: {
        title: t("addInfoBtn.parameter"),
        schema: api.parameters,
        model: args,
      },
    }).onOk((args) => {
      callApi(plugin, api, args).then(handleResult)
    })
  }
}

const emit = defineEmits<{
  add: [ApiResultItem[]]
}>()
</script>
