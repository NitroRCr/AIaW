<template>
  <q-list class="q-pa-none">
    <q-item
      v-for="chat in lastChatsWithWorkspace"
      :key="chat.id"
      clickable
      @click="goToChat(chat.workspaceId, chat.id)"
      dense
      class="q-pa-xs q-mb-xs"
    >
      <q-item-section
        side
        class="q-mr-xs q-pa-none"
        v-if="chat.workspace?.avatar"
      >
        <AAvatar
          :avatar="chat.workspace.avatar"
          :label="chat.workspace?.name"
          :flat="true"
          size="xs"
        />
      </q-item-section>
      <q-item-section
        side
        class="q-mr-xs q-pa-none"
        v-else
      >
        <q-avatar size="xs">
          {{ chat.workspace?.name?.charAt(0) || 'C' }}
        </q-avatar>
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

// FIXME: Heavy array operations in computed property
// This computed creates new array copy, sorts with Date parsing, and slices on every change.
// For large chat lists, this could impact performance. Consider memoizing or moving to store.
// Alternative: cache sorted results or use a computed store getter with memoization.
const lastChats = computed(() => {
  return [...chats.value]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, MAX_LAST_CHATS)
})

// FIXME: Nested array operations in computed property
// This computed maps over chats and finds workspace for each one, creating new objects.
// The find() operation in map() creates O(n²) complexity. Consider pre-indexing workspaces by ID.
// Alternative: create workspace lookup map in store or cache the result.
const lastChatsWithWorkspace = computed(() =>
  workspacesStore.workspaces.length > 0
    ? lastChats.value.map((d) => {
      const workspace = workspacesStore.workspaces?.find(
        (w) => w.id === d.workspaceId
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
