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
              :model-value="chat.name"
              @update:model-value="(value) => chatsStore.update(chat.id, { name: String(value) })"
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
              @update:model-value="(value) => chatsStore.update(chat.id, { description: String(value) })"
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
      <q-btn
        fab
        icon="sym_o_save"
        color="primary"
        class="sticky-save-btn"
        @click="saveChat"
        :loading="chatsStore.isSaving"
        :disable="!chatsStore.hasChanges"
        v-if="chat && chat.type !== 'private'"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { QPageContainer, QPage, useQuasar } from "quasar"
import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import NotificationPanel from "@/shared/components/ui/NotificationPanel.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

import { useIsChatAdmin } from "@/features/chats/composables/useIsChatAdmin"
import { useChatsStore } from "@/features/chats/store"
import { useWorkspacesStore } from "@/features/workspaces/store"
import { pageFhStyle } from "@/shared/utils/functions"
import { computed, toRaw } from "vue"
const $q = useQuasar()

defineEmits(["toggle-drawer"])

const props = defineProps<{
  id: string
}>()

const chatsStore = useChatsStore()
const workspaceStore = useWorkspacesStore()

const chatId = computed(() => props.id)
const chat = computed(() => chatsStore.chats.find(c => c.id === chatId.value))
const chatPublic = computed({
  get: () => chat.value?.type === "workspace",
  set: async (value) => {
    if (chat.value) {
      const newType = value ? "workspace" : "group"
      await chatsStore.update(chat.value.id, { type: newType })
    }
  }
})

const workspace = computed(() => workspaceStore.workspaces.find(w => w.id === chat.value?.workspace_id))

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
