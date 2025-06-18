<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          {{
            accept === "workspace"
              ? $t("selectWorkspaceDialog.selectWorkspace")
              : $t("selectWorkspaceDialog.selectFolder")
          }}
        </div>
      </q-card-section>
      <q-card-section p-0>
        <workspace-list-select
          v-model="selected"
          :accept
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('selectWorkspaceDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('selectWorkspaceDialog.confirm')"
          :disable="!selected || exclude?.includes(selected)"
          @click="onDialogOK(selected)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar"
import { ref } from "vue"

import WorkspaceListSelect from "./WorkspaceListSelect.vue"

defineProps<{
  accept: "workspace" | "folder"
  exclude?: string[]
}>()

defineEmits([...useDialogPluginComponent.emits])

const selected = ref<string>()

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()
</script>
