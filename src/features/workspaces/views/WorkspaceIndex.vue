<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      <div class="flex items-center">
        <a-avatar
          :avatar="workspace?.avatar"
          size="42px"
        />
        <span class="ml-2">{{ workspace.name }}</span>
      </div>
    </q-toolbar-title>
  </view-common-header>
  <q-page-container
    bg-sur-c-low
    class="flex column"
  >
    <q-page
      bg-sur
      class="col flex flex-center"
    >
      <div>
        <md-preview
          bg-sur
          rd-lg
          :model-value="contentMd"
          v-bind="mdPreviewProps"
          max-w="1000px"
          m-a
        />
        <h5
          class="text-center"
          mt-2
          mb-10
        >
          What are you working on?
        </h5>
        <NewDialogInput />
      </div>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { MdPreview } from "md-editor-v3"
import { computed } from "vue"

import AAvatar from "@/shared/components/AAvatar.vue"
import { useMdPreviewProps } from "@/shared/composables/mdPreviewProps"
import { useSetTitle } from "@/shared/composables/setTitle"

import NewDialogInput from "@/features/dialogs/components/NewDialogInput.vue"
import { DefaultWsIndexContent } from "@/features/dialogs/utils/dialogTemplateDefinitions"
import { engine } from "@/features/dialogs/utils/templateEngine"

import { useActiveWorkspace } from "../composables"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

defineEmits(["toggle-drawer"])

const { workspace } = useActiveWorkspace()

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
