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
          :badge="workspace.isPublic ? $t('myWorkspaces.public') : $t('myWorkspaces.private')"
          :badge-color="workspace.isPublic ? 'var(--q-primary)' : 'var(--q-negative)'"
          :subtitle="`by ${getOwnerName(workspace)}`"
        >
          <template #menu>
            <q-menu>
              <q-list style="min-width: 150px">
                <q-item
                  v-if="workspace?.type === 'folder'"
                  clickable
                  @click="addWorkspace(workspace.id)"
                >
                  <q-item-section avatar>
                    <q-icon name="sym_o_add" />
                  </q-item-section>
                  <q-item-section>{{ $t('workspaceListItem.newWorkspace') }}</q-item-section>
                </q-item>

                <q-item
                  v-if="workspace?.type === 'folder'"
                  clickable
                  @click="addFolder(workspace.id)"
                >
                  <q-item-section avatar>
                    <q-icon name="sym_o_create_new_folder" />
                  </q-item-section>
                  <q-item-section>{{ $t('workspaceListItem.newFolder') }}</q-item-section>
                </q-item>

                <q-separator v-if="workspace?.type === 'folder'" />
                <q-item
                  clickable
                  @click="router.push(`/workspaces/${workspace.id}/settings`)"
                >
                  <q-item-section avatar>
                    <q-icon name="sym_o_settings" />
                  </q-item-section>
                  <q-item-section>{{ $t('myWorkspaces.settings') }}</q-item-section>
                </q-item>
                <q-item
                  clickable
                  @click="deleteItem(workspace)"
                >
                  <q-item-section avatar>
                    <q-icon name="sym_o_delete" />
                  </q-item-section>
                  <q-item-section>{{ $t('workspaceListItem.delete') }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </template>
          <div class="workspace-card-content">
            <!-- You can add more content here if needed -->
            <div class="workspace-actions">
              <q-btn
                icon="sym_o_exit_to_app"
                color="negative"
                :label="$t('myWorkspaces.leave')"
                flat
                dense
                size="md"
                @click.stop="leaveWorkspace(workspace)"
              />
            </div>
          </div>
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
        </card-item>
      </card-view>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { QMenu } from 'quasar'
import { useRouter } from 'vue-router'

import { CardView, CardItem } from '@/shared/components/cards'
import { useUserDataStore } from '@/shared/store'

import { useRootWorkspace, useRightsManagement } from '@/features/workspaces/composables'
import { useWorkspaceActions } from '@/features/workspaces/composables/useWorkspaceActions'

import { Workspace } from '@/services/data/types/workspace'

import { useWorkspaceManager } from '../composables/useWorkspaceManager'

import ViewCommonHeader from '@/layouts/components/ViewCommonHeader.vue'

const router = useRouter()
const userDataStore = useUserDataStore()
defineEmits(["toggle-drawer"])
const { isUserWorkspaceAdmin } = useRightsManagement()
const { addWorkspace, addFolder, deleteItem } = useWorkspaceActions()
const {
  getOwnerName,
  leaveWorkspace,
} = useWorkspaceManager()
const workspaces = useRootWorkspace(null)

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

</script>

<style lang="scss" scoped>
.my-workspaces-page {
  padding: 24px;
  max-width: 1024px;
  margin-right: auto;
}

.workspace-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.workspace-actions {
  display: flex;
  gap: 4px;
  margin-top: auto;
  align-self: flex-end;
}

.workspace-stats {
  display: flex;
  gap: 8px;
}
</style>
