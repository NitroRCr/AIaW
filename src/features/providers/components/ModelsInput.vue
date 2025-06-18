<template>
  <q-select
    v-model="model"
    use-input
    use-chips
    multiple
    new-value-mode="add-unique"
    hide-dropdown-icon
    :input-debounce="0"
    :options="filteredOptions"
    @filter="filterFn"
  >
    <template #option="{ opt, selected, itemProps }">
      <model-item
        :model="opt"
        :selected
        v-bind="itemProps"
      />
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { toRef } from "vue"

import { useFilterOptions } from "@/shared/composables"

import { useProvidersStore } from "@/features/providers/store"

import ModelItem from "./ModelItem.vue"

const model = defineModel<string[]>()
const providersStore = useProvidersStore()
const options = toRef(providersStore, "modelOptions")

const { filteredOptions, filterFn } = useFilterOptions(options)
</script>
