<template>
  <transition name="fade">
    <q-page-container v-if="show">
      <q-page
        flex
        items-center
        pos-relative
      >
        <q-btn
          flat
          round
          dense
          icon="sym_o_menu"
          pos-absolute
          top-2
          left-3
          v-if="props.drawerToggle"
          @click="uiStateStore.mainDrawerOpen = !uiStateStore.mainDrawerOpen"
        />
        <hint-card
          img-url="/emotions/nachoneko/19.webp"
          :message="$t('errorNotFound.message')"
        />
      </q-page>
    </q-page-container>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"

import HintCard from "@/shared/components/ui/HintCard.vue"
import { useUiStateStore } from "@/shared/store"

const props = defineProps<{
  timeout?: number
  drawerToggle?: boolean
}>()

const uiStateStore = useUiStateStore()

const show = ref(false)

onMounted(() => {
  setTimeout(() => {
    show.value = true
  }, props.timeout ?? 200)
})
</script>
