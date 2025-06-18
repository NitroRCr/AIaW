<template>
  <div>
    <q-item
      v-for="(_, key) in model"
      :key
    >
      <q-item-section avatar>
        {{ key }}
      </q-item-section>
      <q-item-section>
        <a-input
          v-model="model[key]"
          v-bind="inputProps"
        />
      </q-item-section>
      <q-item-section side>
        <q-btn
          flat
          round
          icon="sym_o_close"
          @click="delete model[key]"
        />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        <q-btn
          :label="$t('varsInput.addVariable')"
          icon="sym_o_add"
          flat
          text-sec
          @click="add"
        />
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"

import { dialogOptions } from "@/shared/utils/values"

const { t } = useI18n()

const model = defineModel<Record<string, string>>()

defineProps<{
  inputProps: Record<string, any>
}>()

const $q = useQuasar()

function add () {
  $q.dialog({
    title: t("varsInput.addVariable"),
    prompt: {
      model: "",
      type: "text",
      label: t("varsInput.variableName"),
    },
    cancel: true,
    ...dialogOptions,
  }).onOk((name) => {
    model.value[name] = ""
  })
}
</script>
