<template>
  <q-list>
    <q-item>
      <q-item-section>
        <q-btn
          icon="sym_o_search"
          flat
          dense
          no-caps
          no-padding
          no-margin
          @click.prevent.stop="showSearchDialog = true"
        >
          <q-tooltip> Search chats </q-tooltip>
        </q-btn>
      </q-item-section>
      <q-item-section>
        <q-btn
          flat
          icon="sym_o_question_answer"
          dense
          no-caps
          @click="addItem"
        >
          <q-tooltip> Create a new chat </q-tooltip>
        </q-btn>
      </q-item-section>
      <q-item-section>
        <q-btn
          icon="sym_o_3p"
          flat
          dense
          no-caps
          no-padding
          no-margin
          @click.prevent.stop="showUserSelectDialog"
        >
          <q-tooltip> Chat with user </q-tooltip>
        </q-btn>
      </q-item-section>
    </q-item>
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
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref, toRef } from "vue"
import { useRouter } from "vue-router"

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
  router.push(
    props.workspaceId
      ? `/workspaces/${props.workspaceId}/chats/${chatId}`
      : `/chats/${chatId}`
  )
}

const selected = defineModel<string>()

async function addItem () {
  await addChat({
    name: "New chat",
    type: "workspace",
  })
}

const { data: perfs } = useUserPerfsStore()

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "createSocialKey"), addItem)
}
</script>
