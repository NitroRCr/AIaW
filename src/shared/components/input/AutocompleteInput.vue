<template>
  <q-select
    :model-value="model"
    @input-value="model = $event"
    :options="filteredOptions"
    @filter="filterFn"
    use-input
    hide-selected
    fill-input
    hide-dropdown-icon
    :input-debounce="0"
  >
    <template
      v-if="$slots.option"
      #option="slot"
    >
      <slot
        name="option"
        v-bind="slot"
      />
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { toRef } from "vue"

import { useFilterOptions } from "@/shared/composables/filterOptions"

const props = defineProps<{
  options: string[]
}>()

const model = defineModel<string>()

const { filteredOptions, filterFn } = useFilterOptions(toRef(props, "options"))
</script>
