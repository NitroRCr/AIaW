<template>
  <q-item>
    <q-item-section
      avatar
      min-w-0
    >
      <a-avatar
        v-if="assistant"
        size="sm"
        :avatar="assistant.avatar"
      />
      <q-icon
        v-else
        name="sym_o_error"
        text-warn
      />
    </q-item-section>
    <q-item-section>
      <q-item-label whitespace-nowrap>
        {{ assistant ? assistant.name : $t("assistantItem.unselected") }}
        <q-badge
          bg-pri-c
          text-on-pri-c
          ml-2
          py-1
          v-if="assistant && !assistant.workspaceId"
        >
          {{ $t("assistantItem.global") }}
        </q-badge>
        <!-- <q-icon
          name="sym_o_expand_more"
          size="sm"
          v-if="main"
        /> -->
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import AAvatar from "@/shared/components/avatar/AAvatar.vue"

import { Assistant } from "@/services/data/types/assistant"

defineProps<{
  assistant?: Assistant
  main?: boolean
}>()
</script>
