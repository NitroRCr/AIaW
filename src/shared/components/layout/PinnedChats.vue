<template>
  <q-list class="q-pa-none">
    <q-item
      v-for="chat in lastChatsWithWorkspace"
      :key="chat.id"
      clickable
      @click="goToChat(chat.workspace_id, chat.id)"
      dense
      class="q-pa-xs q-mb-xs"
    >
      <q-item-section
        side
        class="q-mr-xs q-pa-none"
      >
        <AAvatar
          :avatar="chat.workspace?.avatar"
          :label="chat.workspace?.name"
          :flat="true"
          size="xs"
        />
      </q-item-section>
      <q-item-section class="q-pa-none q-pt-xs q-pl-xs">
        <div class="text-body2 ellipsis">
          {{ chat.name }}
        </div>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useRouter } from "vue-router"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"

import { useChatsStore } from "@/features/chats/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

const MAX_LAST_CHATS = 3
const router = useRouter()
const workspacesStore = useWorkspacesStore()
const { chats } = storeToRefs(useChatsStore())

const lastChats = computed(() => {
  return [...chats.value]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, MAX_LAST_CHATS)
})

const lastChatsWithWorkspace = computed(() =>
  workspacesStore.workspaces.length > 0
    ? lastChats.value.map((d) => {
      const workspace = workspacesStore.workspaces?.find(
        (w) => w.id === d.workspace_id
      )

      return {
        ...d,
        workspace,
      }
    })
    : []
)

function goToChat (workspaceId: string, chatId: string) {
  router.push(
    workspaceId
      ? `/workspaces/${workspaceId}/chats/${chatId}`
      : `/chats/${chatId}`
  )
}
</script>
