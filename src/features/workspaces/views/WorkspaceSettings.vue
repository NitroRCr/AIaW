<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("workspaceSettings.title") }}
    </q-toolbar-title>
  </view-common-header>

  <q-page-container>
    <q-page
      bg-sur
      class="relative-position"
    >
      <loading-panel v-if="!isLoaded" />
      <notification-panel
        v-else-if="!isAdmin"
        :title="$t('common.noAdmin')"
        :warning="true"
      />
      <q-list v-else>
        <q-item v-if="workspace">
          <q-item-section>
            {{ $t("workspacePage.isPublic") }}
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="workspace.is_public" />
          </q-item-section>
        </q-item>
        <q-item v-if="workspace">
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
        <q-item v-if="workspace">
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

        <q-item v-if="workspace">
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
          v-if="workspace"
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
        <q-item v-if="workspace">
          <q-item-section avatar>
            {{ $t("workspaceSettings.homeContent") }}
          </q-item-section>
          <q-item-section pl-4>
            <a-input
              filled
              v-model="workspace.index_content"
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
        v-if="workspace"
        v-model="workspace.vars"
        :input-props="{
          filled: true,
          autogrow: true,
          clearale: true,
          placeholder: $t('workspaceSettings.inputPlaceholder'),
        }"
      />
      <workspace-members
        v-if="workspace && !workspace.is_public"
        :workspace-id="workspace.id"
      />

      <!-- Sticky Save Button -->
      <q-btn
        fab
        icon="sym_o_save"
        color="primary"
        class="sticky-save-btn"
        @click="saveWorkspace"
        :loading="store.isSaving"
        :disable="!store.hasChanges"
        v-if="isAdmin"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, toRaw } from "vue"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import LoadingPanel from "@/shared/components/ui/LoadingPanel.vue"
import NotificationPanel from "@/shared/components/ui/NotificationPanel.vue"
import { useSetTitle } from "@/shared/composables/setTitle"
import { useUserDataStore } from "@/shared/store"

import AssistantItem from "@/features/assistants/components/AssistantItem.vue"
import { useAssistantsStore } from "@/features/assistants/store"
import VarsInput from "@/features/prompt/components/VarsInput.vue"
import WorkspaceMembers from "@/features/workspaces/components/WorkspaceMembers.vue"
import { useIsWorkspaceAdmin } from "@/features/workspaces/composables/useIsWorkspaceAdmin"
import { useWorkspacesStore } from "@/features/workspaces/store"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

const { t } = useI18n()

const props = defineProps<{
  id: string
}>()

defineEmits(["toggle-drawer"])
const userDataStore = useUserDataStore()
const store = useWorkspacesStore()
const $q = useQuasar()

const workspaceId = computed(() => props.id)
const workspace = computed(() => store.workspaces.find(w => w.id === workspaceId.value))

console.log("[DEBUG] workspace", workspaceId)

const { isAdmin, isLoaded } = useIsWorkspaceAdmin(workspaceId)

const assistantsStore = useAssistantsStore()
const assistantOptions = computed(() =>
  workspace.value ? assistantsStore.assistants
    .filter((a) => [workspace.value.id, null].includes(a.workspace_id))
    .map((a) => ({
      label: a.name,
      value: a.id,
      assistant: a,
    })) : []
)

function pickAvatar () {
  if (!workspace.value) return

  $q.dialog({
    component: PickAvatarDialog,
    componentProps: { model: workspace.value.avatar, defaultTab: "icon" },
  }).onOk((avatar) => {
    // Create a new object to trigger reactivity
    const updatedWorkspace = { ...workspace.value!, avatar }
    Object.assign(workspace.value!, updatedWorkspace)
  })
}

async function saveWorkspace() {
  if (!workspace.value) return

  try {
    await store.updateItem(workspace.value.id, toRaw(workspace.value))
    $q.notify({
      type: 'positive',
      message: 'Workspace settings saved'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error saving workspace settings'
    })
  }
}

useSetTitle(
  computed(() => `${t("workspaceSettings.title")} - ${workspace.value?.name}`)
)
</script>
