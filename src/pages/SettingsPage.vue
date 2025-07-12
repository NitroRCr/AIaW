<template>
  <page-view-with-drawer
    :title="pageTitle"
    @toggle-drawer="$emit('toggle-drawer')"
  >
    <template #drawer>
      <settings-drawer />
    </template>
  </page-view-with-drawer>
  <!-- <q-drawer
    bg-sur-c-low
    :width="320"
    :breakpoint="drawerBreakpoint"
    side="right"
    v-model="drawerOpen"
  >
    <q-expansion-item
      :label="$t('settingsPage.customProviders')"
      header-class="text-lg"
      default-opened
    >
      <a-tip
        tip-key="custom-provider-usage"
        rd-0
      >
        {{ $t("settingsPage.customProviderUsage") }}
        <a
          href="https://docs.aiaw.app/usage/custom-provider.html"
          target="_blank"
          pri-link
        >
          {{ $t("settingsPage.usageGuide") }}
        </a>
      </a-tip>
      <custom-providers />
    </q-expansion-item>
  </q-drawer> -->
</template>

<script setup lang="ts">
import { computed, provide, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import SettingsDrawer from "@/shared/components/layout/settings/SettingsDrawer.vue"

import PageViewWithDrawer from "./common/SettingPageLayout.vue"
const route = useRoute()
const router = useRouter()

watch(() => route.hash, (hash) => {
  console.log("hash", hash)

  if (!hash) {
    router.replace({ hash: "#ai" })
  }
}, { immediate: true })

const pageTitleMap = {
  ai: "AI Settings",
  features: "Features Settings",
  shortkeys: "Shortkey Settings",
  ui: "UI Settings",
}
const pageTitle = computed(() => {
  return pageTitleMap[route.hash.replace("#", "")]
})

defineEmits(["toggle-drawer"])

// const drawerOpen = ref(false)
// const drawerBreakpoint = 960
const rightDrawerAbove = ref(false)
provide("rightDrawerAbove", rightDrawerAbove)
</script>
