<template>
  <router-view @toggle-drawer="drawerOpen = !drawerOpen" />
  <q-drawer
    show-if-above
    bg-sur-c-low
    :width="275"
    :breakpoint="drawerBreakpoint"
    side="right"
    v-model="drawerOpen"
  >
    <div class="q-pa-md">
      <div class="text-h6 q-mb-md">
        {{ $t('workspacesPage.quickActions') }}
      </div>
      <q-btn
        color="primary"
        icon="sym_o_add"
        :label="$t('workspacesPage.createWorkspace')"
        class="full-width q-mb-sm"
        @click="createWorkspace"
      />
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, provide, ref } from "vue"

import { useWorkspaceActions } from "@/features/workspaces/composables/useWorkspaceActions"
const drawerOpen = ref(false)
const drawerBreakpoint = 960
const $q = useQuasar()
const rightDrawerAbove = computed(() => $q.screen.width > drawerBreakpoint)
provide("rightDrawerAbove", rightDrawerAbove)

const { addWorkspace } = useWorkspaceActions()

function createWorkspace() {
  addWorkspace()
}
</script>
