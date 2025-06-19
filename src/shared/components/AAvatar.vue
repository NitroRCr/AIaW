<template>
  <q-avatar
    v-if="avatar?.type === 'text'"
    :style
  >
    {{ avatar.text }}
  </q-avatar>
  <image-avatar
    v-else-if="avatar?.type === 'image'"
    :id="avatar.imageId"
    :style
  />
  <q-avatar
    v-else-if="avatar?.type === 'icon'"
    :icon="avatar.icon"
    :style
    :font-size
  />
  <q-avatar
    v-else-if="avatar?.type === 'url'"
    :style
  >
    <img :src="avatar.url">
  </q-avatar>
  <q-avatar
    v-else-if="avatar?.type === 'svg'"
    :icon="`svguse:/svg/${avatar.name}.svg#icon`"
    :style
    :font-size
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed } from "vue"

import { Avatar } from "@/shared/types"
import { hctToHex } from "@/shared/utils/functions"

import ImageAvatar from "./avatar/ImageAvatar.vue"
const props = defineProps<{
  avatar: Avatar
}>()

const $q = useQuasar()
const style = computed(() => {
  if (!props.avatar.hue) return {}

  const { hue } = props.avatar

  return $q.dark.isActive
    ? {
        color: hctToHex(hue, 40, 90),
        backgroundColor: hctToHex(hue, 40, 30),
      }
    : {
        color: hctToHex(hue, 40, 10),
        backgroundColor: hctToHex(hue, 40, 90),
      }
})

const fontSize = "0.6em"
</script>
