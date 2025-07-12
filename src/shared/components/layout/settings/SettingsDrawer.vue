<template>
  <icon-side-button
    icon="sym_o_account_circle"
    :title="$t('settingsPage.account')"
    :to="`/account`"
  />
  <sidebar-title :title="'Settings'" />

  <icon-side-button
    icon="sym_o_psychology"
    :to="`/settings#ai`"
    :title="$t('settingsPage.aiSettings')"
    :active="route.hash === '#ai'"
  />
  <icon-side-button
    icon="sym_o_construction"
    :to="`/settings#features`"
    :title="$t('settingsPage.featuresSettings')"
    :active="route.hash === '#features'"
  />
  <icon-side-button
    icon="sym_o_shortcut"
    :to="`/settings#shortkeys`"
    :title="$t('settingsPage.shortkeysSettings')"
    :active="route.hash === '#shortkeys'"
  />
  <icon-side-button
    icon="sym_o_view_comfy"
    :to="`/settings#ui`"
    :title="$t('settingsPage.uiSettings')"
    :active="route.hash === '#ui'"
  />
</template>

<script setup lang="ts">
import { useRoute } from "vue-router"

import IconSideButton from "@/shared/components/layout/IconSideButton.vue"
import SidebarTitle from "@/shared/components/layout/SidebarTitle.vue"
console.log("SettingsDrawer")
const route = useRoute()
</script>
