<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("chatsPage.chatSettings") }}
      <q-chip
        size="md"
        v-if="workspace"
      >
        <a-avatar
          :avatar="workspace?.avatar"
          size="md"
        />
        {{ workspace?.name }}
      </q-chip>
    </q-toolbar-title>
  </view-common-header>
  <q-page-container bg-sur-c-low>
    <q-page
      flex
      flex-col
      :style-fn="pageFhStyle"
    >
      <notification-panel
        v-if="!isPageLoaded"
        :title="$t('common.loading')"
      />
      <notification-panel
        v-else-if="!isAdmin"
        :title="$t('common.noAdmin')"
        :warning="true"
      />
      <notification-panel
        v-if="currentChat && currentChat.type === 'private'"
        :title="$t('chatsPage.privateChat')"
        :warning="true"
      />
      <q-list v-else-if="currentChat">
        <q-item>
          <q-item-section>
            {{ $t("chatsPage.isPublic") }}
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="chatPublic" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            {{ $t("chatsPage.name") }}
          </q-item-section>
          <q-item-section>
            <q-input
              v-model="chat.name"
              autogrow
              filled
              clearable
              placeholder="Name of chat..."
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            {{ $t("chatsPage.description") }}
          </q-item-section>
          <q-item-section>
            <q-input
              v-model="chat.description"
              autogrow
              filled
              clearable
              placeholder="Description of workspace..."
            />
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="pickAvatar"
        >
          <q-item-section>
            {{ $t("chatsPage.avatar") }}
          </q-item-section>
          <q-item-section side>
            <a-avatar :avatar="chat.avatar" />
          </q-item-section>
        </q-item>
        <q-separator spaced />
      </q-list>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { QPageContainer, QPage, useQuasar } from "quasar"
import { computed, ref, toRaw, watch } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import NotificationPanel from "@/shared/components/NotificationPanel.vue"
import { syncRef } from "@/shared/composables/syncRef"
import { pageFhStyle } from "@/shared/utils/functions"

import { useIsChatAdmin } from "@/features/chats/composables/useIsChatAdmin"
import { useChatsStore } from "@/features/chats/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
const $q = useQuasar()

defineEmits(["toggle-drawer"])

const props = defineProps<{
  id: string
}>()

const chatsStore = useChatsStore()
const workspaceStore = useWorkspacesStore()

const workspace = computed(() =>
  workspaceStore.workspaces.find(
    (workspace) => workspace.id === chat.value?.workspaceId
  )
)
const currentChat = computed(() =>
  chatsStore.chats.find((chat) => chat.id === props.id)
)
const isPageLoaded = computed(() => currentChat.value !== undefined)

const { isAdmin } = useIsChatAdmin(currentChat)

const chat = syncRef(
  currentChat,
  (val) => {
    chatsStore.putItem(toRaw(val))
  },
  { valueDeep: true }
)

const chatPublic = ref(chat.value?.type === "workspace")

watch(chatPublic, (newVal) => {
  if (newVal) {
    chatsStore.update(currentChat.value!.id, { type: "workspace" })
  } else {
    chatsStore.update(currentChat.value!.id, { type: "group" })
  }
})

function pickAvatar () {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: { model: chat.value?.avatar, defaultTab: "icon" },
  }).onOk((avatar) => {
    chatsStore.update(currentChat.value!.id, { avatar })
  })
}
</script>
