<template>
  <q-list
    class="q-pa-none"
    pt-0
    pb-0
  >
    <q-item
      v-for="dialog in lastDialogsWithWorkspace"
      :key="dialog.id"
      clickable
      @click="goToDialog(dialog.workspaceId, dialog.id)"
      dense
      class="q-pa-xs q-mb-xs"
    >
      <q-item-section
        side
        class="q-mr-xs q-pa-none"
        v-if="dialog.workspace?.avatar"
      >
        <AAvatar
          :avatar="dialog.workspace.avatar"
          :label="dialog.workspace?.name"
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
          {{ dialog.workspace?.name?.charAt(0) || 'D' }}
        </q-avatar>
      </q-item-section>
      <q-item-section class="q-pa-none q-pt-xs q-pl-xs">
        <div class="text-body2 ellipsis">
          {{ dialog.name }}
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

import { useDialogsStore } from "@/features/dialogs/store/dialogs"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { Dialog } from "@/services/data/types/dialogs"

const MAX_LAST_DIALOGS = 3
const router = useRouter()
const workspacesStore = useWorkspacesStore()
const { dialogs } = storeToRefs(useDialogsStore())
const dialogsMapped = computed(() => Object.values<Dialog>(dialogs.value))

// FIXME: Heavy array operations in computed property
// This computed creates new array copy, sorts with Date parsing, and slices on every change.
// For large dialog lists, this could impact performance. Consider memoizing or moving to store.
// Alternative: cache sorted results or use a computed store getter with memoization.
const lastDialogs = computed(() => {
  return [...dialogsMapped.value]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, MAX_LAST_DIALOGS)
})

// FIXME: Nested array operations in computed property
// This computed maps over dialogs and finds workspace for each one, creating new objects.
// The find() operation in map() creates O(n²) complexity. Consider pre-indexing workspaces by ID.
// Alternative: create workspace lookup map in store or cache the result.
const lastDialogsWithWorkspace = computed(() =>
  workspacesStore.workspaces.length > 0
    ? lastDialogs.value.map((d) => {
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

function goToDialog (workspaceId: string, dialogId: string) {
  router.push(`/workspaces/${workspaceId}/dialogs/${dialogId}`)
}
</script>
