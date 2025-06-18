<template>
  <q-expansion-item
    header-class="text-lg py-0"
    expand-icon-class="important:pl-2"
  >
    <template #header>
      <q-item-section> Chats </q-item-section>
      <q-item-section side>
        <div>
          <q-btn
            flat
            dense
            round
            icon="sym_o_search"
            :title="'Search chats'"
            @click.prevent.stop="showSearchDialog = true"
          />
          <q-btn
            flat
            dense
            round
            icon="sym_o_person_add"
            :title="'Create user chat'"
            @click.prevent.stop="showUserSelectDialog"
            v-if="userStore.isLoggedIn"
          />
        </div>
      </q-item-section>
    </template>
    <template #default>
      <chat-list :workspace-id="workspaceId" />
      <search-chats
        v-model="showSearchDialog"
        :workspace-id
      />
    </template>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref, toRef } from "vue"
import { useRouter } from "vue-router"

import { useListenKey } from "@/shared/composables"
import { useUserStore, useUserPerfsStore } from "@/shared/store"
import { isPlatformEnabled } from "@/shared/utils/functions"

import { supabase } from "@/services/data/supabase/client"
import { Profile } from "@/services/data/types/profile"

import ChatList from "./ChatList.vue"
import SearchChats from "./SearchChats.vue"
import UserListDialog from "./UserListDialog.vue"

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

const props = defineProps<{
  workspaceId: string | null
}>()

const showUserSelectDialog = () => {
  $q.dialog({
    component: UserListDialog,
    componentProps: {
      currentUserId: userStore.currentUserId,
    },
  }).onOk((user) => {
    onSelectUser(user)
  })
}

const onSelectUser = async (user: Profile) => {
  const { data: chatId, error } = await supabase.rpc(
    "start_private_chat_with",
    {
      target_user_id: user.id,
      current_user_id: userStore.currentUserId,
    }
  )

  if (error) {
    console.error("error", error)
    $q.notify({
      message: error.message,
      color: "negative",
    })

    return
  }

  router.push(
    props.workspaceId
      ? `/workspaces/${props.workspaceId}/chats/${chatId}`
      : `/chats/${chatId}`
  )
}

const showSearchDialog = ref(false)

const { data: perfs } = useUserPerfsStore()

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "searchDialogKey"), () => {
    showSearchDialog.value = true
  })
}
</script>
