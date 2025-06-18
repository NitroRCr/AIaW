<template>
  <template
    v-for="(sch, key) in schema.properties"
    :key="key"
  >
    <json-input
      v-if="sch.type === 'object'"
      :schema="sch as PluginSchema"
      :prefix="key as string"
      :component
      :lazy
      v-model="model[key] as unknown as Model"
      :input-props
    />
    <unified-input
      v-else
      :type="sch.type as any"
      :options="sch.enum as any"
      :label="sch.title || (key as string)"
      :description="sch.description"
      :component
      :lazy
      v-model="model[key] as any"
      :input-props="{
        type: sch.format === 'password' ? 'password' : undefined,
        placeholder: sch.default,
        ...inputProps,
      }"
      :item-props
    />
  </template>
</template>

<script setup lang="ts">
import { PluginSchema } from "@lobehub/chat-plugin-sdk"

import UnifiedInput from "./UnifiedInput.vue"

defineProps<{
  schema: PluginSchema
  prefix?: string
  component: "input" | "item"
  inputProps?: Record<string, any>
  itemProps?: Record<string, any>
  lazy?: boolean
}>()

interface Model {
  [key: string]: string | number | boolean | string[]
}

const model = defineModel<Model>()
model.value ??= {}
</script>
