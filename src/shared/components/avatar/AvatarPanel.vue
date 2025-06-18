<template>
  <div>
    <div
      text-sec
      py-2
      v-if="title"
    >
      {{ title }}
    </div>
    <div
      flex="~ wrap"
      gap-2
    >
      <a-avatar
        v-for="(item, index) in items"
        :key="index"
        :avatar="item"
        @click="$emit('select', item)"
        cursor-pointer
        :class="{
          'outline-pri outline-solid outline-2px': index === selectedIndex,
        }"
        size="36px"
        :title="item.title"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"

import { Avatar } from "@/shared/utils/types"

import AAvatar from "./AAvatar.vue"

const props = defineProps<{
  title?: string
  items: Avatar[]
  selected: Avatar
}>()

defineEmits<{
  select: [Avatar]
}>()

const selectedIndex = computed(() =>
  props.items.findIndex((item) => {
    if (item.type === "svg" && props.selected.type === "svg") {
      return item.name === props.selected.name
    } else if (item.type === "url" && props.selected.type === "url") {
      return item.url === props.selected.url
    } else if (item.type === "image" && props.selected.type === "image") {
      return item.imageId === props.selected.imageId
    } else if (item.type === "icon" && props.selected.type === "icon") {
      return item.icon === props.selected.icon
    } else {
      return false
    }
  })
)
</script>
