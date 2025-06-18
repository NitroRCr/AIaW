<template>
  <q-expansion-item
    header-class="text-lg py-0"
    expand-icon-class="important:pl-2"
  >
    <template #header>
      <q-item-section>
        {{ label || $t("assistantsExpansion.assistants") }}
      </q-item-section>
      <q-item-section side>
        <import-assistant-button />
        <!-- <q-btn
          flat
          dense
          round
          v-if="dense"
          icon="sym_o_add"
          :title="$t('assistantsExpansion.createAssistant')"
          @click.prevent.stop="addItem"
        /> -->
      </q-item-section>
    </template>
    <template #default>
      <q-list mb-2>
        <q-item
          v-for="assistant in assistants"
          :key="assistant.id"
          clickable
          :to="getLink(assistant.id)"
          active-class="route-active"
          item-rd
          py-1.5
          min-h-0
        >
          <q-item-section
            avatar
            min-w-0
          >
            <a-avatar
              size="30px"
              :avatar="assistant.avatar"
            />
          </q-item-section>
          <q-item-section>
            {{ assistant.name }}
          </q-item-section>
          <q-menu context-menu>
            <q-list style="min-width: 100px">
              <menu-item
                v-if="!workspaceId"
                icon="sym_o_add_comment"
                :label="$t('assistantsExpansion.createDialog')"
                @click="createDialog({ assistant_id: assistant.id })"
              />
              <menu-item
                v-if="!workspaceId"
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
            </q-list>
          </q-menu>
        </q-item>
        <q-item
          v-if="!dense"
          clickable
          @click="addItem"
          text-sec
          item-rd
          min-h="42px"
        >
          <q-item-section
            avatar
            min-w-0
          >
            <q-icon name="sym_o_add" />
          </q-item-section>
          <q-item-section>
            {{ $t("assistantsExpansion.createAssistant") }}
          </q-item-section>
        </q-item>
      </q-list>
    </template>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { useUserPerfsStore } from "@/shared/store"
import { defaultAvatar } from "@/shared/utils/functions"
import { dialogOptions } from "@/shared/utils/values"

import { useAssistantsStore } from "@/features/assistants/store"
import { useCreateDialog } from "@/features/dialogs/composables/createDialog"
import SelectWorkspaceDialog from "@/features/workspaces/components/SelectWorkspaceDialog.vue"

import ImportAssistantButton from "./ImportAssistantButton.vue"

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    workspaceId?: string | null
    dense?: boolean
    label?: string
  }>(),
  {
    workspaceId: null,
    label: "",
  }
)

const assistantsStore = useAssistantsStore()
const userPerfsStore = useUserPerfsStore()
const assistants = computed(() =>
  assistantsStore.assistants.filter(
    (a) => a.workspace_id === props.workspaceId || a.workspace_id == null
  )
)

function getLink (id) {
  return !props.workspaceId
    ? `/assistants/${id}`
    : `/workspaces/${props.workspaceId}/assistants/${id}`
}
const router = useRouter()

async function addItem () {
  const assistant = await assistantsStore.add({
    name: "New Assistant",
    workspace_id: props.workspaceId,
    avatar: defaultAvatar("AI"),
    provider: userPerfsStore.data.provider,
    model: userPerfsStore.data.model,
  })
  router.push(getLink(assistant.id))
}

function move (id, workspaceId) {
  assistantsStore.update(id, { workspaceId })
}
const $q = useQuasar()

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

const { createDialog } = useCreateDialog(props.workspaceId)
</script>
