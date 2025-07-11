<template>
  <q-expansion-item
    default-opened
  >
    <template #header>
      <q-item-section avatar>
        <q-icon name="sym_o_question_answer" />
      </q-item-section>
      <q-item-section> Chats </q-item-section>
      <q-item-section side>
        <q-badge
          rounded
          v-if="unreadCount > 0"
          color="red"
          :label="unreadCount"
        />
      </q-item-section>
    </template>
    <icon-side-button
      icon="sym_o_search"
      @click="showSearchDialog = true"
      :title="$t('mainLayout.searchDialogs')"
      small
    />
    <icon-side-button
      title="New group"
      icon="sym_o_groups"
      @click="addItem"
      small
    />
    <icon-side-button
      title="New private chat"
      icon="sym_o_3p"
      @click="showUserSelectDialog"
      small
    />
    <q-list
      min-h="100px"
      pt-1
    >
      <chat-list-item
        v-for="chat in [...chats].reverse()"
        :key="chat.id"
        :chat="chat"
        v-model:selected="selected"
      />
    </q-list>
    <search-chats
      v-model="showSearchDialog"
      :workspace-id="workspaceId"
    />
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, ref, toRef } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import RenameDialog from "@/shared/components/dialogs/RenameDialog.vue"
import IconSideButton from "@/shared/components/layout/IconSideButton.vue"
import { useListenKey } from "@/shared/composables"
import { useUserStore, useUserPerfsStore } from "@/shared/store"
import { isPlatformEnabled } from "@/shared/utils/functions"

import { useWorkspaceChats } from "@/features/chats/composables/useWorkspaceChats"
import { useChatsStore } from "@/features/chats/store"

import ChatListItem from "./ChatListItem.vue"
import SearchChats from "./SearchChats.vue"
import UserListDialog from "./UserListDialog.vue"
const props = defineProps<{
  workspaceId: string | null
}>()
const $q = useQuasar()
const chatsStore = useChatsStore()
const { chats, addChat } = useWorkspaceChats(toRef(props, "workspaceId"))
const userStore = useUserStore()
const router = useRouter()
const { t } = useI18n()

const unreadCount = computed(() => {
  return chats.value.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0)
})

const showSearchDialog = ref(false)
const showUserSelectDialog = () => {
  $q.dialog({
    component: UserListDialog,
    componentProps: {
      currentUserId: userStore.currentUserId,
    },
  }).onOk((userId) => {
    onSelectUser(userId)
  })
}

const onSelectUser = async (userId: string) => {
  const chatId = await chatsStore.startPrivateChatWith(userId)
  router.push(`/workspaces/${props.workspaceId}/chats/${chatId}`)
}

const selected = defineModel<string>()

async function addItem () {
  $q.dialog({
    component: RenameDialog,
    componentProps: {
      name: "",
      title: "New public chat",
    },
  }).onOk((name) => {
    return addChat({
      name,
      type: "workspace",
    })
      .then((chat) => {
        router.push(`/workspaces/${props.workspaceId}/chats/${chat.id}`)
      })
      .catch((error) => {
        console.error(error)
      })
  })
}

const { data: perfs } = useUserPerfsStore()

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "createSocialKey"), addItem)
}
</script>
