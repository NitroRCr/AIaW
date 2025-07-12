<template>
  <page-view-with-drawer
    :title="$t('accountPage.title')"
    @toggle-drawer="$emit('toggle-drawer')"
  >
    <template #drawer>
      <settings-drawer />
    </template>
    <template #page>
      <settings-list>
        <q-item-label
          header
        >
          {{ $t("accountPage.userSettings") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            {{ $t("accountPage.user") }}
          </q-item-section>
          <q-item-section side>
            {{ currentUser?.email }}
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item v-if="profile">
          <q-item-section>
            {{ $t("accountPage.name") }}
          </q-item-section>
          <q-item-section>
            <a-input
              v-model="profile.name"
              autogrow
              filled
              clearable
              placeholder="Name"
            />
          </q-item-section>
        </q-item>
        <q-item v-if="profile">
          <q-item-section>
            {{ $t("accountPage.description") }}
          </q-item-section>
          <q-item-section>
            <a-input
              v-model="profile.description"
              autogrow
              filled
              clearable
              placeholder="Description"
            />
          </q-item-section>
        </q-item>
        <q-item
          v-if="profile"
          clickable
          v-ripple
          @click="pickAvatar"
        >
          <q-item-section>
            {{ $t("accountPage.avatar") }}
          </q-item-section>
          <q-item-section side>
            <a-avatar :avatar="profile.avatar" />
          </q-item-section>
        </q-item>
      </settings-list>
      <settings-list>
        <q-item-label
          header
        >
          {{ $t("accountPage.web3Settings") }}
        </q-item-label>
        <web3-settings />
      </settings-list>

      <!-- Sticky Save Button -->
      <sticky-save-button
        @click="saveProfile"
        :loading="profileStore.isSaving"
        :disabled="!profileStore.hasChanges"
      />
    </template>
  </page-view-with-drawer>
</template>

<script setup lang="ts">
defineEmits(['toggle-drawer'])

import { useQuasar } from "quasar"
import { computed, toRaw, toRefs } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import SettingsDrawer from "@/shared/components/layout/settings/SettingsDrawer.vue"
import SettingsList from "@/shared/components/panels/SettingsList.vue"
import { useUserStore } from "@/shared/store/user"

import { useProfileStore } from "@/features/profile/store"
import Web3Settings from "@/features/settings/components/Web3Settings.vue"

import PageViewWithDrawer from "./common/SettingPageLayout.vue"
const profileStore = useProfileStore()
const {
  currentUser,
} = toRefs(useUserStore())
const $q = useQuasar()

const profile = computed(() => profileStore.myProfile)

async function saveProfile() {
  if (!profile.value) return

  try {
    await profileStore.update(profile.value.id, toRaw(profile.value))
    $q.notify({
      type: 'positive',
      message: 'Profile saved'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error saving profile'
    })
  }
}

function pickAvatar () {
  if (!profile.value) return

  $q.dialog({
    component: PickAvatarDialog,
    componentProps: { model: profile.value.avatar, defaultTab: "icon" },
  }).onOk((avatar) => {
    profile.value!.avatar = avatar
  })
}
</script>
<style scoped>
.thin-view {
  max-width: 800px;
  margin: 0 auto;
}
</style>
