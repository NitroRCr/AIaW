<template>
  <q-menu context-menu>
    <q-list style="min-width: 100px">
      <menu-item
        v-if="isOpen"
        icon="sym_o_save"
        :label="$t('artifactItemMenu.save')"
        :disable="!artifactUnsaved(artifact)"
        @click="saveItem(artifact)"
      />
      <menu-item
        icon="sym_o_edit"
        :label="$t('artifactItemMenu.rename')"
        @click="renameItem(artifact)"
      />
      <menu-item
        icon="sym_o_move_item"
        :label="$t('artifactItemMenu.moveTo')"
        @click="moveItem(artifact)"
      />
      <menu-item
        icon="sym_o_download"
        :label="$t('artifactItemMenu.download')"
        @click="downloadItem(artifact)"
      />
      <menu-item
        icon="sym_o_delete"
        :label="$t('artifactItemMenu.delete')"
        @click="deleteItem(artifact)"
        hover:text-err
      />
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { useUserDataStore } from "@/shared/store"
import { artifactUnsaved, saveArtifactChanges } from "@/shared/utils/functions"
import { exportFile } from "@/shared/utils/platformApi"
import { dialogOptions } from "@/shared/utils/values"

import { useArtifactsStore } from "@/features/artifacts/store"
import SelectWorkspaceDialog from "@/features/workspaces/components/SelectWorkspaceDialog.vue"

import { Artifact } from "@/services/data/types/artifact"

const $q = useQuasar()
const { t } = useI18n()
const artifactsStore = useArtifactsStore()
const userDataStore = useUserDataStore()
const props = defineProps<{
  artifact: Artifact
}>()

const isOpen = computed(() =>
  userDataStore.data.openedArtifacts.find((id) => id === props.artifact.id)
)

function renameItem (artifact: Artifact) {
  $q.dialog({
    title: t("artifactItemMenu.rename"),
    prompt: {
      model: artifact.name,
      type: "text",
      label: t("artifactItemMenu.rename"),
      isValid: (v) => v.trim() && v !== artifact.name,
    },
    cancel: true,
    ...dialogOptions,
  }).onOk((newName) => {
    artifactsStore.update({
      ...artifact,
      name: newName.trim(),
    })
  })
}

function moveItem (artifact: Artifact) {
  $q.dialog({
    component: SelectWorkspaceDialog,
    componentProps: {
      accept: "workspace",
    },
  }).onOk((workspaceId) => {
    artifactsStore.update({
      ...artifact,
      workspaceId,
    })
  })
}

function downloadItem ({ name, versions, currIndex }: Artifact) {
  exportFile(name, versions[currIndex].text)
}

function deleteItem (artifact: Artifact) {
  $q.dialog({
    title: t("artifactItemMenu.deleteConfirmTitle"),
    message: t("artifactItemMenu.deleteConfirmMessage", {
      name: artifact.name,
    }),
    cancel: true,
    ok: {
      label: t("artifactItemMenu.deleteConfirmOk"),
      color: "err",
      flat: true,
    },
    ...dialogOptions,
  }).onOk(() => {
    artifactsStore.remove(artifact)
  })
}

function saveItem (artifact: Artifact) {
  artifactsStore.update(saveArtifactChanges(artifact))
}
</script>

<style scoped></style>
