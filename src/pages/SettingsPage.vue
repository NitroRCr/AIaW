<template>
  <router-view @toggle-drawer="drawerOpen = !drawerOpen" />
  <q-drawer
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
  </q-drawer>
</template>

<script setup lang="ts">
import { provide, ref } from "vue"

import ATip from "@/shared/components/ATip.vue"

import CustomProviders from "@/features/providers/components/CustomProviders.vue"

const drawerOpen = ref(false)
const drawerBreakpoint = 960
const rightDrawerAbove = ref(false)
provide("rightDrawerAbove", rightDrawerAbove)
</script>
