<template>
  <q-expansion-item>
    <template #header>
      <q-item-section avatar>
        <q-icon name="sym_o_attach_file" />
      </q-item-section>
      <q-item-section> {{ $t("workspacesPage.files") }} </q-item-section>
    </template>
    <template #default>
      <div class="flex flex-col ">
        <select-file-btn
          @input="uploadFiles"
        />
        <icon-side-button
          icon="sym_o_note_alt"
          small
          @click="editFile(null)"
          :title="$t('workspacesPage.createTextNote')"
        />
      </div>
      <q-skeleton
        v-if="isLoading"
        type="text"
      />
      <q-list
        v-else
        pt-1
      >
        <div
          p="x-4 y-2"
          v-if="files.length > 1"
        >
          <a-input
            dense
            outlined
            v-model="filter"
            clearable
            :placeholder="$t('workspacesPage.searchPlaceholder')"
          />
        </div>
        <empty-item
          v-if="filteredFiles.length === 0"
          text="No files"
        />
        <q-item
          v-for="file in filteredFiles"
          :key="file.id"
          clickable
          @click="viewFile(file)"
          item-rd
          min-h="32px"
          py-1
          px-3
        >
          <q-item-section
            avatar
            min-w-0
            pr-2
          >
            <q-icon
              :name="getFileIcon(file)"
              size="xs"
              color="secondary"
            />
          </q-item-section>
          <q-item-section class="text-xs">
            {{ trimFileName(file.name) }}
            <q-tooltip v-if="file.name.length > MAX_FILENAME_LENGTH">
              {{ file.name }}
            </q-tooltip>
          </q-item-section>
          <q-item-section
            side
          >
            <q-btn-group
              flat
              dense
            >
              <q-btn
                icon="sym_o_edit"
                flat
                dense
                round
                size="sm"
                @click.prevent.stop="editFile(file)"
              >
                <q-tooltip>{{ $t("workspacesPage.editFile") }}</q-tooltip>
              </q-btn>
              <q-btn
                icon="sym_o_delete"
                flat
                dense
                round
                size="sm"
                @click.prevent.stop="removeFile(file)"
              >
                <q-tooltip>{{ $t("workspacesPage.deleteFile") }}</q-tooltip>
              </q-btn>
            </q-btn-group>
          </q-item-section>
        </q-item>
      </q-list>
    </template>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, inject, ref, Ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import RenameDialog from "@/shared/components/dialogs/RenameDialog.vue"
import EmptyItem from "@/shared/components/layout/EmptyItem.vue"
import IconSideButton from "@/shared/components/layout/IconSideButton.vue"
import { getFileUrl } from "@/shared/composables/storage/utils"
import { parseFilesToApiResultItems } from "@/shared/utils/files"
import { caselessIncludes, getFileExt } from "@/shared/utils/functions"
import { dialogOptions } from "@/shared/utils/values"

import SelectFileBtn from "@/features/files/components/SelectFileBtn.vue"
import ViewFileDialog from "@/features/media/components/ViewFileDialog.vue"
import ViewImageDialog from "@/features/media/components/ViewImageDialog.vue"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { StoredItem } from "@/services/data/types/storedItem"
import { Workspace } from "@/services/data/types/workspace"

import EditNote from "./EditNote.vue"

const filter = ref(null)
const filteredFiles = computed(() => {
  return currentFiles.value
    .filter((d) => !filter.value || caselessIncludes(d.name || "", filter.value) || caselessIncludes(d.contentText || "", filter.value))
    .reverse()
})

const getFileIcon = (file: StoredItem) => {
  switch (file.type) {
    case "image":
      return "sym_o_image"
    case "text":
      return "sym_o_article"
    default:
      return "sym_o_file_present"
  }
}

const MAX_FILENAME_LENGTH = 16

const trimFileName = (name: string) => {
  const ext = getFileExt(name)

  return name.length > MAX_FILENAME_LENGTH ? name.slice(0, MAX_FILENAME_LENGTH) + "..." + (ext ? `.${ext}` : "") : name
}

const { fetchFiles, addFileItem, removeFileItem, updateFileItem } = useWorkspacesStore()
const workspace = inject<Ref<Workspace>>("workspace")
const { t } = useI18n()
const currentFiles = ref<StoredItem[]>([])
const { files, isLoading } = fetchFiles(workspace.value.id)

watch(files, (newFiles) => {
  if (newFiles.length > 0) {
    currentFiles.value = newFiles
  } else {
    currentFiles.value = []
  }
})

const $q = useQuasar()

function removeFile (storedItem: StoredItem) {
  $q.dialog({
    title: t("workspacesPage.deleteFile"),
    message: t("workspacesPage.deleteFileConfirmation", { name: storedItem.name }),
    cancel: true,
    ...dialogOptions,
  }).onOk(() => {
    removeFileItem(storedItem)
    currentFiles.value = currentFiles.value.filter((f) => f.id !== storedItem.id)
  })
}

function viewFile (file: StoredItem) {
  if (file.type === "image") {
    $q.dialog({
      component: ViewImageDialog,
      componentProps: {
        url: getFileUrl(file.fileUrl),
      },
    })
  } else {
    $q.dialog({
      component: ViewFileDialog,
      componentProps: {
        file,
      },
    })
  }
}

function editFile (file?: StoredItem) {
  if (file && file?.type !== "text") {
    $q.dialog({
      component: RenameDialog,
      componentProps: {
        name: file?.name || "",
        title: t("workspacesPage.renameFile"),
      },
    }).onOk((name) => {
      updateFileItem(file.id, { name })
      currentFiles.value = currentFiles.value.map((f) => f.id === file.id ? { ...f, name } : f)
    })

    return
  }

  $q.dialog({
    component: EditNote,
    componentProps: {
      workspaceId: workspace.value.id,
      name: file?.name || "",
      text: file?.contentText || "",
    },
  }).onOk(({ save, name, text }: { save: boolean, name?: string, text?: string }) => {
    if (save) {
      if (file) {
        updateFileItem(file.id, {
          type: "text", name, contentText: text || ""
        }).then((file) => {
          currentFiles.value = currentFiles.value.map((f) => f.id === file.id ? file : f)
        })
      } else {
        addFileItem(workspace.value.id, {
          type: "text", name, contentText: text || ""
        }).then((file) => {
          currentFiles.value = [...currentFiles.value, file]
        })
      }
    }
  })
}

async function uploadFiles (files: File[]) {
  const { parsedItems, otherFiles } = await parseFilesToApiResultItems(files, null,
    (maxFileSize, file) => {
      $q.notify({
        message: t("dialogView.fileTooLarge", {
          maxSize: maxFileSize
        }),
        color: "negative"
      })
    }
  )

  const newFiles = await Promise.all([...parsedItems.map(async (item) => {
    return await addFileItem(workspace.value.id, item)
  }), ...otherFiles.map(async (file) => {
    return await addFileItem(workspace.value.id, file)
  })])
  currentFiles.value = [...currentFiles.value, ...newFiles]
}
</script>
