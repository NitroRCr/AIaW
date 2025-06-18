<template>
  <template v-if="type === 'string'">
    <q-select
      v-if="options"
      v-model="model"
      :options
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
    <component
      :is="inputComponent"
      v-else
      v-model="model"
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
  </template>
  <template v-else-if="type === 'array'">
    <q-select
      v-if="options"
      v-model="model"
      multiple
      :options
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
    <q-select
      v-else
      v-model="model"
      use-input
      use-chips
      multiple
      hide-dropdown-icon
      input-debounce="0"
      new-value-mode="add"
      class="input-item"
      :label
      v-bind="inputProps"
      :class="$attrs.class"
    />
  </template>

  <component
    :is="inputComponent"
    v-else-if="type === 'number'"
    v-model.number="model"
    :label
    v-bind="inputProps"
    type="number"
    :class="$attrs.class"
  />
  <q-toggle
    v-else-if="type === 'boolean'"
    v-model="model"
    left-label
    :label
    :class="$attrs.class"
  />
</template>

<script setup lang="ts">
import { QInput } from "quasar"
import { computed } from "vue"

import LazyInput from "./LazyInput.vue"

const props = defineProps<{
  type: "string" | "array" | "number" | "boolean"
  options?: string[]
  label?: string
  inputProps?: Record<string, any>
  lazy?: boolean
}>()
const model = defineModel<any>()

if (props.type === "array" && !model.value) {
  model.value = []
}

const inputComponent = computed(() => (props.lazy ? LazyInput : QInput))
</script>
