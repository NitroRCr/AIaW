<template>
  <q-item
    :key="assistant.id"
    clickable
    active-class="route-active"
    item-rd
    py-1.5
    min-h-0
    @click="setDefaultAssistant(assistant.id)"
  >
    <q-item-section
      avatar
      min-w-0
      v-close-popup
    >
      <a-avatar
        size="30px"
        :avatar="assistant.avatar"
      />
    </q-item-section>
    <q-item-section>
      {{ assistant.name }}
    </q-item-section>
    <q-badge
      bg-pri-c
      text-on-pri-c
      ml-2
      v-if="!assistant.workspaceId"
    >
      {{ $t("assistantItem.global") }}
    </q-badge>
    <menu-button :menu-ref="toRef(menuAssistantRef)" />
    <q-menu
      context-menu
      ref="menuAssistantRef"
    >
      <q-list style="min-width: 100px">
        <menu-item
          icon="sym_o_add_comment"
          :label="$t('assistantsExpansion.createDialog')"
          @click="createDialog({ assistantId: assistant.id })"
        />
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
          :to="getLink(assistant.id)"
          hover:text-primary
        />
      </q-list>
    </q-menu>
  </q-item>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useQuasar, QMenu } from "quasar"
import { ref, toRef, computed } from "vue"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import MenuButton from "@/shared/components/menu/MenuButton.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { useUserDataStore } from "@/shared/store"
import { dialogOptions } from "@/shared/utils/values"

import { useAssistantsStore } from "@/features/assistants/store"
import { useCreateDialog } from "@/features/dialogs/composables"
import SelectWorkspaceDialog from "@/features/workspaces/components/SelectWorkspaceDialog.vue"

import { Assistant } from "@/services/data/types/assistant"

const props = defineProps({
  assistant: { type: Object, required: true },
  workspaceId: { type: String, default: null },
  getLink: { type: Function, required: true },
})

const { t } = useI18n()
const menuAssistantRef = ref<QMenu | null>(null)
const assistantsStore = useAssistantsStore()
const { data: userData } = storeToRefs(useUserDataStore())
const { createDialog } = useCreateDialog(props.workspaceId)

const assistant = computed(() => props.assistant as Assistant)
const $q = useQuasar()
// const defaultAssistantId = computed(() => workspaceId.value ? userData.value.defaultAssistantIds[workspaceId.value] : null)

function setDefaultAssistant (id) {
  userData.value.defaultAssistantIds[props.workspaceId] = id
}

function move (id, workspaceId) {
  assistantsStore.update(id, { workspaceId })
}

function moveToWorkspace (id) {
  $q.dialog({
    component: SelectWorkspaceDialog,
    componentProps: {
      accept: "workspace",
    },
  }).onOk((workspaceId) => {
    move(id, workspaceId)
  })
}

function deleteItem ({ id, name }) {
  $q.dialog({
    title: t("assistantsExpansion.deleteConfirmTitle"),
    message: t("assistantsExpansion.deleteConfirmMessage", { name }),
    cancel: true,
    ok: {
      label: t("assistantsExpansion.delete"),
      color: "err",
      flat: true,
    },
    ...dialogOptions,
  }).onOk(() => {
    assistantsStore.delete(id)
  })
}
</script>
