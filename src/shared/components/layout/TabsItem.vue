<template>
  <!-- <add-dialog-item :workspace-id="workspaceId" /> -->
  <q-tabs
    v-model="activeTab"
    no-caps
    inline-label
    indicator-color="primary"
    active-color="primary"
    color="primary"
  >
    <q-tab
      name="dialogs"
      :label="$t('mainLayout.dialogs')"
      class="q-px-sm"
    />
    <q-tab
      name="chats"
      :label="$t('mainLayout.chats')"
      class="q-px-sm"
    />
  </q-tabs>

  <q-tab-panels
    v-model="activeTab"
    animated
  >
    <q-tab-panel name="dialogs" />

    <q-tab-panel name="chats">
      <chat-list :workspace-id="workspaceId" />
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import ChatList from "@/features/chats/components/ChatExpansion.vue"
import { useActiveWorkspace } from "@/features/workspaces/composables/useActiveWorkspace"

const { workspace } = useActiveWorkspace()
const workspaceId = computed(() => workspace.value?.id as string)

const activeTab = ref("dialogs")
</script>
