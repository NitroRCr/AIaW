<template>
  <unified-input
    class="input-item"
    :type="typeMap[promptVar.type]"
    :options="promptVar.options"
    :label="promptVar.label || promptVar.name"
    v-model="model"
    :input-props
    :component
  />
</template>

<script setup lang="ts">
import { PromptVar, PromptVarValue } from 'src/utils/types'
import UnifiedInput from './UnifiedInput.vue'

const props = defineProps<{
  promptVar: PromptVar
  component: 'input' | 'item'
  inputProps?: Record<string, any>
}>()

const model = defineModel<PromptVarValue>()

const typeMap = {
  text: 'string',
  number: 'number',
  toggle: 'boolean',
  select: 'string',
  'multi-select': 'array'
} as const

if (model.value == null || model.value === '') {
  model.value = props.promptVar.default
}
</script>
