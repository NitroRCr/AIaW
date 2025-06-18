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
      >
        <AAvatar
          :avatar="dialog.workspace?.avatar"
          :label="dialog.workspace?.name"
          :flat="true"
          size="xs"
        />
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

const lastDialogs = computed(() => {
  return [...dialogsMapped.value]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, MAX_LAST_DIALOGS)
})

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
