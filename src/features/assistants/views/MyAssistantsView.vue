<template>
  <q-page-container>
    <view-common-header @toggle-drawer="$emit('toggle-drawer')">
      <q-toolbar-title>
        {{ workspace?.name }} {{ $t('myAssistants.myAssistants') }}
      </q-toolbar-title>
    </view-common-header>
    <q-page class="my-assistants-page">
      <card-view
        :add-button-caption="$t('myAssistants.newAssistant')"
        @add="addAssistant"
        :find-button-caption="$t('myAssistants.findAssistant')"
        @find="navigateToAssistants"
      >
        <card-item
          v-for="assistant in assistants"
          :key="assistant.id"
          :name="assistant.name"
          :description="assistant.description || $t('myAssistants.noDescription')"
          :avatar="assistant.avatar"
          @click="setDefaultAssistant(assistant.id)"
          :show-more-btn="true"
          :badge="assistant.workspaceId ? $t('assistantItem.workspace') : $t('assistantItem.global')"
          :badge-color="assistant.workspaceId ? 'var(--q-primary)' : 'var(--q-secondary)'"
        >
          <template #menu>
            <q-menu>
              <q-list style="min-width: 100px">
                <menu-item
                  icon="sym_o_move_item"
                  :label="$t('assistantsExpansion.moveToGlobal')"
                  @click="move(assistant.id, null)"
                />
                <menu-item
                  icon="sym_o_move_item"
                  :label="$t('assistantsExpansion.moveToWorkspace')"
                  @click="moveToWorkspace(assistant.id)"
                />
                <menu-item
                  icon="sym_o_delete"
                  :label="$t('assistantsExpansion.delete')"
                  @click="deleteItem(assistant)"
                  hover:text-err
                />
                <menu-item
                  icon="sym_o_settings"
                  :label="$t('assistantsExpansion.settings')"
                  @click="goToSettings(assistant.id)"
                  hover:text-primary
                />
              </q-list>
            </q-menu>
          </template>
          <div class="assistant-card-content">
            <div
              class="assistant-stats"
              mb-2
            >
              <q-chip
                :icon="assistant.provider?.type ? 'sym_o_psychology' : 'sym_o_question_mark'"
                :label="assistant.provider?.type || $t('myAssistants.unset')"
                size="md"
                outline
              />
              <q-chip
                v-if="assistant.model"
                icon="sym_o_neurology"
                :label="`${assistant.model.name}`"
                size="md"
                outline
              />
            </div>
          </div>
        </card-item>
      </card-view>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useQuasar, QMenu } from 'quasar'
import { computed, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'

import CardItem from '@/shared/components/cards/CardItem.vue'
import CardView from '@/shared/components/cards/CardView.vue'
import MenuItem from '@/shared/components/menu/MenuItem.vue'
import { useUserPerfsStore, useUserDataStore } from '@/shared/store'
import { defaultAvatar } from '@/shared/utils/functions'

import { useAssistantsStore } from '@/features/assistants/store'
import SelectWorkspaceDialog from '@/features/workspaces/components/SelectWorkspaceDialog.vue'
import { useActiveWorkspace } from '@/features/workspaces/composables/useActiveWorkspace'

import ViewCommonHeader from '@/layouts/components/ViewCommonHeader.vue'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const { t } = useI18n()

defineEmits(["toggle-drawer"])
const workspaceId = route.params.workspaceId as string
const assistantsStore = useAssistantsStore()
const { data: perfs } = storeToRefs(useUserPerfsStore())
const { data: userData } = storeToRefs(useUserDataStore())
const { workspace } = useActiveWorkspace()
const assistants = computed(() =>
  assistantsStore.assistants.filter(
    (a) => a.workspaceId === workspaceId || a.workspaceId == null
  )
)

function setDefaultAssistant(id: string) {
  userData.value.defaultAssistantIds[workspaceId] = id
  const lastDialogId = userData.value.lastDialogIds[workspaceId]
  const dialogPath = lastDialogId ? `/dialogs/${lastDialogId}` : ""
  router.push(`/workspaces/${workspaceId}${dialogPath}`)
}

function goToSettings(id: string) {
  router.push(`/workspaces/${workspaceId}/assistants/${id}`)
}

function move(id: string, newWorkspaceId: string | null) {
  assistantsStore.update(id, { workspaceId: newWorkspaceId })
}

function moveToWorkspace(id: string) {
  $q.dialog({
    component: SelectWorkspaceDialog,
    componentProps: {
      accept: "workspace",
    },
  }).onOk((newWorkspaceId: string) => {
    move(id, newWorkspaceId)
  })
}

function deleteItem(assistant: any) {
  $q.dialog({
    title: t("assistantsExpansion.deleteConfirmTitle"),
    message: t("assistantsExpansion.deleteConfirmMessage", { name: assistant.name }),
    cancel: true,
    ok: {
      label: t("assistantsExpansion.delete"),
      color: "err",
      flat: true,
    },
  }).onOk(() => {
    assistantsStore.delete(assistant.id)
  })
}

function navigateToAssistants() {
  router.push(`/assistants`)
}

async function addAssistant () {
  const assistant = await assistantsStore.add({
    name: "New Assistant",
    workspaceId,
    avatar: defaultAvatar("AI"),
    provider: perfs.value.provider,
    model: perfs.value.model,
  })
  router.push(`/workspaces/${workspaceId}/assistants/${assistant.id}`)
}
</script>

<style lang="scss" scoped>
.my-assistants-page {
  padding: 24px;
  max-width: 1024px;
  margin-right: auto;
}

.assistant-card-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 8px;
}

.assistant-stats {
  display: flex;
  gap: 8px;
}
</style>
