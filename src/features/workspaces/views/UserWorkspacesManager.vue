<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("availableWorkspaces.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container>
    <q-page
      p-2
      :style-fn="pageFhStyle"
    >
      <!-- Tabs -->
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
        mt-2
      >
        <q-tab
          name="my-workspaces"
          :label="$t('workspaces.myWorkspaces')"
        />
        <q-tab
          name="available-workspaces"
          :label="$t('workspaces.availableWorkspaces')"
        />
      </q-tabs>

      <q-separator />

      <q-tab-panels
        v-model="tab"
        animated
      >
        <!-- My Workspaces Tab -->
        <q-tab-panel name="my-workspaces">
          <data-list-manager
            :title="$t('workspaces.myWorkspaces')"
            :search-label="$t('workspaces.search')"
            :action-label="''"
            :empty-state-message="$t('workspaces.noMyWorkspaces')"
            :items="myWorkspaces"
            :loading="loading"
            :show-header="false"
            :show-page-container="false"
            @action="handleWorkspaceAction"
          >
            <template #avatar="{ item }">
              <a-avatar :avatar="item.avatar" />
            </template>

            <template #title="{ item }">
              <div class="row items-center q-gutter-sm">
                <span>{{ item.name }}</span>
              </div>
            </template>

            <template #subtitle="{ item }">
              <div>
                <div>{{ item.description || $t('workspaces.noDescription') }}</div>
                <div>{{ $t('workspaces.createdBy') }}: {{ getOwnerName(item) }}</div>
                <div v-if="item.isJoined">
                  {{ $t('workspaces.joinedAt') }}: {{ formatDate(item.createdAt) }}
                </div>
                <div v-else-if="item.isOwned">
                  {{ $t('workspaces.createdAt') }}: {{ formatDate(item.createdAt) }}
                </div>
              </div>
            </template>

            <template #actions="{ item }">
              <q-btn
                v-if="item.actionType === 'delete'"
                unelevated
                color="red"
                text-color="white"
                :label="$t('workspaces.delete')"
                @click="deleteWorkspace(item)"
                :loading="removing[item.id]"
              />
              <q-btn
                v-else-if="item.actionType === 'leave'"
                unelevated
                color="negative"
                text-color="white"
                :label="$t('workspaces.leave')"
                @click="leaveWorkspace(item)"
                :loading="removing[item.id]"
              />
            </template>

            <template #empty-state>
              <q-icon
                name="sym_o_group_work"
                size="4em"
                class="text-grey-5 q-mb-md"
              />
              <div class="text-h6 text-grey-6">
                {{ $t('workspaces.noMyWorkspaces') }}
              </div>
              <div class="text-body2 text-grey-5 q-mt-sm">
                {{ $t('workspaces.noMyWorkspacesHint') }}
              </div>
            </template>
          </data-list-manager>
        </q-tab-panel>

        <!-- Available Workspaces Tab -->
        <q-tab-panel name="available-workspaces">
          <data-list-manager
            :title="$t('workspaces.availableWorkspaces')"
            :search-label="$t('workspaces.search')"
            :action-label="''"
            :empty-state-message="$t('workspaces.noAvailableWorkspaces')"
            :items="filteredAvailableWorkspaces"
            :loading="loading"
            :show-header="false"
            :show-page-container="false"
            @action="handleWorkspaceAction"
          >
            <template #avatar="{ item }">
              <a-avatar :avatar="item.avatar" />
            </template>

            <template #title="{ item }">
              <div class="row items-center q-gutter-sm">
                <span>{{ item.name }}</span>
              </div>
            </template>

            <template #subtitle="{ item }">
              <div>
                <div>{{ item.description || $t('workspaces.noDescription') }}</div>
                <div>{{ $t('workspaces.createdBy') }}: {{ getOwnerName(item) }}</div>
                <div v-if="item.isJoined">
                  {{ $t('workspaces.joinedAt') }}: {{ formatDate(item.createdAt) }}
                </div>
                <div v-else-if="item.isOwned">
                  {{ $t('workspaces.createdAt') }}: {{ formatDate(item.createdAt) }}
                </div>
                <div v-else>
                  {{ $t('workspaces.createdAt') }}: {{ formatDate(item.createdAt) }}
                </div>
              </div>
            </template>

            <template #actions="{ item }">
              <q-btn
                v-if="item.actionType === 'delete'"
                unelevated
                color="red"
                text-color="white"
                :label="$t('workspaces.delete')"
                @click="deleteWorkspace(item)"
                :loading="removing[item.id]"
              />
              <q-icon
                v-else-if="item.actionType === 'leave'"
                name="sym_o_star"
                size="md"
                color="primary"
                class="q-px-md"
                style="display: flex; align-items: center; justify-content: center; min-height: 36px;"
              />
              <q-btn
                v-else-if="item.actionType === 'join'"
                unelevated
                color="primary"
                text-color="white"
                :label="$t('workspaces.join')"
                @click="joinWorkspace(item)"
                :loading="adding[item.id]"
              />
            </template>

            <template #empty-state>
              <q-icon
                name="sym_o_public"
                size="4em"
                class="text-grey-5 q-mb-md"
              />
              <div class="text-h6 text-grey-6">
                {{ $t('workspaces.noAvailableWorkspaces') }}
              </div>
              <div class="text-body2 text-grey-5 q-mt-sm">
                {{ $t('workspaces.noAvailableWorkspacesHint') }}
              </div>
            </template>
          </data-list-manager>
        </q-tab-panel>
      </q-tab-panels>

      <q-inner-loading :showing="loading" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import DataListManager from "@/shared/components/data/DataListManager.vue"
import { pageFhStyle } from "@/shared/utils/functions"

import { useWorkspaceManager } from "@/features/workspaces/composables/useWorkspaceManager"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

defineEmits<{
  'toggle-drawer': []
}>()

const tab = ref("my-workspaces")

// Use the workspace manager composable
const {
  // State
  loading,
  adding,
  removing,

  // Computed
  myWorkspaces,
  filteredAvailableWorkspaces,
  getOwnerName,

  // Methods
  handleWorkspaceAction,
  joinWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  initializeWorkspaces,
  formatDate
} = useWorkspaceManager()

// Initialize data
onMounted(async () => {
  await initializeWorkspaces()
})
</script>

<style scoped>
/* Custom styles */
.q-item__section--avatar {
  min-width: 48px;
}
</style>
