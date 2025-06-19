<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("chatsPage.chatSettings") }}
      <q-chip
        size="md"
        v-if="workspace?.avatar"
      >
        <a-avatar
          :avatar="workspace.avatar"
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
      class="relative-position"
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
        v-if="chat && chat.type === 'private'"
        :title="$t('chatsPage.privateChat')"
        :warning="true"
      />
      <q-list v-else-if="chat">
        <q-item>
          <q-item-section>
            {{ $t("chatsPage.name") }}
          </q-item-section>
          <q-item-section>
            <q-input
              :model-value="chat.name"
              @update:model-value="handleNameUpdate"
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
              :model-value="chat.description"
              @update:model-value="handleDescriptionUpdate"
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

      <!-- Sticky Save Button -->
      <sticky-save-button
        @click="saveChat"
        :loading="chatsStore.isSaving"
        :disabled="!chatsStore.hasChanges"
        :show="chat && chat.type !== 'private'"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { QPageContainer, QPage, useQuasar } from "quasar"
import { computed, toRaw } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import NotificationPanel from "@/shared/components/NotificationPanel.vue"
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
const { chats } = storeToRefs(chatsStore)
const workspaceStore = useWorkspacesStore()

const chatId = computed(() => props.id)
const chat = computed(() => chats.value.find(c => c.id === chatId.value))

// Method to handle name update with error handling
async function handleNameUpdate(value: string) {
  if (!chat.value) return

  try {
    await chatsStore.update(chat.value.id, { name: String(value) })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error updating chat name'
    })
  }
}

// Method to handle description update with error handling
async function handleDescriptionUpdate(value: string) {
  if (!chat.value) return

  try {
    await chatsStore.update(chat.value.id, { description: String(value) })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error updating chat description'
    })
  }
}

const workspace = computed(() => workspaceStore.workspaces.find(w => w.id === chat.value?.workspaceId))

const isPageLoaded = computed(() => chat.value !== undefined)

const { isAdmin } = useIsChatAdmin(chat)

async function saveChat() {
  if (!chat.value) return

  try {
    await chatsStore.update(chat.value.id, toRaw(chat.value))
    $q.notify({
      type: 'positive',
      message: 'Chat settings saved'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error saving chat settings'
    })
  }
}

function pickAvatar () {
  if (!chat.value) return

  $q.dialog({
    component: PickAvatarDialog,
    componentProps: { model: chat.value.avatar, defaultTab: "icon" },
  }).onOk(async (avatar) => {
    if (chat.value) {
      await chatsStore.update(chat.value.id, { avatar })
    }
  })
}
</script>
