<template>
  <q-item clickable>
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
      <q-icon name="sym_o_chevron_right" />
    </q-item-section>
    <q-menu
      :anchor="$q.screen.lt.sm ? 'bottom start' : 'top right'"
      :self="$q.screen.lt.sm ? 'top start' : 'top left'"
      :style="$q.screen.lt.sm ? { width: `${DRAWER_WIDTH}px` } : {}"
      square
      class="no-shadow p-0"
    >
      <workspace-nav />
    </q-menu>
  </q-item>
</template>
<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { DRAWER_WIDTH } from "@/shared/components/consts"
import { IconAvatar } from "@/shared/types"
import { avatarKey } from "@/shared/utils/functions"

import WorkspaceNav from "@/features/workspaces/components/WorkspaceNav.vue"
import { useActiveWorkspace } from "@/features/workspaces/composables/useActiveWorkspace"

const $q = useQuasar()
const { workspace } = useActiveWorkspace()

const avatar = computed(
  () =>
    workspace.value?.avatar ||
    ({ type: "icon", icon: "sym_o_question_mark" } as IconAvatar)
)
</script>
