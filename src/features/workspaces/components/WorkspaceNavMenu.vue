<template>
  <div>
    <workspace-list-select
      :model-value="route.params.workspaceId as string"
      @update:model-value="goTo($event)"
      accept="workspace"
    />
    <div mt-2>
      <q-btn
        ml-2
        color="secondary"
        :label="$t('workspaceNav.workspace')"
        icon="sym_o_add"
        flat
        no-caps
        @click="addWorkspace()"
      />
      <q-btn
        ml-1
        color="secondary"
        :label="$t('workspaceNav.folder')"
        icon="sym_o_create_new_folder"
        flat
        no-caps
        @click="addFolder()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useWorkspaceActions } from "@/features/workspaces/composables/workspaceActions"
import { useWorkspacesStore } from "@/features/workspaces/store"

import type { WorkspaceMapped } from "@/services/supabase/types"

import WorkspaceListSelect from "./WorkspaceListSelect.vue"

const { addWorkspace, addFolder } = useWorkspaceActions()
const userDataStore = useUserDataStore()

const workspaceStore = useWorkspacesStore()
const router = useRouter()
const route = useRoute()

async function goTo (id: string) {
  const workspace = workspaceStore.workspaces.find(
    (w) => w.id === id
  ) as WorkspaceMapped
  let path = `/workspaces/${workspace.id}`
  const dialogId = userDataStore.data.lastDialogIds[workspace.id]

  if (dialogId) path += `/dialogs/${dialogId}`

  router.push(path)
}
</script>
