<template>
  <div flex>
    <div
      flex
      grow
      flex-wrap
      gap-2
    >
      <a-input
        v-model="model.name"
        :label="$t('promptVarItem.variableName')"
        filled
        dense
        class="prompt-var-input-item"
      />
      <a-input
        v-model="model.label"
        :label="$t('promptVarItem.label')"
        filled
        dense
        class="prompt-var-input-item"
      />
      <q-select
        v-model="model.type"
        :label="$t('promptVarItem.type')"
        :options="options"
        map-options
        emit-value
        filled
        dense
        class="prompt-var-input-item"
      />
      <q-select
        v-if="['select', 'multi-select'].includes(model.type)"
        v-model="model.options"
        :label="$t('promptVarItem.options')"
        use-input
        use-chips
        multiple
        hide-dropdown-icon
        :input-debounce="0"
        new-value-mode="add-unique"
        filled
        dense
        class="prompt-var-input-item"
      />
      <prompt-var-input
        :prompt-var="{ ...model, label: $t('promptVarItem.defaultValue') }"
        v-model="model.default"
        :input-props="{
          dense: true,
          filled: true,
        }"
        class="prompt-var-input-item"
        component="input"
      />
    </div>
    <q-btn
      ml-2
      flat
      icon="sym_o_close"
      round
      dense
      self-center
      @click="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import { PromptVar } from "@/shared/utils/types"

import PromptVarInput from "./PromptVarInput.vue"

const model = defineModel<PromptVar>()

defineEmits(["remove"])
const { t } = useI18n()
const options = computed(() => [
  { label: t("promptVarItem.text"), value: "text" },
  { label: t("promptVarItem.number"), value: "number" },
  { label: t("promptVarItem.toggle"), value: "toggle" },
  { label: t("promptVarItem.select"), value: "select" },
  { label: t("promptVarItem.multiSelect"), value: "multi-select" },
])
</script>
<style lang="scss">
.prompt-var-input-item {
  flex-grow: 1;
  flex-basis: 100px;
}
</style>
