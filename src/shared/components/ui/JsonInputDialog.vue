<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(90vw, 500px)">
      <q-card-section>
        <div class="text-h6">
          {{ title }}
        </div>
      </q-card-section>
      <q-card-section px-0>
        <json-input
          :schema
          v-model="value"
          component="item"
          :input-props="{ filled: false }"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('jsonInputDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('jsonInputDialog.ok')"
          :disable="!valid"
          @click="onDialogOK(value)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Schema, Validator } from "@cfworker/json-schema"
import { PluginSchema } from "@lobehub/chat-plugin-sdk"
import { useDialogPluginComponent } from "quasar"
import { computed, ref } from "vue"

import JsonInput from "@/shared/components/input/JsonInput.vue"

const props = defineProps<{
  title: string
  schema: PluginSchema
  model: Record<string, any>
}>()

const value = ref(props.model)
const valid = computed(
  () => new Validator(props.schema as Schema).validate(value.value).valid
)

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()
</script>
