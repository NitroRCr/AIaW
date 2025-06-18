<template>
  <q-btn
    :label="
      store.availableKeys.includes(id)
        ? $t('installPluginBtn.installed')
        : $t('installPluginBtn.install')
    "
    :disable="store.availableKeys.includes(id)"
    :loading
    @click="installIt"
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref } from "vue"
import { useI18n } from "vue-i18n"

import { PluginManifest } from "@/shared/utils/types"

import { useInstallPlugin } from "@/features/plugins/composables"
import { usePluginsStore } from "@/features/plugins/store"

const { t } = useI18n()

const props = defineProps<{
  id: string
  manifest: PluginManifest
}>()

const store = usePluginsStore()
const { install } = useInstallPlugin()
const loading = ref(false)
const $q = useQuasar()

function installIt () {
  loading.value = true
  install(props.manifest)
    .catch((err) => {
      console.error(err)
      $q.notify({
        message: `${t("installPluginBtn.installFailed")}${err.message}`,
        color: "negative",
      })
    })
    .finally(() => {
      loading.value = false
    })
}
</script>
