<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("workspaceSettings.title") }}
    </q-toolbar-title>
  </view-common-header>

  <q-page-container>
    <q-page bg-sur>
      <loading-panel v-if="!isLoaded" />
      <notification-panel
        v-else-if="!isAdmin"
        :title="$t('common.noAdmin')"
        :warning="true"
      />
      <q-list v-else>
        <q-item>
          <q-item-section>
            {{ $t("workspacePage.isPublic") }}
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="workspace.isPublic" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            {{ $t("workspacePage.name") }}
          </q-item-section>
          <q-item-section>
            <q-input
              v-model="workspace.name"
              autogrow
              filled
              clearable
              placeholder="Name of workspace..."
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            {{ $t("workspacePage.description") }}
          </q-item-section>
          <q-item-section>
            <q-input
              v-model="workspace.description"
              autogrow
              filled
              clearable
              placeholder="Description of workspace..."
            />
          </q-item-section>
        </q-item>
        <q-separator spaced />

        <q-item>
          <q-item-section>
            {{ $t("workspaceSettings.defaultAssistant") }}
          </q-item-section>
          <q-item-section side>
            <q-select
              class="min-w-150px"
              filled
              dense
              v-model="userDataStore.data.defaultAssistantIds[workspace.id]"
              :options="assistantOptions"
              emit-value
              map-options
            >
              <template #option="{ itemProps, opt }">
                <assistant-item
                  v-bind="itemProps"
                  :assistant="opt.assistant"
                />
              </template>
            </q-select>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="pickAvatar"
        >
          <q-item-section>
            {{ $t("workspaceSettings.avatar") }}
          </q-item-section>
          <q-item-section side>
            <a-avatar :avatar="workspace.avatar" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            {{ $t("workspaceSettings.homeContent") }}
          </q-item-section>
          <q-item-section pl-4>
            <a-input
              filled
              v-model="workspace.indexContent"
              autogrow
              clearable
            />
          </q-item-section>
        </q-item>
      </q-list>
      <q-separator spaced />
      <q-item-label header>
        {{ $t("workspaceSettings.variables") }}
      </q-item-label>
      <vars-input
        v-model="workspace.vars"
        :input-props="{
          filled: true,
          autogrow: true,
          clearale: true,
          placeholder: $t('workspaceSettings.inputPlaceholder'),
        }"
      />
      <workspace-members
        v-if="!workspace.isPublic"
        :workspace-id="workspace.id"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, Ref, inject, toRaw } from "vue"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import LoadingPanel from "@/shared/components/LoadingPanel.vue"
import NotificationPanel from "@/shared/components/NotificationPanel.vue"
import { useSetTitle } from "@/shared/composables/setTitle"
import { syncRef } from "@/shared/composables/syncRef"
import { useUserDataStore } from "@/shared/store"

import AssistantItem from "@/features/assistants/components/AssistantItem.vue"
import { useAssistantsStore } from "@/features/assistants/store"
import VarsInput from "@/features/prompt/components/VarsInput.vue"
import WorkspaceMembers from "@/features/workspaces/components/WorkspaceMembers.vue"
import { useIsWorkspaceAdmin } from "@/features/workspaces/composables/useIsWorkspaceAdmin"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { Workspace } from "@/services/data/types/workspace"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
const { t } = useI18n()

defineEmits(["toggle-drawer"])
const userDataStore = useUserDataStore()
const store = useWorkspacesStore()
const workspace = syncRef(
  inject("workspace") as Ref<Workspace>,
  (val) => {
    store.putItem(toRaw(val))
  },
  { valueDeep: true }
)

const workspaceId = computed(() => workspace.value.id)
const { isAdmin, isLoaded } = useIsWorkspaceAdmin(workspaceId)

const assistantsStore = useAssistantsStore()
const assistantOptions = computed(() =>
  assistantsStore.assistants
    .filter((a) => [workspace.value.id, null].includes(a.workspaceId))
    .map((a) => ({
      label: a.name,
      value: a.id,
      assistant: a,
    }))
)

const $q = useQuasar()

function pickAvatar () {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: { model: workspace.value.avatar, defaultTab: "icon" },
  }).onOk((avatar) => {
    workspace.value.avatar = avatar
  })
}

useSetTitle(
  computed(() => `${t("workspaceSettings.title")} - ${workspace.value?.name}`)
)
</script>
