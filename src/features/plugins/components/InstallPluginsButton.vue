<template>
  <q-btn
    flat
    dense
    round
    icon="sym_o_add"
    :title="$t('pluginsMarket.manualInstall')"
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
            {{ $t("pluginsMarket.selectConfig") }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="clipboardImport"
        >
          <q-item-section>
            {{ $t("pluginsMarket.importFromClipboard") }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="addMcpPlugin"
        >
          <q-item-section>
            {{ $t("pluginsMarket.addMcpPlugin") }}
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

import AddMcpPluginDialog from "@/features/plugins/components/AddMcpPluginDialog.vue"

const emit = defineEmits(["plugin-installed"])
const $q = useQuasar()
const { t } = useI18n()
const fileInput = ref<HTMLInputElement>()

async function onFileInput () {
  const file = fileInput.value?.files?.[0]

  if (!file) return

  try {
    const plugin = JSON.parse(await file.text())
    // You may want to validate plugin here
    // ...
    emit("plugin-installed", plugin)
    $q.notify({ message: t("pluginsMarket.added"), color: "positive" })
  } catch (err) {
    $q.notify({ message: t("pluginsMarket.importError"), color: "negative" })
  }
  fileInput.value.value = "" // reset
}

async function clipboardImport () {
  try {
    const text = await clipboardReadText()
    const plugin = JSON.parse(text)
    // You may want to validate plugin here
    // ...
    emit("plugin-installed", plugin)
    $q.notify({ message: t("pluginsMarket.added"), color: "positive" })
  } catch (err) {
    $q.notify({ message: t("pluginsMarket.importError"), color: "negative" })
  }
}

function addMcpPlugin () {
  $q.dialog({
    component: AddMcpPluginDialog,
  }).onOk((plugin) => {
    emit("plugin-installed", plugin)
    $q.notify({ message: t("pluginsMarket.added"), color: "positive" })
  })
}
</script>
