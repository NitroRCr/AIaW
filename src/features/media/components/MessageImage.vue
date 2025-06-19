<template>
  <div
    pos-relative
    rd-md
    of-hidden
    cursor-pointer
    @click="viewImage"
  >
    <img
      v-if="url"
      :src="url"
      w-a
      h-a
      max-w-full
      max-h-full
      block
    >
    <div
      v-if="removable"
      bg-gradient-top-a
      pos-absolute
      top-0
      left-0
      right-0
      h="30px"
    />
    <q-btn
      v-if="removable"
      icon="sym_o_close"
      pos-absolute
      top-0
      right-0
      text-0-0-0-a
      flat
      round
      dense
      size="sm"
      @click.prevent.stop="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"

import { getFileUrl } from "@/shared/composables/storage/utils"

import ViewImageDialog from "@/features/media/components/ViewImageDialog.vue"

import { StoredItemResult } from "@/services/data/types/storedItem"

const props = defineProps<{
  image: StoredItemResult
  removable?: boolean
}>()

defineEmits(["remove"])

const url = getFileUrl(props.image.fileUrl)

const $q = useQuasar()

function viewImage () {
  $q.dialog({
    component: ViewImageDialog,
    componentProps: {
      url,
    },
  })
}
</script>
