<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("accountPage.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container bg-sur-c-low>
    <q-page
      :style-fn="pageFhStyle"
      v-if="isInitialized"
      class="relative-position"
    >
      <q-list
        mt-10
        pb-2
        bg-sur
        max-w="1000px"
        m="x-auto"
        rd-lg
      >
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
        <q-separator spaced />
        <q-item
          clickable
          v-ripple
          @click="signOut()"
        >
          <q-item-section avatar>
            <q-icon name="sym_o_logout" />
          </q-item-section>

          <q-item-section>
            {{ $t("accountPage.signOut") }}
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Sticky Save Button -->
      <sticky-save-button
        @click="saveProfile"
        :loading="profileStore.isSaving"
        :disabled="!profileStore.hasChanges"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
defineEmits(['toggle-drawer'])

import { useQuasar } from "quasar"
import { computed, ref, toRaw, toRefs } from "vue"
import { useRouter } from "vue-router"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import { useUserStore } from "@/shared/store/user"
import { pageFhStyle } from "@/shared/utils/functions"

import { useAuth } from "@/features/auth/composables/useAuth"
import { useProfileStore } from "@/features/profile/store"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

const profileStore = useProfileStore()
const {
  currentUser,
  isInitialized: userIsInitialized,
} = toRefs(useUserStore())
const router = useRouter()
const loading = ref(false)
const $q = useQuasar()

const profile = computed(() => profileStore.myProfile)
const isInitialized = computed(
  () => profileStore.isInitialized && userIsInitialized.value
)

const { signOut } = useAuth({
  loading,
  onComplete: () => {
    router.replace("/")
  }
})

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
