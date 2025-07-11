<template>
  <icon-side-button
    v-if="canViewCyberlinks"
    icon="sym_o_hub"
    :title="$t('mainLayout.cyberlinks')"
    :to="'/cyberlinks'"
  />
  <sidebar-title :title="t('mainLayout.workspace')" />
  <div>
    <icon-side-button
      :icon="workspace?.avatar || emptyAvatar"
      :title="trimWorkspaceName(workspace?.name) || 'Select a workspace...'"
      :to="`/workspaces/my`"
      direction="right"
    />
    <q-tooltip>
      {{ workspace?.name }}
    </q-tooltip>
  </div>
  <sidebar-title :title="'Assistant'" />

  <icon-side-button
    :icon="assistant?.avatar || emptyAvatar"
    :title="assistant?.name || 'Select an assistant'"
    :to="`/workspaces/${workspace.id}/assistants`"
    direction="right"
  />
  <div class="pt-2" />
  <dialog-list
    :workspace-id="workspaceId"
  />
  <!-- <sidebar-title title="Last Dialogs" />
  <q-item>
    <last-dialogs />
  </q-item>
  <sidebar-title :title="t('mainLayout.pinnedChats')" />
  <q-item>
    <pinned-chats />
  </q-item> -->
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import IconSideButton from "@/shared/components/layout/IconSideButton.vue"
// import LastDialogs from "@/shared/components/layout/LastDialogs.vue"
// import PinnedChats from "@/shared/components/layout/PinnedChats.vue"
import SidebarTitle from "@/shared/components/layout/SidebarTitle.vue"
import { IconAvatar } from "@/shared/types"

import DialogList from "@/features/dialogs/components/DialogList.vue"
import { usePluginsStore } from "@/features/plugins/store"
import { useActiveWorkspace, useOpenLastWorkspace } from "@/features/workspaces/composables"

const emptyAvatar = { type: "icon", icon: "sym_o_sentiment_very_dissatisfied" } as IconAvatar
const { workspace, assistant } = useActiveWorkspace()
const workspaceId = computed(() => workspace.value?.id as string)

const route = useRoute()

const { openLastWorkspace } = useOpenLastWorkspace()
route.path === "/" && openLastWorkspace()

const { t } = useI18n()

const pluginsStore = usePluginsStore()

const canViewCyberlinks = computed(() => {
  if (!assistant.value?.plugins) return false

  const activePlugins = pluginsStore.plugins.filter(
    (p) => p.available && assistant.value.plugins[p.id]?.enabled
  )

  return activePlugins.some((plugin) =>
    plugin.apis.some((api) => api.name === "query_cyberlinks")
  )
})

const trimWorkspaceName = (name: string) => {
  return name.length > 16 ? name.slice(0, 16) + "..." : name
}
</script>
