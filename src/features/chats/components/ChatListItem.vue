<template>
  <q-item
    clickable
    :to="{
      path: `/workspaces/${chat.workspaceId || activeWorkspaceId }/chats/${chat.id}`,
      query: route.query,
    }"
    active-class="bg-sec-c text-on-sec-c"
    @click="selected = chat.id"
    :class="{ 'route-active': chat.id === selected }"
  >
    <q-item-section
      avatar
      min-w-0
      pl-2
    >
      <a-avatar
        :avatar="chat.avatar"
        size="sm"
      />
    </q-item-section>
    <q-item-section>
      {{ chat.name }}
    </q-item-section>
    <q-item-section side>
      <q-badge
        rounded
        v-if="chat.unreadCount > 0"
        color="red"
        :label="chat.unreadCount"
      />
    </q-item-section>
    <q-item-section side>
      <menu-button
        :menu-ref="toRef(menuChatRef)"
        v-if="isUserWorkspaceAdmin(chat.workspaceId) || chat.type === 'private'"
      />
      <q-menu
        ref="menuChatRef"
        context-menu
        v-if="isUserWorkspaceAdmin(chat.workspaceId) || chat.type === 'private'"
      >
        <q-list style="min-width: 100px">
          <menu-item
            icon="sym_o_edit"
            :label="'Rename'"
            @click="renameItem(chat)"
            v-if="chat.type === 'workspace'"
          />
          <menu-item
            icon="sym_o_delete"
            :label="'Delete'"
            @click="deleteItem(chat)"
            hover:text-err
          />
          <menu-item
            icon="sym_o_settings"
            :label="'Settings'"
            :to="{ path: `/chats/${chat.id}/settings`, query: route.query }"
            v-if="chat.type === 'workspace'"
          />
        </q-list>
      </q-menu>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { useQuasar, QMenu } from "quasar"
import { computed, ref, toRef } from "vue"
import { useRoute } from "vue-router"

import AAvatar from "@/shared/components/AAvatar.vue"
import MenuButton from "@/shared/components/menu/MenuButton.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { dialogOptions } from "@/shared/utils/values"

import { useWorkspaceChats } from "@/features/chats/composables/useWorkspaceChats"
import { useActiveWorkspace, useRightsManagement } from "@/features/workspaces/composables"

import { Chat } from "@/services/data/types/chat"

const props = defineProps<{
  chat: Chat
}>()

const $q = useQuasar()
const route = useRoute()
const selected = defineModel<string>("selected")

const workspaceId = computed(() => props.chat.workspaceId)
const { updateChat, removeChat } = useWorkspaceChats(workspaceId)
const { workspaceId: activeWorkspaceId } = useActiveWorkspace()
const { isUserWorkspaceAdmin } = useRightsManagement()

const menuChatRef = ref<QMenu | null>(null)

function renameItem (chat: Chat) {
  $q.dialog({
    title: "Rename chat",
    prompt: {
      model: chat.name,
      type: "text",
      label: "Chat name",
      isValid: (v) => v.trim() && v !== chat.name,
    },
    cancel: true,
    ...dialogOptions,
  }).onOk(async (newName) => {
    await updateChat(chat.id, { name: newName.trim() })
  })
}

function deleteItem (chat: Chat) {
  $q.dialog({
    title: "Delete chat",
    message: "Are you sure you want to delete this chat?",
    cancel: true,
    ...dialogOptions,
  }).onOk(async () => {
    await removeChat(chat.id).catch((error) => {
      $q.notify({
        message: error.message,
        color: "negative",
      })
    })
  })
}
</script>
