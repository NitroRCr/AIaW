<template>
  <q-select
    v-model="model"
    :options="options"
    map-options
    emit-value
  />
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

import { PlatformEnabled } from "@/shared/utils/types"

const { t } = useI18n()

const model = defineModel<PlatformEnabled>()
const options = [
  { label: t("platformEnabledInput.alwaysEnabled"), value: "always" },
  { label: t("platformEnabledInput.desktopOnly"), value: "desktop-only" },
  { label: t("platformEnabledInput.mobileOnly"), value: "mobile-only" },
  { label: t("platformEnabledInput.alwaysDisabled"), value: "never" },
]
</script>
