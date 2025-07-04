<template>
  <q-item
    clickable
    :to="`/workspaces/${workspace.id}/assistants`"
  >
    <q-item-section
      avatar
    >
      <a-avatar
        :avatar="avatar"
        :key="avatarKey(avatar)"
      />
    </q-item-section>
    <q-item-section>
      {{ assistant?.name || "Select a assistant..." }}
    </q-item-section>
    <q-item-section side>
      <q-icon name="sym_o_arrow_right" />
    </q-item-section>
  </q-item>
</template>
<script setup lang="ts">
import { computed } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { IconAvatar } from "@/shared/types"
import { avatarKey } from "@/shared/utils/functions"

import { useActiveWorkspace } from "@/features/workspaces/composables/useActiveWorkspace"

const { assistant, workspace } = useActiveWorkspace()

const avatar = computed(
  () =>
    assistant.value?.avatar ||
    ({ type: "icon", icon: "sym_o_question_mark" } as IconAvatar)
)
</script>
