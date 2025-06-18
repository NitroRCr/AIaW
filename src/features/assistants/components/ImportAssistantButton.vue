<template>
  <q-btn
    flat
    dense
    round
    icon="sym_o_file_download"
    :title="$t('assistantsMarket.import')"
    @click.prevent.stop
  >
    <q-menu>
      <q-list>
        <q-item
          clickable
          v-close-popup
          @click="fileInput.click()"
        >
          <q-item-section>
            {{ $t("assistantsMarket.selectFile") }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="clipboardImport"
        >
          <q-item-section>
            {{ $t("assistantsMarket.importFromClipboard") }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="onFileInput"
    >
  </q-btn>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref } from "vue"
import { useI18n } from "vue-i18n"

import { clipboardReadText } from "@/shared/utils/platformApi"

import { useAssistantActions } from "@/features/workspaces/composables"

const { t } = useI18n()
const $q = useQuasar()
const fileInput = ref<HTMLInputElement>()
const { add } = useAssistantActions()

async function onFileInput () {
  const file = fileInput.value?.files?.[0]

  if (!file) return

  try {
    const data = JSON.parse(await file.text())
    addToGlobal(data)
  } catch (err) {
    $q.notify({
      message: t("assistantsMarket.importError"),
      color: "negative",
    })
  }
  fileInput.value.value = "" // reset input
}

async function clipboardImport () {
  try {
    const text = await clipboardReadText()
    addToGlobal(JSON.parse(text))
  } catch (err) {
    $q.notify({
      message: t("assistantsMarket.importError"),
      color: "negative",
    })
  }
}

function addToGlobal (item) {
  add(item, null)
}
</script>
