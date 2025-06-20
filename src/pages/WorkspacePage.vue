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
      <dragable-separator
        v-if="showArtifacts"
        v-model="widthWithArtifacts"
        reverse
        :min="600"
        h-full
        w-2
      />
      <div
        v-if="showArtifacts"
        h-full
        min-w-0
        flex="~ col 1"
      >
        <div
          flex
          items-center
          h="50px"
        >
          <q-tabs
            inline-label
            dense
            mt="14px"
            rd-t
          >
            <q-route-tab
              no-caps
              v-for="artifact in openedArtifacts"
              :key="artifact.id"
              :to="{ query: { artifactId: artifact.id } }"
              :class="{
                'text-pri icon-fill': focusedArtifact?.id === artifact.id,
              }"
              pl-3
              pr-2
            >
              <artifact-item-icon :artifact="artifact" />
              <div ml-2>
                {{ artifact.name }}
              </div>
              <div v-if="artifactUnsaved(artifact)">
                *
              </div>
              <q-btn
                ml-1
                flat
                dense
                round
                icon="sym_o_close"
                :title="$t('workspacePage.closeArtifact')"
                size="sm"
                text-out
                @click.prevent.stop="closeArtifact(artifact)"
              />
              <artifact-item-menu :artifact />
            </q-route-tab>
          </q-tabs>
          <q-space />
          <q-btn
            flat
            dense
            round
            icon="sym_o_close"
            :title="$t('workspacePage.closeAllArtifacts')"
            text-on-sur-var
            @click="closeAllArtifacts"
          />
        </div>
        <edit-artifact
          :artifact="focusedArtifact"
          v-if="focusedArtifact"
        />
      </div>
      <div
        w="250px"
        h-full
        flex="~ col"
      >
        <!-- <div
          h="48px"
          p-2
          flex
          items-center
        >
          <q-space /> -->

        <!-- TODO: remove -->
        <!-- <q-btn
            flat
            dense
            round
            icon="sym_o_settings"
            :to="`/workspaces/${id}/settings`"
            :class="{'route-active': route.path === `/workspaces/${id}/settings`}"
            :title="$t('workspacePage.workspaceSettings')"
          /> -->
        <!-- </div> -->
        <!-- <assistants-expansion
          :model-value="listOpen.assistants"
          @update:model-value="setListOpen('assistants', $event)"
          :workspace-id="workspace.id"
          dense
        /> -->
        <template v-if="isPlatformEnabled(perfs.artifactsEnabled)">
          <q-separator />
          <artifacts-expansion
            :model-value="listOpen.artifacts"
            @update:model-value="setListOpen('artifacts', $event)"
            of-y-auto
          />
        </template>
        <!-- <chats-expansion
          :workspace-id="workspace.id"
          :model-value="listOpen.chats"
          @update:model-value="setListOpen('chats', $event)"
          max-h="40vh"
          of-y-auto
        />
        <q-separator /> -->
        <!-- <dialogs-expansion
          :workspace-id="workspace.id"
          :model-value="listOpen.dialogs"
          @update:model-value="setListOpen('dialogs', $event)"
          flex-1
          of-y-auto
        /> -->
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
import { useRoute, useRouter } from "vue-router"

import DragableSeparator from "@/shared/components/DragableSeparator.vue"
import { useUserPerfsStore } from "@/shared/store"
import { ListOpen, useUserDataStore } from "@/shared/store/userData"
import { artifactUnsaved, isPlatformEnabled } from "@/shared/utils/functions"

import ArtifactItemIcon from "@/features/artifacts/components/ArtifactItemIcon.vue"
import ArtifactItemMenu from "@/features/artifacts/components/ArtifactItemMenu.vue"
import ArtifactsExpansion from "@/features/artifacts/components/ArtifactsExpansion.vue"
import { useCloseArtifact } from "@/features/artifacts/composables/useCloseArtifact"
import { useArtifactsStore } from "@/features/artifacts/store"
import EditArtifact from "@/features/artifacts/views/EditArtifact.vue"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { Artifact } from "@/services/data/types/artifact"
import { Workspace } from "@/services/data/types/workspace"

import ErrorNotFound from "@/pages/ErrorNotFound.vue"

const props = defineProps<{
  id: string
}>()

const workspacesStore = useWorkspacesStore()
const userStore = useUserDataStore()

const artifactsStore = useArtifactsStore()
const listOpen = computed(
  () =>
    userStore.data.listOpen[props.id] || {
      assistants: true,
      artifacts: false,
      dialogs: true,
      chats: true,
    }

)

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
const showArtifacts = computed(
  () => $q.screen.width > drawerBreakpoint && openedArtifacts.value.length
)
provide("showArtifacts", showArtifacts)
const route = useRoute()
const focusedArtifact = computed(
  () =>
    openedArtifacts.value.find((a) => a.id === route.query.artifactId) ||
    openedArtifacts.value.at(-1)
)
const router = useRouter()

console.log("ws page opened artifacts", openedArtifacts.value, focusedArtifact)

watch(
  focusedArtifact,
  (val) => {
    if (val) {
      val.id !== route.query.artifactId &&
        router.replace({ query: { artifactId: val.id } })
    } else {
      router.replace({ query: { artifactId: undefined } })
    }
  },
  { immediate: true }
)

const { closeArtifact } = useCloseArtifact()

function closeAllArtifacts () {
  for (const artifact of openedArtifacts.value) {
    closeArtifact(artifact)
  }
}
const widthWithArtifacts = ref(Math.max(innerWidth / 2, 600))
const drawerWidth = computed(() =>
  showArtifacts.value ? widthWithArtifacts.value : 250
)

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

const drawerOpen = ref(false)
// console.log("drawerOpen", drawerOpen.value, userStore.ready)
// watch(drawerOpen, (val) => {
//   if (userStore.ready) {
//     console.log("drawerOpen", val, userStore.data, workspace.value.id)

//     if (userStore.data.listOpen[workspace.value.id]) {
//       userStore.data.listOpen[workspace.value.id] = {
//         ...userStore.data.listOpen[workspace.value.id],
//         artifacts: val,
//       }
//     } else {
//       userStore.data.listOpen[workspace.value.id] = {
//         assistants: true,
//         dialogs: true,
//         chats: true,
//         artifacts: val,
//       }
//     }
//   }
// })

const rightDrawerAbove = computed(() => $q.screen.width > drawerBreakpoint)
provide("rightDrawerAbove", rightDrawerAbove)

const { data: perfs } = useUserPerfsStore()

function setListOpen (key: keyof ListOpen, value: boolean) {
  if (!userStore.data.listOpen[workspace.value.id]) {
    userStore.data.listOpen[workspace.value.id] = {
      assistants: true,
      artifacts: false,
      dialogs: true,
      chats: true,
    }
  }

  userStore.data.listOpen[workspace.value.id][key] = value
}
</script>
