<template>
  <q-list>
    <q-item
      v-if="accept === 'folder'"
      :class="{ 'route-active': !selected }"
      clickable
      dense
      @click="selected = null"
    >
      <q-item-section>[{{ $t("workspaceListSelect.root") }}]</q-item-section>
    </q-item>
    <workspace-list-item
      v-for="item in rootItems"
      :key="item.id"
      :item="item"
      :accept
      v-model:selected="selected"
    />
  </q-list>
</template>

<script setup lang="ts">
import { useRootWorkspace } from "@/features/workspaces/composables"

import WorkspaceListItem from "./WorkspaceListItem.vue"

defineProps<{
  accept: "workspace" | "folder"
}>()

const selected = defineModel<string>()
const rootItems = useRootWorkspace(null)
</script>
