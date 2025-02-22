<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      工作区设置
    </q-toolbar-title>
    <q-space />
  </view-common-header>
  <q-page-container>
    <q-page bg-sur>
      <q-list>
        <q-item>
          <q-item-section>
            默认助手
          </q-item-section>
          <q-item-section side>
            <q-select
              class="min-w-150px"
              filled
              dense
              v-model="workspace.defaultAssistantId"
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
            工作区图标
          </q-item-section>
          <q-item-section side>
            <a-avatar :avatar="workspace.avatar" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            主页内容
          </q-item-section>
          <q-item-section pl-4>
            <q-input
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
        工作区变量
      </q-item-label>
      <workspace-vars-input
        v-model="workspace.vars"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { computed, Ref, inject, toRaw } from 'vue'
import { Workspace } from 'src/utils/types'
import { useAssistantsStore } from 'src/stores/assistants'
import { syncRef } from 'src/composables/sync-ref'
import { useWorkspacesStore } from 'src/stores/workspaces'
import AssistantItem from 'src/components/AssistantItem.vue'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import { useQuasar } from 'quasar'
import PickAvatarDialog from 'src/components/PickAvatarDialog.vue'
import WorkspaceVarsInput from 'src/components/WorkspaceVarsInput.vue'
import { useSetTitle } from 'src/composables/set-title'

defineEmits(['toggle-drawer'])

const store = useWorkspacesStore()
const workspace = syncRef(
  inject('workspace') as Ref<Workspace>,
  val => { store.putItem(toRaw(val)) },
  { valueDeep: true }
)
const assistantsStore = useAssistantsStore()
const assistantOptions = computed(() => assistantsStore.assistants.filter(
  a => [workspace.value.id, '$root'].includes(a.workspaceId)
).map(a => ({
  label: a.name,
  value: a.id,
  assistant: a
})))

const $q = useQuasar()
function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: { model: workspace.value.avatar, defaultTab: 'icon' }
  }).onOk(avatar => { workspace.value.avatar = avatar })
}

useSetTitle(computed(() => `工作区设置 - ${workspace.value?.name}`))
</script>
