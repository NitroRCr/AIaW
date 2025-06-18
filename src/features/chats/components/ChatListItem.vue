<template>
  <q-item
    clickable
    :to="{
      path:
        chat.type === 'private'
          ? `/chats/${chat.id}`
          : `/workspaces/${chat.workspaceId}/chats/${chat.id}`,
      query: route.query,
    }"
    active-class="bg-sec-c text-on-sec-c"
    item-rd
    py-1.5
    min-h-0
    @click="selected = chat.id"
    :class="{ 'route-active': chat.id === selected }"
  >
    <q-item-section
      avatar
      min-w-0
    >
      <a-avatar
        :avatar="chat.avatar"
        size="sm"
      />
    </q-item-section>
    <q-item-section>
      {{ chat.name }}
    </q-item-section>
    <menu-button :menu-ref="toRef(menuChatRef)" />
    <q-menu
      ref="menuChatRef"
      context-menu
    >
      <q-list style="min-width: 100px">
        <menu-item
          icon="sym_o_edit"
          :label="'Rename'"
          @click="renameItem(chat)"
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
        />
      </q-list>
    </q-menu>
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

import { Chat } from "@/services/data/types/chat"

const props = defineProps<{
  chat: Chat
}>()

const $q = useQuasar()
const route = useRoute()
const selected = defineModel<string>("selected")

const workspaceId = computed(() => props.chat.workspaceId)
const { updateChat, removeChat } = useWorkspaceChats(workspaceId)

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
