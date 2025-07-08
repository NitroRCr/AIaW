<template>
  <icon-side-button
    :title="$t('mainLayout.uploadFile')"
    icon="sym_o_upload_file"
    @click="onClick"
  >
    <!-- <q-btn @click.prevent.stop="onClick"> -->
    <q-dialog v-model="show">
      <q-card>
        <q-card-section>
          <div
            @click="fileInput.click()"
            @dragenter.prevent
            @dragover.prevent
            @drop.stop.prevent="onDrop"
            border="dashed 2px out"
            h="300px"
            w="xs:350px sm:500px"
            flex
            items-center
            justify-center
            cursor-pointer
          >
            <div text="xl center out">
              {{ $t("selectFileBtn.clickToSelect") }}<br>
              {{ $t("selectFileBtn.dragHere") }}<br>
              {{ $t("selectFileBtn.paste") }}
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <input
      ref="fileInput"
      type="file"
      accept="*"
      @change="onInput"
      un-hidden
      multiple
    >
  </icon-side-button>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { onUnmounted, ref } from "vue"

import IconSideButton from "@/shared/components/layout/IconSideButton.vue"

const emit = defineEmits<{
  input: [File[]]
}>()
const show = ref(false)

const fileInput = ref<HTMLInputElement>()

function onInput () {
  if (fileInput.value.files.length) {
    emit("input", Array.from(fileInput.value.files))
    show.value = false
  }
}

function onDrop ({ dataTransfer }) {
  if (dataTransfer.files.length) {
    emit("input", Array.from(dataTransfer.files))
    show.value = false
  }
}

function onPaste (ev: ClipboardEvent) {
  if (!show.value) return

  ev.stopPropagation()

  if (ev.clipboardData.files.length) {
    emit("input", Array.from(ev.clipboardData.files))
    show.value = false
  }
}
addEventListener("paste", onPaste, true)
onUnmounted(() => removeEventListener("paste", onPaste, true))

const $q = useQuasar()

function onClick () {
  if ($q.platform.is.desktop) {
    show.value = true
  } else {
    fileInput.value.click()
  }
}
</script>
