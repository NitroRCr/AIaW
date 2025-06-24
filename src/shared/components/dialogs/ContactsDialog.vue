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

      <!-- Contacts list with infinite scroll -->
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

          <!-- Contacts list with infinite scroll -->
          <template
            v-else-if="filteredContacts.length > 0"
          >
            <q-infinite-scroll
              @load="onLoad"
              :offset="250"
            >
              <template
                v-for="(contact, index) in visibleContacts"
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
                    <q-item-label
                      caption
                      class="row items-center no-wrap"
                    >
                      <user-profile-status
                        :status="getContactStatus(contact)"
                        :show-text="true"
                        size="small"
                        class="q-mr-xs"
                      />
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
                <q-separator v-if="index < visibleContacts.length - 1" />
              </template>

              <template #loading>
                <div class="row justify-center q-my-md">
                  <q-spinner-dots
                    color="primary"
                    size="40px"
                  />
                </div>
              </template>
            </q-infinite-scroll>
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
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { ref, computed, onMounted, watch } from 'vue'

import AAvatar from '@/shared/components/AAvatar.vue'
import UserProfileStatus from '@/shared/components/user/UserProfileStatus.vue'
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

// Composables
const profileStore = useProfileStore()
const presenceStore = usePresenceStore()

// Reactive data
const searchQuery = ref('')
const loading = ref(false)
const visibleContacts = ref<Profile[]>([])
const itemsPerPage = 15
const currentPage = ref(0)

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

const getContactStatus = (contact: Profile): 'online' | 'away' | 'busy' | 'offline' => {
  const status = presenceStore.getUserStatus(contact.id)

  // Fallback to 'offline' if status is undefined/null
  return status || 'offline'
}

const handleContactClick = (contact: Profile) => {
  // Optional: Show contact details or perform other actions
  console.log('Contact clicked:', contact)
}

const handleSelectContact = (contact: Profile) => {
  onDialogOK(contact.id)
}

const loadInitialContacts = () => {
  currentPage.value = 0
  const startIndex = 0
  const endIndex = Math.min(itemsPerPage, filteredContacts.value.length)
  visibleContacts.value = filteredContacts.value.slice(startIndex, endIndex)
  currentPage.value = 1
}

const onLoad = (index: number, done: (stop?: boolean) => void) => {
  const startIndex = currentPage.value * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredContacts.value.length)

  // Simulate loading delay
  setTimeout(() => {
    if (startIndex < filteredContacts.value.length) {
      const nextBatch = filteredContacts.value.slice(startIndex, endIndex)
      visibleContacts.value.push(...nextBatch)
      currentPage.value++

      // Check if we've loaded all contacts
      const hasMore = endIndex < filteredContacts.value.length
      done(!hasMore)
    } else {
      // No more contacts to load
      done(true)
    }
  }, 300)
}

// Watch for search query changes to reset the visible contacts
watch(searchQuery, () => {
  loadInitialContacts()
})

// Watch for filtered contacts changes (e.g., when profiles are loaded)
watch(filteredContacts, () => {
  loadInitialContacts()
}, { immediate: true })

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

    // Load initial contacts
    loadInitialContacts()
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
