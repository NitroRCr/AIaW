<template>
  <q-separator
    v-if="separator"
    spaced
  />
  <q-item
    px-3
    text-sec
  >
    <q-item-section>
      {{ title }}
    </q-item-section>
    <q-item-section side>
      <slot name="icon" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
defineProps<{
  title: string,
  separator?: boolean
}>()
</script>
