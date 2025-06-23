<template>
  <q-btn-dropdown
    :icon="currentStatusIcon"
    :color="currentStatusColor"
    flat
    dense
    :label="showLabel ? currentStatusText : undefined"
  >
    <q-list>
      <q-item
        v-for="status in statusOptions"
        :key="status.value"
        clickable
        v-close-popup
        @click="updateStatus(status.value)"
        :class="{ 'bg-grey-2': status.value === currentStatus }"
      >
        <q-item-section avatar>
          <q-icon
            :name="status.icon"
            :color="status.color"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ status.label }}</q-item-label>
        </q-item-section>
        <q-item-section
          side
          v-if="status.value === currentStatus"
        >
          <q-icon
            name="check"
            color="positive"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { usePresenceStore, type PresenceStatus } from '@/features/profile/store/presence'

interface Props {
  showLabel?: boolean
}

withDefaults(defineProps<Props>(), {
  showLabel: false
})

const { t } = useI18n()
const presenceStore = usePresenceStore()

const statusOptions = [
  {
    value: 'online' as PresenceStatus,
    label: t('presence.online'),
    icon: 'sym_o_circle',
    color: 'positive'
  },
  {
    value: 'away' as PresenceStatus,
    label: t('presence.away'),
    icon: 'sym_o_schedule',
    color: 'warning'
  },
  {
    value: 'busy' as PresenceStatus,
    label: t('presence.busy'),
    icon: 'sym_o_do_not_disturb',
    color: 'negative'
  },
  {
    value: 'offline' as PresenceStatus,
    label: t('presence.offline'),
    icon: 'sym_o_circle',
    color: 'grey'
  }
]

const currentStatus = computed(() => presenceStore.currentStatus)

const currentStatusConfig = computed(() => {
  return statusOptions.find(option => option.value === currentStatus.value) || statusOptions[0]
})

const currentStatusIcon = computed(() => currentStatusConfig.value.icon)
const currentStatusColor = computed(() => currentStatusConfig.value.color)
const currentStatusText = computed(() => currentStatusConfig.value.label)

const updateStatus = async (status: PresenceStatus) => {
  await presenceStore.updateStatus(status)
}
</script>
