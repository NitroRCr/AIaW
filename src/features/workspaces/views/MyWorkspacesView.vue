<template>
  <q-page-container>
    <view-common-header @toggle-drawer="$emit('toggle-drawer')">
      <q-toolbar-title>
        {{ $t('myWorkspaces.myWorkspaces') }}
      </q-toolbar-title>
    </view-common-header>
    <q-page class="my-workspaces-page">
      <card-view
        :add-button-caption="$t('myWorkspaces.newWorkspace')"
        :find-button-caption="$t('myWorkspaces.findWorkspace')"
        @add="addWorkspace"
        @find="navigateToWorkspaces"
      >
        <card-item
          v-for="workspace in workspaces"
          :key="workspace.id"
          :name="workspace.name"
          :description="workspace.description || $t('myWorkspaces.noDescription')"
          :avatar="workspace.avatar"
          :show-more-btn="isUserWorkspaceAdmin(workspace.id)"
          :more-tooltip="$t('myWorkspaces.options')"
          @click="selectWorkspace(workspace)"
          @more-click="showContextMenu($event as MouseEvent, workspace)"
          :badge="workspace.isPublic ? $t('myWorkspaces.public') : $t('myWorkspaces.private')"
          :badge-color="workspace.isPublic ? 'var(--q-primary)' : 'var(--q-negative)'"
        >
          <div class="workspace-card-content">
            <!-- <div class="workspace-stats">
              <q-chip
                v-if="workspace.type === 'folder'"
                icon="sym_o_folder"
                :label="$t('myWorkspaces.folder')"
                size="sm"
                outline
              />
              <q-chip
                v-else
                icon="sym_o_work"
                :label="$t('myWorkspaces.workspace')"
                size="sm"
                outline
              />
            </div> -->
          </div>
        </card-item>
      </card-view>

      <q-menu
        ref="contextMenuRef"
        context-menu
      >
        <q-list style="min-width: 150px">
          <q-item
            v-if="selectedWorkspace?.type === 'folder'"
            clickable
            @click="addWorkspace(selectedWorkspace.id)"
          >
            <q-item-section avatar>
              <q-icon name="sym_o_add" />
            </q-item-section>
            <q-item-section>{{ $t('workspaceListItem.newWorkspace') }}</q-item-section>
          </q-item>

          <q-item
            v-if="selectedWorkspace?.type === 'folder'"
            clickable
            @click="addFolder(selectedWorkspace.id)"
          >
            <q-item-section avatar>
              <q-icon name="sym_o_create_new_folder" />
            </q-item-section>
            <q-item-section>{{ $t('workspaceListItem.newFolder') }}</q-item-section>
          </q-item>

          <q-separator v-if="selectedWorkspace?.type === 'folder'" />
          <q-item
            clickable
            @click="router.push(`/workspaces/${selectedWorkspace.id}/settings`)"
            class="text-negative"
          >
            <q-item-section avatar>
              <q-icon name="sym_o_settings" />
            </q-item-section>
            <q-item-section>{{ $t('myWorkspaces.settings') }}</q-item-section>
          </q-item>
          <q-item
            clickable
            @click="deleteItem(selectedWorkspace)"
            class="text-negative"
          >
            <q-item-section avatar>
              <q-icon name="sym_o_delete" />
            </q-item-section>
            <q-item-section>{{ $t('workspaceListItem.delete') }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { QMenu } from 'quasar'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { CardView, CardItem } from '@/shared/components/cards'
import { useUserDataStore } from '@/shared/store'

import { useRootWorkspace, useRightsManagement } from '@/features/workspaces/composables'
import { useWorkspaceActions } from '@/features/workspaces/composables/useWorkspaceActions'

import { Workspace } from '@/services/data/types/workspace'

import ViewCommonHeader from '@/layouts/components/ViewCommonHeader.vue'

const router = useRouter()
const userDataStore = useUserDataStore()
defineEmits(["toggle-drawer"])
const { isUserWorkspaceAdmin } = useRightsManagement()
const { addWorkspace, addFolder, deleteItem } = useWorkspaceActions()

const workspaces = useRootWorkspace(null)
const contextMenuRef = ref<QMenu | null>(null)
const selectedWorkspace = ref<Workspace | null>(null)
console.log("--my-workspaces-view", workspaces.value)

function selectWorkspace(workspace: Workspace) {
  let path = `/workspaces/${workspace.id}`
  const dialogId = userDataStore.data.lastDialogIds[workspace.id]

  if (dialogId) {
    path += `/dialogs/${dialogId}`
  }

  router.push(path)
}

function navigateToWorkspaces() {
  router.push('/workspaces')
}

function showContextMenu(event: MouseEvent, workspace: Workspace) {
  selectedWorkspace.value = workspace
  contextMenuRef.value?.show(event)
}
</script>

<style lang="scss" scoped>
.my-workspaces-page {
  padding: 24px;
  max-width: 1024px;
  margin-right: auto;
}

.workspace-card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.workspace-stats {
  display: flex;
  gap: 8px;
}

.workspace-actions {
  display: flex;
  gap: 4px;
}
</style>
