<template>
  <div>
    <q-expansion-item
      bg-sur-c-low
      of-hidden
      rd-md
    >
      <template #header>
        <q-item-section avatar>
          <a-avatar
            :avatar="pluginData?.avatar || { type: 'text', text: 'DF' }"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>
            {{ plugin.title }}<code bg-sur-c-high>{{ content.name }}</code>
          </q-item-label>
          <q-item-label caption>
            {{ $t("toolContent.toolCall") }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-spinner
            v-if="content.status === 'calling'"
            size="sm"
          />
          <q-icon
            v-else-if="content.status === 'completed'"
            name="sym_o_check_circle"
            text-suc
          />
          <q-icon
            v-else-if="content.status === 'failed'"
            name="sym_o_error"
            text-err
          />
        </q-item-section>
      </template>
      <template #default>
        <md-preview
          :model-value="contentMd"
          v-bind="mdPreviewProps"
          bg-sur-c-low
        />
      </template>
    </q-expansion-item>
    <div
      v-if="content.result && api?.showComponents"
      mt-1
    >
      <template
        v-for="(component, index) in api.showComponents"
        :key="index"
      >
        <md-preview
          v-if="['markdown', 'textbox'].includes(component)"
          :model-value="content.result[index].contentText"
          v-bind="mdPreviewProps"
          bg-sur-c-low
          rd-md
        />
        <md-preview
          v-else-if="['json', 'code'].includes(component)"
          :model-value="
            wrapCode(
              content.result[index].contentText,
              component === 'json' ? 'json' : ''
            )
          "
          v-bind="mdPreviewProps"
          bg-sur-c-low
          rd-md
        />
        <div v-else-if="component === 'image'">
          <message-image :image="content.result[index]" />
        </div>
        <div v-else-if="component === 'audio'">
          <message-audio :audio="content.result[index]" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from "md-editor-v3"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { useMdPreviewProps } from "@/shared/composables/mdPreviewProps"
import { wrapCode } from "@/shared/utils/functions"

import { AssistantToolContent } from "@/features/dialogs/types"
import { engine } from "@/features/dialogs/utils/templateEngine"
import MessageAudio from "@/features/media/components/MessageAudio.vue"
import MessageImage from "@/features/media/components/MessageImage.vue"
import { usePluginsStore } from "@/features/plugins/store"

import { StoredItem } from "@/services/data/types/storedItem"

const { t } = useI18n()

const props = defineProps<{
  content: AssistantToolContent
}>()

const pluginsStore = usePluginsStore()
const plugin = computed(() =>
  pluginsStore.plugins.find((p) => p.id === props.content.pluginId)
)
const api = computed(() =>
  plugin.value?.apis.find((a) => a.name === props.content.name)
)
const pluginData = computed(() => pluginsStore.data[props.content.pluginId])

const contentTemplate = `### ${t("toolContent.callParams")}

\`\`\`json
{{ content.args | json: 2 }}
\`\`\`

{%- if result %}
### ${t("toolContent.callResult")}

\`\`\`json
{{ result | json: 2 }}
\`\`\`
{%- endif %}

{%- if content.error %}
### ${t("toolContent.errorMessage")}

{{ content.error }}
{%- endif %}
`
const contentMd = computed(() => {
  const { content } = props

  return engine.parseAndRenderSync(contentTemplate, {
    content,
    result: content.result?.map((item) => {
      const {
        name = "",
        type,
        mimeType,
        contentText,
      } = item as StoredItem

      return { name, type, mimeType, contentText }
    }),
  })
})

const mdPreviewProps = useMdPreviewProps()
</script>
