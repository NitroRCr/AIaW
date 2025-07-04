<template>
  <q-item
    clickable
    :to="`/workspaces/my`"
  >
    <q-item-section avatar>
      <a-avatar
        :avatar="avatar"
        :key="avatarKey(avatar)"
      />
    </q-item-section>
    <q-item-section>
      {{ workspace?.name || "Select a workspace..." }}
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

const { workspace } = useActiveWorkspace()

const avatar = computed(
  () =>
    workspace.value?.avatar ||
    ({ type: "icon", icon: "sym_o_question_mark" } as IconAvatar)
)
</script>
