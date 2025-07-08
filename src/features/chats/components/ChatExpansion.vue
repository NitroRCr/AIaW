<template>
  <q-expansion-item

    default-opened
  >
    <template #header>
      <q-item-section avatar>
        <q-icon name="sym_o_question_answer" />
      </q-item-section>
      <q-item-section> Chats </q-item-section>
      <!-- <q-item-section side>
    <q-btn
      flat
      dense
      round
      icon="sym_o_add"
    />

  </q-item-section> -->
      <div class="col-auto">
        <q-btn
          round
          flat
          icon="sym_o_more_vert"
          size="sm"
          @click.prevent.stop
        >
          <q-menu
            auto-close
          >
            <q-list>
              <icon-side-button
                title="Search"
                icon="sym_o_search"
                @click="showSearchDialog = true"
              />
              <icon-side-button
                title="New group"
                icon="sym_o_groups"
                @click="addItem"
              />
              <icon-side-button
                title="New private chat"
                icon="sym_o_3p"
                @click="showUserSelectDialog"
              />
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </template>

    <!-- <chat-list
  :workspace-id="workspace.id"
  :active="activeTab === 'chats'"
/> -->

    <q-list min-h="100px">
      <!-- <q-item>
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
          <q-tooltip> New public chat </q-tooltip>
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
          <q-tooltip> New private chat </q-tooltip>
        </q-btn>
      </q-item-section>
    </q-item> -->
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
import { ref, toRef } from "vue"
import { useRouter } from "vue-router"

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
