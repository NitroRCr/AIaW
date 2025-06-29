<template>
  <div>
    <workspace-list-select
      :model-value="route.params.workspaceId as string"
      @update:model-value="goTo($event)"
      accept="workspace"
    />
    <div
      mt-2
      pt-2
      class="bg-sur-c"
      style="position: sticky; bottom: 0; z-index: 1"
      align="middle"
    >
      <div class="row q-gutter-sm">
        <q-btn
          color="secondary"
          label=""
          icon="sym_o_add"
          flat
          :content-inset-level="0.5"
          class="col"
          @click="addWorkspace()"
        />
        <q-btn
          color="secondary"
          label=""
          icon="sym_o_search"
          flat
          :content-inset-level="0.5"
          class="col"
          @click="router.push('/workspaces')"
        />
      </div>
      <!-- <q-btn
        ml-1
        color="secondary"
        :label="$t('workspaceNav.folder')"
        icon="sym_o_create_new_folder"
        flat
        no-caps
        @click="addFolder()"
      /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useWorkspaceActions } from "@/features/workspaces/composables/useWorkspaceActions"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { Workspace } from "@/services/data/types/workspace"

import WorkspaceListSelect from "./WorkspaceListSelect.vue"

const { addWorkspace } = useWorkspaceActions()
const userDataStore = useUserDataStore()

const workspaceStore = useWorkspacesStore()
const router = useRouter()
const route = useRoute()

async function goTo (id: string) {
  const workspace = workspaceStore.workspaces.find(
    (w) => w.id === id
  ) as Workspace
  let path = `/workspaces/${workspace.id}`
  const dialogId = userDataStore.data.lastDialogIds[workspace.id]

  if (dialogId) path += `/dialogs/${dialogId}`

  router.push(path)
}
</script>
