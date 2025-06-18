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
      :key="member.userId"
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

import { Profile } from "@/services/data/types/profile"
import { WorkspaceMember, WorkspaceMemberRole } from "@/services/data/types/workspace"

const props = defineProps<{
  workspaceId: string
}>()

const workspacesStore = useWorkspacesStore()
const members = ref<WorkspaceMember[]>([])
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
const onUpdateMemberRole = async (member: WorkspaceMember) => {
  await workspacesStore.updateWorkspaceMember(
    props.workspaceId,
    member.userId,
    member.role as WorkspaceMemberRole
  )
}

const onRemoveMember = async (member: WorkspaceMember) => {
  await workspacesStore.removeWorkspaceMember(props.workspaceId, member.userId)
  members.value = members.value.filter((m) => m.userId !== member.userId)
}

const onAddMember = async (user: Profile) => {
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
  ).filter((member) => member.userId !== userStore.currentUser.id)
})
</script>
