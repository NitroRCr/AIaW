<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("workspaceIndex.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container bg-sur-c-low>
    <q-page
      bg-sur
      class="relative-position"
    >
      <md-preview
        bg-sur
        rd-lg
        :model-value="contentMd"
        v-bind="mdPreviewProps"
        max-w="1000px"
        m-a
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { MdPreview } from "md-editor-v3"
import { computed } from "vue"

import { useMdPreviewProps } from "@/shared/composables/mdPreviewProps"
import { useSetTitle } from "@/shared/composables/setTitle"

import { DefaultWsIndexContent } from "@/features/dialogs/utils/dialogTemplateDefinitions"
import { engine } from "@/features/dialogs/utils/templateEngine"
import { useWorkspacesStore } from "@/features/workspaces/store"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

defineEmits(["toggle-drawer"])

const props = defineProps<{
  id: string
}>()

const store = useWorkspacesStore()

const workspaceId = computed(() => props.id)
const workspace = computed(() => store.workspaces.find(w => w.id === workspaceId.value))

// FIXME: Heavy rendering operation in computed property
// This computed calls engine.parseAndRenderSync synchronously on every workspace change,
// which can block the UI thread. Consider using watch with debounce or cache the result.
// Alternative: pre-process workspace.indexContent in store or use async rendering.
const contentMd = computed(() =>
  workspace.value ? engine.parseAndRenderSync(workspace.value.indexContent, {
    workspace: workspace.value || DefaultWsIndexContent,
  }) : ''
)

useSetTitle(computed(() => workspace.value?.name))

const mdPreviewProps = useMdPreviewProps()
</script>
