<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card
      important:md:max-w="720px"
      important:lg:max-w="960px"
      min-w="300px"
    >
      <q-card-section bg-sur-c-low>
        <div class="text-h6">
          {{ file.name }}
        </div>
      </q-card-section>
      <q-card-section
        p-0
        bg-sur-c-low
      >
        <div v-if="file.contentText">
          <md-preview
            :model-value="markdown"
            v-bind="mdPreviewProps"
            bg-sur-c-low
            max-h="70vh"
          />
        </div>
        <div v-if="file.fileUrl">
          <q-list>
            <q-item>
              <q-item-section>
                {{ $t("viewFileDialog.fileSize") }}
              </q-item-section>
              <q-item-section side>
                {{ fileSize ? sizeStr(fileSize) : "..." }}
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                {{ $t("viewFileDialog.fileType") }}
              </q-item-section>
              <q-item-section side>
                {{ file.mimeType }}
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>
      <q-card-actions bg-sur-c-low>
        <copy-btn
          v-if="file.contentText"
          flat
          :label="$t('viewFileDialog.copy')"
          color="primary"
          :value="file.contentText"
        />
        <q-btn
          v-if="file.fileUrl"
          flat
          :label="$t('viewFileDialog.download')"
          color="primary"
          icon="sym_o_download"
          @click="download"
        />
        <q-space />
        <q-btn
          flat
          color="primary"
          :label="$t('viewFileDialog.ok')"
          @click="onDialogOK"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { MdPreview } from "md-editor-v3"
import { useDialogPluginComponent } from "quasar"
import { computed, ref, watchEffect } from "vue"

import CopyBtn from "@/shared/components/CopyBtn.vue"
import { useMdPreviewProps } from "@/shared/composables/mdPreviewProps"
// import { exportFile } from '@/utils/platform-api'
import { useStorage } from "@/shared/composables/storage/useStorage"
import { wrapCode, wrapQuote } from "@/shared/utils/functions"
import { codeExtensions } from "@/shared/utils/values"

import { StoredItem } from "@/services/data/types/storedItem"

const props = defineProps<{
  file: StoredItem
}>()

defineEmits([...useDialogPluginComponent.emits])

const storage = useStorage()

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const fileSize = ref<number | null>(null)

watchEffect(async () => {
  if (!props.file.fileUrl) {
    fileSize.value = null
  } else {
    fileSize.value = await storage.getFileSizeByUrl(props.file.fileUrl)
  }
})

function sizeStr (bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  else return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// FIXME: Text processing operations in computed property
// While less heavy than template rendering, this computed processes file content on every change.
// For large files, string operations like split() and wrapCode() could impact performance.
// Consider memoizing the result or moving processing to when file is loaded.
const markdown = computed(() => {
  const { file } = props

  if (file.type === "quote") return wrapQuote(file.contentText)

  const splits = file.name.split(".")

  if (splits.length < 2) return file.contentText

  const ext = splits.at(-1)

  return codeExtensions.includes(ext)
    ? wrapCode(file.contentText, ext)
    : file.contentText
})

function download () {
  // trigger download of props.file.file_url
  const url = props.file.fileUrl
  const a = document.createElement("a")
  a.href = url
  a.download = props.file.name
  a.click()
}

const mdPreviewProps = useMdPreviewProps()
</script>
