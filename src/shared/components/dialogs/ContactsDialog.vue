<template>
  <q-dialog
    ref="dialogRef"
    persistent
    class="contacts-dialog"
  >
    <q-card class="contacts-card">
      <!-- Header with title and close button -->
      <q-card-section class="contacts-header">
        <div class="contacts-header__content">
          <div class="contacts-header__title">
            {{ $t('common.contacts') }}
          </div>
          <q-btn
            flat
            round
            dense
            icon="sym_o_close"
            @click="onDialogCancel"
            class="contacts-header__close-btn"
          />
        </div>

        <!-- Search field -->
        <q-input
          v-model="searchQuery"
          :placeholder="$t('common.search')"
          outlined
          dense
          class="contacts-search"
        >
          <template #prepend>
            <q-icon name="sym_o_search" />
          </template>
        </q-input>
      </q-card-section>

      <!-- Contacts list -->
      <q-card-section class="contacts-list">
        <div class="contacts-list__container">
          <!-- Loading state -->
          <template v-if="loading">
            <q-item
              v-for="i in 5"
              :key="i"
            >
              <q-item-section avatar>
                <q-skeleton
                  type="QAvatar"
                  size="40px"
                />
              </q-item-section>
              <q-item-section>
                <q-skeleton
                  type="text"
                  height="16px"
                  width="60%"
                />
                <q-skeleton
                  type="text"
                  height="14px"
                  width="40%"
                />
              </q-item-section>
            </q-item>
          </template>

          <!-- Contacts list -->
          <template
            v-else-if="filteredContacts.length > 0"
          >
            <template
              v-for="(contact, index) in filteredContacts"
              :key="contact.id"
            >
              <q-item
                clickable
                @click="handleContactClick(contact)"
                class="contacts-list__item"
                v-ripple
              >
                <q-item-section avatar>
                  <a-avatar
                    :avatar="getContactAvatar(contact)"
                    size="md"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ contact.name }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ getContactSubtitle(contact) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    color="primary"
                    icon="sym_o_person_add"
                    @click.stop="handleSelectContact(contact)"
                  >
                    <q-tooltip>{{ $t('common.add') }}</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-separator v-if="index < filteredContacts.length - 1" />
            </template>
          </template>

          <!-- Empty state -->
          <template v-else>
            <q-item>
              <q-item-section class="text-center text-grey-6">
                <q-icon
                  name="sym_o_people_outline"
                  size="md"
                  class="q-mb-sm"
                />
                <div>
                  {{ searchQuery ? $t('common.noSearchResults') : $t('common.noContacts') }}
                </div>
              </q-item-section>
            </q-item>
          </template>
        </div>
      </q-card-section>

      <!-- Footer with Add Contact button -->
      <q-card-section class="contacts-footer">
        <q-btn
          outline
          color="primary"
          :label="$t('common.addContact')"
          icon="sym_o_person_add"
          @click="handleAddContact"
          class="contacts-footer__add-btn"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import AAvatar from '@/shared/components/AAvatar.vue'
import { defaultTextAvatar } from '@/shared/utils/functions'

import { useProfileStore } from '@/features/profile/store'
import { usePresenceStore } from '@/features/profile/store/presence'

import type { Profile } from '@/services/data/types/profile'

// Dialog composable
const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// Props
interface Props {
  currentUserId: string
  excludeUserIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  excludeUserIds: () => []
})

// Emits
const emit = defineEmits<{
  'add-contact': []
}>()

// Composables
const { t } = useI18n()
const profileStore = useProfileStore()
const presenceStore = usePresenceStore()

// Reactive data
const searchQuery = ref('')
const loading = ref(false)

// Computed properties
const filteredContacts = computed(() => {
  // Get all profiles except current user and excluded users
  const allContacts = Object.values(profileStore.profiles).filter(
    profile =>
      profile.id !== props.currentUserId &&
      !props.excludeUserIds.includes(profile.id)
  )

  if (!searchQuery.value.trim()) {
    return allContacts
  }

  const query = searchQuery.value.toLowerCase()

  return allContacts.filter(contact =>
    contact.name.toLowerCase().includes(query)
  )
})

// Methods
const getContactAvatar = (contact: Profile) => {
  // If contact has an avatar, use it; otherwise generate a text avatar from their name
  return contact.avatar || defaultTextAvatar(contact.name)
}

const getContactSubtitle = (contact: Profile): string => {
  const status = presenceStore.getUserStatus(contact.id)

  switch (status) {
    case 'online':
      return t('presence.online')
    case 'busy':
      return t('presence.busy')
    case 'away':
      return t('presence.away')
    case 'offline':
    default:
      return t('presence.offline')
  }
}

const handleContactClick = (contact: Profile) => {
  // Optional: Show contact details or perform other actions
  console.log('Contact clicked:', contact)
}

const handleSelectContact = (contact: Profile) => {
  onDialogOK(contact.id)
}

const handleAddContact = () => {
  emit('add-contact')
  // For now, just close the dialog
  // In the future, this could open another dialog to add new contacts
  onDialogCancel()
}

// Lifecycle
onMounted(async () => {
  loading.value = true
  try {
    // Ensure profiles are loaded
    // This might already be done by the app initialization
    if (Object.keys(profileStore.profiles).length === 0) {
      // If profiles aren't loaded yet, we might need to fetch them
      // This depends on how the profile store is implemented
      console.log('No profiles found in store')
    }
  } catch (error) {
    console.error('Failed to load contacts:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss">
@import './contacts-dialog.scss';
</style>
