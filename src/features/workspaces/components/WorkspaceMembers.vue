<template>
  <div>
    <q-item-label header>
      {{ $t("workspacePage.members") }}
    </q-item-label>
    <q-item>
      <q-item-section avatar>
        <q-btn
          flat
          color="primary"
          icon="sym_o_person_add"
          @click="showUserSelectDialog"
        />
      </q-item-section>
    </q-item>
    <q-list
      v-for="member in members"
      :key="member.user_id"
    >
      <q-item>
        <q-item-section
          avatar
          class="row items-center justify-between"
        >
          <div>{{ member.profile.name }}</div>
        </q-item-section>
        <q-item-section>
          <q-btn
            flat
            color="primary"
            icon="sym_o_person_remove"
            @click="onRemoveMember(member)"
          />
        </q-item-section>
        <q-item-section>
          <q-select
            v-model="member.role"
            :options="['admin', 'member', 'readonly']"
            option-label="role"
            option-value="role"
            @update:model-value="onUpdateMemberRole(member)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { onMounted, ref } from "vue"

import { useUserStore } from "@/shared/store"

import UserListDialog from "@/features/chats/components/UserListDialog.vue"
import { useWorkspacesStore } from "@/features/workspaces/store"

import type {
  ProfileMapped,
  WorkspaceMemberMapped,
  WorkspaceMemberRole,
} from "@/services/supabase/types"

const props = defineProps<{
  workspaceId: string
}>()

const workspacesStore = useWorkspacesStore()
const members = ref<WorkspaceMemberMapped[]>([])
const userStore = useUserStore()
const $q = useQuasar()
const showUserSelectDialog = () => {
  $q.dialog({
    component: UserListDialog,
    componentProps: {
      currentUserId: userStore.currentUserId,
    },
  }).onOk((user) => {
    onAddMember(user)
  })
}
const onUpdateMemberRole = async (member: WorkspaceMemberMapped) => {
  await workspacesStore.updateWorkspaceMember(
    props.workspaceId,
    member.user_id,
    member.role as WorkspaceMemberRole
  )
}

const onRemoveMember = async (member: WorkspaceMemberMapped) => {
  await workspacesStore.removeWorkspaceMember(props.workspaceId, member.user_id)
  members.value = members.value.filter((m) => m.user_id !== member.user_id)
}

const onAddMember = async (user: ProfileMapped) => {
  const member = await workspacesStore.addWorkspaceMember(
    props.workspaceId,
    user.id,
    "member"
  )
  members.value = [...members.value, member]
}

onMounted(async () => {
  members.value = (
    await workspacesStore.getWorkspaceMembers(props.workspaceId)
  ).filter((member) => member.user_id !== userStore.currentUser.id)
})
</script>
