<template>
  <template v-if="workspace">
    <router-view @toggle-drawer="drawerOpen = !drawerOpen" />
    <q-drawer
      show-if-above
      bg-sur-c-low
      :width="drawerWidth"
      :breakpoint="drawerBreakpoint"
      side="right"
      v-model="drawerOpen"
      flex
    >
      <artifacts-panel
        :workspace-id="id"
        :show-artifacts="showArtifacts"
        v-model:width="widthWithArtifacts"
      />
      <div
        w="250px"
        h-full
        flex="~ col"
      >
        <q-separator
          mt-0
        />
        <!-- <icon-side-button
          icon="sym_o_settings"
          :to="`/workspaces/${id}/settings`"
          :title="'Settings'"
          v-if="isUserWorkspaceAdmin(workspace?.id)"
          :active="false"
        /> -->
        <q-list>
          <q-expansion-item
            label="Files"
            class="panel-item"
            icon="sym_o_attach_file"
          >
            <q-card>
              <q-card-section>
                Not implemented yet
              </q-card-section>
            </q-card>
          </q-expansion-item>
          <artifacts-expansion />

          <chat-expansion
            :workspace-id="workspace.id"
            :active="activeTab === 'chats'"
          />
        </q-list>
        <template v-if="isPlatformEnabled(perfs.artifactsEnabled)">
          <!-- <artifacts-expansion
            :model-value="true"
            of-y-auto
          /> -->
        </template>
      </div>
    </q-drawer>
  </template>
  <error-not-found
    v-else
    drawer-toggle
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, provide, ref, watch } from "vue"

import { useUserPerfsStore } from "@/shared/store"
import { useUserDataStore } from "@/shared/store/userData"
import { isPlatformEnabled } from "@/shared/utils/functions"

import ArtifactsExpansion from "@/features/artifacts/components/ArtifactsExpansion.vue"
import { useArtifactsStore } from "@/features/artifacts/store"
import ChatExpansion from "@/features/chats/components/ChatExpansion.vue"
import ArtifactsPanel from "@/features/workspaces/components/ArtifactsPanel.vue"
import { useRightsManagement } from "@/features/workspaces/composables"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { Artifact } from "@/services/data/types/artifact"
import { Workspace } from "@/services/data/types/workspace"

import ErrorNotFound from "@/pages/ErrorNotFound.vue"

const props = defineProps<{
  id: string
}>()
const { isUserWorkspaceAdmin } = useRightsManagement()
const workspacesStore = useWorkspacesStore()
const userStore = useUserDataStore()

const artifactsStore = useArtifactsStore()

const activeTab = ref<"chats" | "files" | "artifacts">("chats")

const workspace = computed<Workspace | undefined>(
  () =>
    workspacesStore.workspaces.find(
      (item) => item.id === props.id
    ) as Workspace
)

const artifacts = computed(() =>
  Object.values(artifactsStore.workspaceArtifacts[props.id] || {}).map(
    (a) => a as Artifact
  )
)

provide("workspace", workspace)
provide("artifacts", artifacts)

const $q = useQuasar()

const drawerBreakpoint = 960
// TODO: opened artifacts should be USER settings
const userDataStore = useUserDataStore()

const openedArtifacts = computed(() =>
  artifacts.value.filter((a) =>
    userDataStore.data.openedArtifacts.includes(a.id)
  )
)

const widthWithArtifacts = ref(Math.max(innerWidth / 2, 600))

const drawerWidth = computed(() =>
  showArtifacts.value ? widthWithArtifacts.value : 250
)

const showArtifacts = computed(
  () => $q.screen.width > drawerBreakpoint && openedArtifacts.value.length > 0
)

provide("showArtifacts", showArtifacts)

const { data } = useUserDataStore()

watch(
  workspace,
  (val) => {
    if (val) {
      data.lastWorkspaceId = val.id
    }
  },
  { immediate: true }
)

const drawerOpen = computed({
  get() {
    return !userStore.ready ? false : userStore.data.rightSidebarOpen ?? false
  },
  set(val) {
    userStore.data.rightSidebarOpen = val
  }
})

const rightDrawerAbove = computed(() => $q.screen.width > drawerBreakpoint)
provide("rightDrawerAbove", rightDrawerAbove)

const { data: perfs } = useUserPerfsStore()

</script>
<style>
  .q-item {
    min-height: 40px;
  }
  .q-card {
   min-height: 200px;
  }
</style>
