<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card min-w="300px">
      <q-card-section>
        <div class="text-h6">
          {{
            message.type === "user"
              ? $t("messageInfoDialog.userMessageInfo")
              : $t("messageInfoDialog.assistantMessageInfo")
          }}
        </div>
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item>
            <q-item-section>
              {{ $t("messageInfoDialog.id") }}
            </q-item-section>
            <q-item-section side>
              {{ message.id }}
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              {{ $t("messageInfoDialog.createdAt") }}
            </q-item-section>
            <q-item-section side>
              {{ createdAt }}
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              {{ $t("messageInfoDialog.textLength") }}
            </q-item-section>
            <q-item-section side>
              {{ length }}
            </q-item-section>
          </q-item>
          <q-item v-if="message.model_name">
            <q-item-section>
              {{ $t("messageInfoDialog.model") }}
            </q-item-section>
            <q-item-section side>
              {{ message.model_name }}
            </q-item-section>
          </q-item>
          <q-item v-if="message.usage">
            <q-item-section>
              {{ $t("messageInfoDialog.tokenUsage") }}
            </q-item-section>
            <q-item-section side>
              {{ $t("messageInfoDialog.prompt")
              }}{{ message.usage.promptTokens }} ，{{
                $t("messageInfoDialog.completion")
              }}{{ message.usage.completionTokens }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('messageInfoDialog.ok')"
          @click="onDialogOK"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar"
import { computed } from "vue"

import { idDateString } from "@/shared/utils/functions"

import type { DialogMessageMapped } from "@/services/supabase/types"

const props = defineProps<{
  message: DialogMessageMapped
}>()

const length = computed(() =>
  props.message.message_contents
    .filter((c) => c.type === "assistant-message" || c.type === "user-message")
    .reduce((prev, cur) => prev + cur.text.length, 0)
)
const createdAt = computed(() => idDateString(props.message.id))

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
</script>
