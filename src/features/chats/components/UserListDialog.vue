<template>
  <q-dialog ref="dialogRef">
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          Address book
        </div>
      </q-card-section>
      <q-card-section p-0>
        <q-list class="">
          <q-item
            v-for="user in users"
            :key="user.id"
            class="row items-center justify-between"
          >
            <q-item-section avatar>
              <a-avatar
                :avatar="user.avatar"
                size="sm"
              />
            </q-item-section>
            <q-item-section>
              <div>{{ user.name }}</div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                color="primary"
                icon="sym_o_person_add"
                @click="onSelectUser(user)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('subscribeDialog.cancel')"
          @click="onDialogCancel"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar"
import { onMounted, ref } from "vue"

import AAvatar from "@/shared/components/AAvatar.vue"

import { useProfileStore } from "@/features/profile/store"

import type { ProfileMapped } from "@/services/supabase/types"

const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const props = defineProps<{
  currentUserId: string
}>()

const profileStore = useProfileStore()
const users = ref<ProfileMapped[]>([])

const onSelectUser = async (user: ProfileMapped) => {
  onDialogOK(user.id)
}

onMounted(async () => {
  users.value = Object.values(profileStore.profiles).filter(
    (profile) => profile.id !== props.currentUserId
  )
})
</script>
