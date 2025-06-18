<template>
  <q-btn
    v-if="mainLayout"
    icon="sym_o_rate_review"
    dense
    color="primary"
    @click="onAdd"
  >
    <q-tooltip> Create AI chat </q-tooltip>
  </q-btn>
  <q-item
    v-else
    clickable
    @click="onAdd"
    text-sec
    item-rd
    fit
    class="full-width"
  >
    <q-item-section
      avatar
      min-w-0
    >
      <q-icon name="sym_o_rate_review" />
    </q-item-section>
    <q-item-section>
      {{ $t("dialogList.createDialog") }}
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { toRef } from "vue"

import { useListenKey } from "@/shared/composables"
import { useUserPerfsStore } from "@/shared/store"
import { isPlatformEnabled } from "@/shared/utils/functions"

import { useCheckLogin } from "@/features/auth/composables/useCheckLogin"

import { useCreateDialog } from "../composables"

const props = defineProps<{
  workspaceId: string
  mainLayout?: boolean
}>()
const emit = defineEmits(["added"])

const { ensureLogin } = useCheckLogin()
const { data: perfs } = storeToRefs(useUserPerfsStore())
const workspaceId = toRef(props, "workspaceId")
const { createDialog } = useCreateDialog(workspaceId.value)

async function onAdd () {
  ensureLogin()
  await createDialog()
  emit("added")
}

if (isPlatformEnabled(perfs.value.enableShortcutKey)) {
  useListenKey(toRef(perfs.value, "createDialogKey"), onAdd)
}
</script>
