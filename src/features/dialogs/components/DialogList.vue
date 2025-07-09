<template>
  <icon-side-button
    icon="sym_o_rate_review"
    :title="$t('mainLayout.createDialog')"
    @click="onAdd"
  />
  <icon-side-button
    icon="sym_o_search"
    :title="$t('mainLayout.searchDialogs')"
    @click="showSearchDialog = true"
  />
  <sidebar-title title="Chats" />

  <q-list>
    <empty-item
      v-if="dialogs.length === 0"
      text="No conversations"
    />
    <q-item
      v-for="dialog in [...dialogs].reverse()"
      :key="dialog.id"
      clickable
      :to="{
        path: `/workspaces/${props.workspaceId}/dialogs/${dialog.id}`,
        query: route.query,
      }"
      active-class="bg-sec-c text-on-sec-c"
    >
      <q-item-section side />
      <q-item-section>
        {{ dialog.name }}
      </q-item-section>
      <q-menu context-menu>
        <q-list style="min-width: 100px">
          <menu-item
            icon="sym_o_edit"
            :label="$t('dialogList.renameTitle')"
            @click="renameItem(dialog)"
          />
          <menu-item
            icon="sym_o_auto_fix"
            :label="$t('dialogList.summarizeDialog')"
            @click="
              router.push(
                `/workspaces/${props.workspaceId}/dialogs/${dialog.id}#genTitle`
              )
            "
          />
          <menu-item
            icon="sym_o_content_copy"
            :label="$t('dialogList.copyContent')"
            @click="
              router.push(
                `/workspaces/${props.workspaceId}/dialogs/${dialog.id}#copyContent`
              )
            "
          />
          <menu-item
            icon="sym_o_move_item"
            :label="$t('dialogList.moveTo')"
            @click="moveItem(dialog)"
          />
          <menu-item
            icon="sym_o_delete"
            :label="$t('dialogList.delete')"
            @click="deleteItem(dialog)"
            hover:text-err
          />
        </q-list>
      </q-menu>
    </q-item>
  </q-list>
  <search-dialog
    v-model="showSearchDialog"
    :workspace-id
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { computed, ref, toRef } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter, useRoute } from "vue-router"

import EmptyItem from "@/shared/components/layout/EmptyItem.vue"
import IconSideButton from "@/shared/components/layout/IconSideButton.vue"
import SidebarTitle from "@/shared/components/layout/SidebarTitle.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { useListenKey } from "@/shared/composables"
import { useUserPerfsStore } from "@/shared/store"
import { isPlatformEnabled } from "@/shared/utils/functions"
import { dialogOptions } from "@/shared/utils/values"

import SearchDialog from "@/features/dialogs/components/SearchDialog.vue"
import { useDialogsStore } from "@/features/dialogs/store"
import SelectWorkspaceDialog from "@/features/workspaces/components/SelectWorkspaceDialog.vue"

import { useCreateDialog } from "../composables"

const { t } = useI18n()
const props = defineProps<{
  workspaceId: string
}>()

const { data: perfs } = storeToRefs(useUserPerfsStore())
const { createDialog } = useCreateDialog(props.workspaceId)

async function onAdd () {
  await createDialog()
}

if (isPlatformEnabled(perfs.value.enableShortcutKey)) {
  useListenKey(toRef(perfs.value, "createDialogKey"), onAdd)
}

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const dialogsStore = useDialogsStore()
const { dialogs: workspaceDialogs } = storeToRefs(dialogsStore)
const dialogs = computed(() =>
  Object.values(workspaceDialogs.value).filter(
    (item) => item.workspaceId === props.workspaceId
  )
)
const showSearchDialog = ref(false)

function renameItem ({ id, name }) {
  $q.dialog({
    title: t("dialogList.renameTitle"),
    prompt: {
      model: name,
      type: "text",
      label: t("dialogList.title"),
      isValid: (v) => v.trim() && v !== name,
    },
    cancel: true,
    ...dialogOptions,
  }).onOk((newName) => {
    dialogsStore.updateDialog({ id, name: newName.trim() })
  })
}

function moveItem ({ id }) {
  $q.dialog({
    component: SelectWorkspaceDialog,
    componentProps: {
      accept: "workspace",
    },
  }).onOk((workspaceId) => {
    dialogsStore.updateDialog({ id, workspaceId })
  })
}

function deleteItem ({ id, name }) {
  $q.dialog({
    title: t("dialogList.deleteConfirmTitle"),
    message: t("dialogList.deleteConfirmMessage", { name }),
    cancel: true,
    ok: {
      label: t("dialogList.deleteConfirmOk"),
      color: "err",
      flat: true,
    },
    ...dialogOptions,
  }).onOk(() => {
    dialogsStore.removeDialog(props.workspaceId, id)

    router.push(`/workspaces/${props.workspaceId}`)
  })
}
</script>
<style>
.q-item {
  min-height: 40px;
  border-radius: 10px;
  margin: 0 6px 0 6px;
}
</style>
