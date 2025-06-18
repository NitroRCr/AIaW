<template>
  <q-badge
    :label
    :class="{
      'bg-pri-c text-on-pri-c': props.type === 'builtin',
      'bg-50-48-90-a text-50-48-10-a': props.type === 'lobechat',
      'bg-90-48-90-a text-90-48-10-a': props.type === 'gradio',
      'bg-250-48-90-a text-250-48-10-a': props.type === 'mcp',
    }"
  />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import { Plugin } from "@/shared/utils/types"

const props = defineProps<{
  type: Plugin["type"]
}>()

const { t } = useI18n()

const label = computed(() => {
  switch (props.type) {
    case "builtin":
      return t("pluginTypeBadge.builtin")
    case "lobechat":
      return t("pluginTypeBadge.lobechat")
    case "gradio":
      return t("pluginTypeBadge.gradio")
    case "mcp":
      return t("pluginTypeBadge.mcp")
    default:
      return ""
  }
})
</script>
