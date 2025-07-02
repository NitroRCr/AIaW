<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("workspaces.title") }}
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
          <workspace-list
            :title="$t('workspaces.myWorkspaces')"
            :search-label="$t('workspaces.search')"
            :empty-state-message="$t('workspaces.noMyWorkspaces')"
            :items="myWorkspaces"
            :loading="loading"
            :show-header="false"
            :show-page-container="false"
            @action="handleWorkspaceAction"
          >
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
          </workspace-list>
        </q-tab-panel>

        <!-- Available Workspaces Tab -->
        <q-tab-panel name="available-workspaces">
          <workspace-list
            :title="$t('workspaces.availableWorkspaces')"
            :search-label="$t('workspaces.search')"
            :empty-state-message="$t('workspaces.noAvailableWorkspaces')"
            :items="filteredAvailableWorkspaces"
            :loading="loading"
            :show-header="false"
            :show-page-container="false"
            @action="handleWorkspaceAction"
          >
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
          </workspace-list>
        </q-tab-panel>
      </q-tab-panels>

      <q-inner-loading :showing="loading" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"

import { pageFhStyle } from "@/shared/utils/functions"

import WorkspaceList from "@/features/workspaces/components/WorkspaceList.vue"
import { useWorkspaceManager } from "@/features/workspaces/composables/useWorkspaceManager"

// Import debug utilities for development only
// if (process.env.NODE_ENV === 'development') {
//   import("@/features/workspaces/utils/debug")
// }

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

/**
 * UserWorkspacesManager Component
 *
 * This component provides a reactive interface for managing user workspaces.
 * It includes the following reactivity features:
 *
 * 1. Real-time subscriptions: Automatically updates when workspaces, workspace members,
 *    or user-workspace relationships change via database triggers
 *
 * 2. Immediate refresh after workspace creation: When a new workspace is created,
 *    both user workspace data AND workspace members data are refreshed to ensure
 *    the new workspace appears immediately with proper admin/owner functions
 *
 * 3. Optimized computed properties: Uses memoized computed properties for
 *    efficient workspace ownership and membership checks
 *
 * 4. Manual refresh methods: Provides refreshWorkspaces() and refreshUserWorkspacesOnly()
 *    methods for external components to trigger updates when needed
 *
 * 5. Debug utilities: In development mode, debug functions are available globally:
 *    - window.debugWorkspace(workspaceId) - Debug membership for a specific workspace
 *    - window.testWorkspaceReactivity(workspaceId) - Test reactivity after creation
 *    - window.forceRefreshWorkspaceData() - Force refresh all workspace data
 */

defineEmits<{
  'toggle-drawer': []
}>()

const tab = ref("my-workspaces")

// Use the workspace manager composable
const {
  // State
  loading,

  // Computed
  myWorkspaces,
  filteredAvailableWorkspaces,

  // Methods
  handleWorkspaceAction,
  initializeWorkspaces,
  refreshUserWorkspaces
} = useWorkspaceManager()

// Add a refresh method for external triggers (e.g., when a workspace is created elsewhere)
const refreshWorkspaces = async () => {
  await initializeWorkspaces()
}

// Add a method to refresh just the user workspaces (lighter refresh)
const refreshUserWorkspacesOnly = async () => {
  await refreshUserWorkspaces()
}

// Expose refresh methods to parent components if needed
defineExpose({
  refreshWorkspaces,
  refreshUserWorkspacesOnly
})

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
