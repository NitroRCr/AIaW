<template>
  <div
    text="sm center out"
    p="x-4 y-2"
  >
    {{ text }}
  </div>
</template>
<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>
