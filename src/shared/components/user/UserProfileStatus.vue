<template>
  <div
    class="user-profile-status"
    :class="[
      `user-profile-status--${size}`,
      showText ? 'user-profile-status--with-text' : 'user-profile-status--dot-only'
    ]"
  >
    <div
      class="user-profile-status__indicator"
      :class="[
        `user-profile-status__indicator--${status}`,
        `user-profile-status__indicator--${size}`
      ]"
      :style="indicatorStyle"
    />

    <span
      v-if="showText"
      class="user-profile-status__text"
      :class="[
        `user-profile-status__text--${size}`,
        textColorClass
      ]"
    >
      {{ statusText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { computed } from 'vue'

// Type definitions
type StatusType = 'online' | 'away' | 'busy' | 'offline'
type SizeType = 'small' | 'medium' | 'large'

interface Props {
  status: StatusType
  showText?: boolean
  size?: SizeType
}

// Component props with defaults
const props = withDefaults(defineProps<Props>(), {
  showText: false,
  size: 'medium'
})

const $q = useQuasar()

// Status color mapping
const statusColors = {
  online: {
    light: '#22c55e', // green-500
    dark: '#16a34a' // green-600
  },
  away: {
    light: '#eab308', // yellow-500
    dark: '#ca8a04' // yellow-600
  },
  busy: {
    light: '#ef4444', // red-500
    dark: '#dc2626' // red-600
  },
  offline: {
    light: '#6b7280', // gray-500
    dark: '#9ca3af' // gray-400
  }
}

// Status text mapping
const statusTextMap: Record<StatusType, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline'
}

// Computed properties
const statusText = computed(() => statusTextMap[props.status])

const indicatorStyle = computed(() => {
  const colorConfig = statusColors[props.status]
  const backgroundColor = $q.dark.isActive ? colorConfig.dark : colorConfig.light

  return {
    backgroundColor,
    boxShadow: $q.dark.isActive
      ? '0 0 0 2px rgba(255, 255, 255, 0.1)'
      : '0 0 0 2px rgba(255, 255, 255, 0.8)'
  }
})

const textColorClass = computed(() => {
  return $q.dark.isActive ? 'text-grey-3' : 'text-grey-8'
})
</script>

<style lang="scss" scoped>
.user-profile-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &--small {
    gap: 4px;
  }

  &--large {
    gap: 8px;
  }
}

.user-profile-status__indicator {
  border-radius: 50%;
  flex-shrink: 0;

  &--small {
    width: 8px;
    height: 8px;
  }

  &--medium {
    width: 10px;
    height: 10px;
  }

  &--large {
    width: 12px;
    height: 12px;
  }
}

.user-profile-status__text {
  font-weight: 500;
  white-space: nowrap;

  &--small {
    font-size: 11px;
  }

  &--medium {
    font-size: 12px;
  }

  &--large {
    font-size: 13px;
  }
}
</style>
