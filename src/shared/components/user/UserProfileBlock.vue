<template>
  <q-item
    :class="[
      layout === 'vertical' ? 'column items-center' : 'row items-center',
      size === 'small' ? 'q-pa-xs' : size === 'large' ? 'q-pa-md' : 'q-pa-sm',
      { 'cursor-pointer': clickable }
    ]"
    :clickable="clickable"
    @click="handleClick"
    v-ripple="clickable"
  >
    <!-- Avatar Section -->
    <q-item-section
      :avatar="layout === 'horizontal'"
      :class="[
        layout === 'vertical' ? 'col-auto q-mb-xs' : '',
        'relative-position'
      ]"
    >
      <a-avatar
        :avatar="user.avatar"
        :size="avatarSize"
      />
      <!-- Status indicator for vertical layout -->
      <div
        v-if="user.status && layout === 'vertical'"
        class="absolute-bottom-right q-pa-xs bg-white rounded-borders"
        style="bottom: -2px; right: -2px;"
      >
        <user-profile-status
          :status="user.status"
          :show-text="false"
          :size="statusIndicatorSize"
        />
      </div>
    </q-item-section>

    <!-- Content Section -->
    <q-item-section
      :class="[
        layout === 'vertical' ? 'col-auto text-center' : 'col',
        'q-ml-none'
      ]"
    >
      <!-- Main name -->
      <q-item-label
        :class="[
          'text-weight-medium ellipsis',
          size === 'small' ? 'text-caption' : size === 'large' ? 'text-body1' : 'text-body2'
        ]"
      >
        {{ user.displayName || user.name }}
      </q-item-label>

      <!-- Secondary info row -->
      <q-item-label
        v-if="user.subtitle || (user.status && layout === 'horizontal')"
        caption
        :class="[
          'row items-center no-wrap',
          layout === 'vertical' ? 'justify-center' : 'justify-start',
          size === 'small' ? 'text-overline' : 'text-caption'
        ]"
      >
        <!-- Status with text for horizontal layout -->
        <user-profile-status
          v-if="user.status && layout === 'horizontal'"
          :status="user.status"
          :show-text="true"
          :size="statusTextSize"
          class="q-mr-xs"
        />
        <!-- Subtitle -->
        <span
          v-if="user.subtitle"
          class="ellipsis"
        >
          {{ user.subtitle }}
        </span>
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AAvatar from '@/shared/components/avatar/AAvatar.vue'
import { Avatar } from '@/shared/types'

import UserProfileStatus from './UserProfileStatus.vue'

// Type definitions
type StatusType = 'online' | 'away' | 'busy' | 'offline'
type LayoutType = 'horizontal' | 'vertical'
type SizeType = 'small' | 'medium' | 'large'

interface User {
  avatar: Avatar
  name: string
  displayName?: string
  status?: StatusType
  subtitle?: string
}

interface Props {
  user: User
  layout?: LayoutType
  size?: SizeType
  clickable?: boolean
}

// Component props with defaults
const props = withDefaults(defineProps<Props>(), {
  layout: 'horizontal',
  size: 'medium',
  clickable: false
})

// Emits
const emit = defineEmits<{
  click: [user: User]
}>()

// Computed properties for sizes
const avatarSize = computed(() => {
  const sizeMap = {
    small: 'sm',
    medium: 'md',
    large: 'lg'
  }

  return sizeMap[props.size]
})

const statusIndicatorSize = computed(() => {
  const sizeMap = {
    small: 'small',
    medium: 'small',
    large: 'medium'
  }

  return sizeMap[props.size] as 'small' | 'medium' | 'large'
})

const statusTextSize = computed(() => {
  const sizeMap = {
    small: 'small',
    medium: 'small',
    large: 'medium'
  }

  return sizeMap[props.size] as 'small' | 'medium' | 'large'
})

// Click handler
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.user)
  }
}
</script>
