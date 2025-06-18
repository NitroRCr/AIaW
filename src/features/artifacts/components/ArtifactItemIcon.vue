<template>
  <q-icon :name="icon" />
</template>

<script setup lang="ts">
import { computed } from "vue"

import { codeExtensions } from "@/shared/utils/values"

import { ArtifactMapped } from "@/services/supabase/types"

const props = defineProps<{
  artifact: ArtifactMapped
}>()

const icon = computed(() =>
  codeExtensions.includes(props.artifact.name.split(".").pop())
    ? "sym_o_code"
    : "sym_o_description"
)
</script>
