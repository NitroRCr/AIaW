<template>
  <q-icon :name="icon" />
</template>

<script setup lang="ts">
import { computed } from "vue"

import { codeExtensions } from "@/shared/utils/values"

import { Artifact } from "@/services/data/types/artifact"

const props = defineProps<{
  artifact: Artifact
}>()

const icon = computed(() =>
  codeExtensions.includes(props.artifact.name.split(".").pop())
    ? "sym_o_code"
    : "sym_o_description"
)
</script>
