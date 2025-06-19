<template>
  <q-btn
    fab
    :icon="icon"
    :color="color"
    class="sticky-save-btn"
    @click="$emit('click')"
    :loading="loading"
    :disable="disabled"
    v-if="show"
  >
    <q-tooltip v-if="tooltip">
      {{ tooltip }}
    </q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
defineEmits(['click'])

withDefaults(defineProps<{
  loading?: boolean
  disabled?: boolean
  show?: boolean
  icon?: string
  color?: string
  tooltip?: string
}>(), {
  loading: false,
  disabled: false,
  show: true,
  icon: 'sym_o_save',
  color: 'primary',
  tooltip: undefined
})
</script>
