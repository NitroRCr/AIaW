<template>
  <audio
    v-if="url"
    :src="url"
    controls
  />
</template>

<script setup lang="ts">
import { getFileUrl } from "@/shared/composables/storage/utils"

import { StoredItemResult } from "@/services/data/types/storedItem"

const props = defineProps<{
  audio: StoredItemResult
}>()

defineEmits(["remove"])

const url = getFileUrl(props.audio.fileUrl)
</script>
