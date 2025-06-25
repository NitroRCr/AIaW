<template>
  <div class="participant-manager">
    <!-- Header with icon, count, and add button -->
    <q-item class="q-px-md">
      <q-item-section avatar>
        <q-icon
          name="sym_o_group"
          color="grey-6"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-weight-medium">
          {{ participants.length }} {{ headerText.toUpperCase() }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn
          flat
          color="primary"
          icon="sym_o_person_add"
          @click="showAddParticipantDialog"
          :disable="!isAdmin"
          dense
        >
          <q-tooltip>{{ addButtonTooltip }}</q-tooltip>
        </q-btn>
      </q-item-section>
    </q-item>

    <q-separator />

    <!-- Search bar (only if there are participants) -->
    <q-item v-if="participants.length > 3">
      <q-item-section>
        <q-input
          v-model="searchQuery"
          :placeholder="$t('common.search')"
          outlined
          dense
          clearable
        >
          <template #prepend>
            <q-icon name="sym_o_search" />
          </template>
        </q-input>
      </q-item-section>
    </q-item>

    <!-- Loading state -->
    <template v-if="participants.length === 0">
      <q-item class="q-px-md">
        <q-item-section>
          <q-skeleton height="40px" />
        </q-item-section>
      </q-item>
    </template>

    <!-- Participants list -->
    <template v-else-if="filteredParticipants.length > 0">
      <template
        v-for="(participant, index) in filteredParticipants"
        :key="participant.userId"
      >
        <q-item class="q-px-md">
          <!-- User profile block -->
          <q-item-section>
            <user-profile-block
              :user="{
                avatar: participant.profile.avatar,
                name: participant.profile.name,
                displayName: participant.profile.name,
                status: getParticipantStatus(participant),
                subtitle: getParticipantSubtitle(participant)
              }"
              layout="horizontal"
              size="medium"
            />
          </q-item-section>

          <!-- Owner badge -->
          <q-item-section
            v-if="type === 'workspace' && isWorkspaceOwner(participant)"
            side
            class="q-ml-md items-center"
          >
            <q-chip
              color="purple"
              text-color="white"
              size="sm"
              icon="sym_o_admin_panel_settings"
            >
              {{ t('common.owner') }}
            </q-chip>
          </q-item-section>

          <!-- Role selector (only for editable workspace members) -->
          <q-item-section
            v-else-if="type === 'workspace' && canEditParticipantRole(participant) && 'role' in participant"
            side
            class="q-ml-md items-center"
          >
            <q-select
              :model-value="(participant as WorkspaceMember).role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              @update:model-value="(newRole) => updateParticipantRole(participant as WorkspaceMember, newRole)"
              dense
              outlined
              :disable="roleUpdateLoading[participant.userId]"
              style="min-width: 120px; height: 32px"
            />
          </q-item-section>

          <!-- Role badge (read-only) -->
          <q-item-section
            v-else-if="type === 'workspace' && 'role' in participant"
            side
            class="q-ml-md items-center"
          >
            <q-chip
              :color="getRoleColor((participant as WorkspaceMember).role)"
              text-color="white"
              size="sm"
            >
              {{ getRoleLabel((participant as WorkspaceMember).role) }}
            </q-chip>
          </q-item-section>

          <!-- Remove button (only if user is admin and not current user and not owner) -->
          <q-item-section
            v-if="isAdmin && !isCurrentUser(participant) && !isWorkspaceOwner(participant)"
            side
          >
            <q-btn
              flat
              color="negative"
              icon="sym_o_person_remove"
              @click="removeParticipant(participant)"
              :disable="removeLoading[participant.userId]"
              dense
            >
              <q-tooltip>{{ removeButtonTooltip }}</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>

        <!-- Separator between members (not after last member) -->
        <q-separator v-if="index < filteredParticipants.length - 1" />
      </template>
    </template>

    <!-- Empty state -->
    <template v-else>
      <q-item class="q-px-md">
        <q-item-section>
          <div class="text-center text-grey-6">
            <q-icon
              name="sym_o_group"
              size="md"
              class="q-mb-sm"
            />
            <div>{{ emptyText }}</div>
          </div>
        </q-item-section>
      </q-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ContactsDialog from '@/shared/components/dialogs/ContactsDialog.vue'
import { useUserStore } from '@/shared/store'

// import { useChatsStore } from '@/features/chats/store' // For future chat member management
import { usePresenceStore } from '@/features/profile/store/presence'
import { useWorkspacesStore } from '@/features/workspaces/store'

import { WorkspaceMember, WorkspaceMemberRole } from '@/services/data/types/workspace'

import UserProfileBlock from './UserProfileBlock.vue'

// Type definitions
type ParticipantType = 'workspace' | 'chat'

interface ChatParticipant {
  userId: string
  profile: {
    id: string
    name: string
    avatar: any
  }
}

type Participant = WorkspaceMember | ChatParticipant

interface Props {
  type: ParticipantType
  id: string
  isAdmin: boolean
  workspaceOwnerId?: string
}

const props = defineProps<Props>()

// Composables
const $q = useQuasar()
const { t } = useI18n()
const userStore = useUserStore()
const workspacesStore = useWorkspacesStore()
const presenceStore = usePresenceStore()
// Reactive state
const searchQuery = ref('')
const roleUpdateLoading = ref<Record<string, boolean>>({})
const removeLoading = ref<Record<string, boolean>>({})

// Make participants reactive to store changes
const participants = computed(() => {
  if (props.type === 'workspace') {
    return workspacesStore.workspaceMembers[props.id] || []
  } else {
    // For chats, we would need to implement chat member fetching
    return []
  }
})

// Role options for workspace members
const roleOptions = [
  { label: t('common.admin'), value: 'admin' },
  { label: t('common.member'), value: 'member' },
  { label: t('common.guest'), value: 'guest' }
]

// Computed properties
const headerText = computed(() => {
  if (props.type === 'workspace') {
    return t('workspaceSettings.members')
  }

  return t('chatSettings.participants')
})

const addButtonTooltip = computed(() => {
  if (props.type === 'workspace') {
    return t('workspaceSettings.addMemberTooltip')
  }

  return t('chatSettings.addParticipantTooltip')
})

const removeButtonTooltip = computed(() => {
  if (props.type === 'workspace') {
    return t('workspaceSettings.removeMember')
  }

  return t('chatSettings.removeParticipant')
})

const emptyText = computed(() => {
  if (props.type === 'workspace') {
    return t('workspaceSettings.noMembers')
  }

  return t('chatSettings.noParticipants')
})

// Helper functions
const filterParticipantsBySearch = (participants: Participant[], searchQuery: string): Participant[] => {
  if (!searchQuery.trim()) return participants

  const query = searchQuery.toLowerCase()

  return participants.filter(participant =>
    participant.profile.name.toLowerCase().includes(query)
  )
}

const getParticipantRolePriority = (participant: Participant): number => {
  if (isWorkspaceOwner(participant)) return 0

  if (props.type === 'workspace' && 'role' in participant) {
    switch (participant.role) {
      case 'admin': return 1
      case 'member': return 2
      case 'guest': return 3
    }
  }

  return 4 // Chat participants or unknown roles
}

const sortParticipantsByRole = (participants: Participant[]): Participant[] => {
  return [...participants].sort((a, b) => {
    const priorityA = getParticipantRolePriority(a)
    const priorityB = getParticipantRolePriority(b)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    return a.profile.name.localeCompare(b.profile.name)
  })
}

const filteredParticipants = computed(() => {
  const filtered = filterParticipantsBySearch(participants.value, searchQuery.value)

  return sortParticipantsByRole(filtered)
})

// Methods
// const fetchParticipants = async () => {
//   loading.value = true
//   try {
//     if (props.type === 'workspace') {
//       await workspacesStore.getWorkspaceMembers(props.id)
//     } else {
//       // For chats, we would need to implement chat member fetching
//       // This would require extending the chat store with member management
//     }
//   } catch (error) {
//     console.error('Failed to fetch participants:', error)
//     $q.notify({
//       type: 'negative',
//       message: t('common.errorFetching')
//     })
//   } finally {
//     loading.value = false
//   }
// }

const showAddParticipantDialog = () => {
  // Get current participant user IDs to exclude from contacts list
  const excludeUserIds = participants.value.map(p => p.userId)

  $q.dialog({
    component: ContactsDialog,
    componentProps: {
      currentUserId: userStore.currentUserId,
      excludeUserIds,
    },
  }).onOk((userId) => {
    addParticipant(userId)
  })
}

const addParticipant = async (userId: string) => {
  try {
    if (props.type === 'workspace') {
      await workspacesStore.addWorkspaceMember(props.id, userId, 'member')
    } else {
      // For chats, we would need to implement chat member adding
      // This would require extending the chat store with member management
    }

    $q.notify({
      type: 'positive',
      message: t('common.addedSuccessfully')
    })
  } catch (error) {
    console.error('Failed to add participant:', error)
    $q.notify({
      type: 'negative',
      message: t('common.errorAdding')
    })
  }
}

const removeParticipant = async (participant: Participant) => {
  $q.dialog({
    title: t('common.confirmRemove'),
    message: t('common.confirmRemoveMessage', { name: participant.profile.name }),
    cancel: true,
    persistent: true
  }).onOk(async () => {
    removeLoading.value[participant.userId] = true
    try {
      if (props.type === 'workspace') {
        await workspacesStore.removeWorkspaceMember(props.id, participant.userId)
      } else {
        // For chats, we would need to implement chat member removal
      }

      $q.notify({
        type: 'positive',
        message: t('common.removedSuccessfully')
      })
    } catch (error) {
      console.error('Failed to remove participant:', error)
      $q.notify({
        type: 'negative',
        message: t('common.errorRemoving')
      })
    } finally {
      removeLoading.value[participant.userId] = false
    }
  })
}

const updateParticipantRole = async (participant: WorkspaceMember, newRole: WorkspaceMemberRole) => {
  if (props.type !== 'workspace') return

  roleUpdateLoading.value[participant.userId] = true
  try {
    await workspacesStore.updateWorkspaceMember(props.id, participant.userId, newRole)

    $q.notify({
      type: 'positive',
      message: t('common.updatedSuccessfully')
    })
  } catch (error) {
    console.error('Failed to update participant role:', error)
    $q.notify({
      type: 'negative',
      message: t('common.errorUpdating')
    })
  } finally {
    roleUpdateLoading.value[participant.userId] = false
  }
}

const isCurrentUser = (participant: Participant): boolean => {
  return participant.userId === userStore.currentUserId
}

const isWorkspaceOwner = (participant: Participant): boolean => {
  return props.workspaceOwnerId === participant.userId
}

const canEditParticipantRole = (participant: Participant): boolean => {
  // Current user can't edit their own role
  if (isCurrentUser(participant)) return false

  // Workspace owner role can't be changed by anyone
  if (isWorkspaceOwner(participant)) return false

  // Only admins and owners can edit roles
  if (!props.isAdmin) return false

  // Workspace owner can edit anyone's role
  if (props.workspaceOwnerId === userStore.currentUserId) return true

  // Regular admins can edit member and guest roles, but not other admins
  if (props.type === 'workspace' && 'role' in participant) {
    const memberRole = (participant as WorkspaceMember).role

    return memberRole === 'member' || memberRole === 'guest'
  }

  return true
}

const isWorkspaceMember = (participant: Participant): participant is WorkspaceMember => {
  return 'role' in participant
}

const getParticipantStatus = (participant: Participant): 'online' | 'away' | 'busy' | 'offline' => {
  return presenceStore.getUserStatus(participant.userId)
}

const getParticipantSubtitle = (participant: Participant): string => {
  if (isWorkspaceOwner(participant)) {
    return t('common.owner')
  }

  if (isCurrentUser(participant)) {
    return t('common.you')
  }

  if (props.type === 'workspace' && isWorkspaceMember(participant)) {
    return getRoleLabel(participant.role)
  }

  return ''
}

const getRoleLabel = (role: string): string => {
  const roleLabels: Record<string, string> = {
    admin: t('common.admin'),
    member: t('common.member'),
    guest: t('common.guest')
  }

  return roleLabels[role] || role
}

const getRoleColor = (role: string): string => {
  const roleColors: Record<string, string> = {
    admin: 'red',
    member: 'primary',
    guest: 'grey'
  }

  return roleColors[role] || 'grey'
}

</script>
