<template>
  <div>
    <prompt-var-item
      v-for="(item, index) in model"
      :key="item.id"
      v-model="model[index]"
      @remove="model.splice(index, 1)"
      my-3
    />
    <q-btn
      :label="$t('promptVarEditor.addVariable')"
      icon="sym_o_add"
      flat
      w-full
      text-sec
      @click="add"
    />
  </div>
</template>

<script setup lang="ts">
import { genId } from "@/shared/utils/functions"
import { PromptVar } from "@/shared/utils/types"

import PromptVarItem from "./PromptVarItem.vue"

const model = defineModel<PromptVar[]>()

function add () {
  model.value.push({
    id: genId(),
    name: null,
    type: "text",
  })
}
</script>
