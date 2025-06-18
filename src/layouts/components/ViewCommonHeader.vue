<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
    <q-toolbar>
      <q-btn
        v-if="backTo"
        flat
        dense
        round
        icon="sym_o_arrow_back"
        @click="back"
      />
      <q-btn
        v-else
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStore.toggleMainDrawer"
      />
      <slot />
      <q-btn
        v-if="!noDrawer"
        flat
        dense
        round
        icon="sym_o_segment"
        @click="$emit('toggle-drawer')"
        @contextmenu.prevent="$emit('contextmenu')"
      />
      <settings-area />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import SettingsArea from "@/shared/components/layout/SettingsArea.vue"
import { useBack } from "@/shared/composables/back"
import { useUiStateStore } from "@/shared/store"

const uiStore = useUiStateStore()

defineEmits(["toggle-drawer", "contextmenu"])

const props = defineProps<{
  backTo?: string
  noDrawer?: boolean
}>()
const back = useBack(props.backTo)
</script>
<style scoped></style>
