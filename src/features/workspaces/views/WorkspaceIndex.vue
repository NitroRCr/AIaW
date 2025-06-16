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
import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
import { useMdPreviewProps } from "@/shared/composables/mdPreviewProps"
import { useSetTitle } from "@/shared/composables/setTitle"
import { useWorkspacesStore } from "@/features/workspaces/store"
import { engine } from "@/features/dialogs/utils/templateEngine"
import { DefaultWsIndexContent } from "@/features/dialogs/utils/templates"
import { computed } from "vue"

defineEmits(["toggle-drawer"])

const props = defineProps<{
  id: string
}>()

const store = useWorkspacesStore()

const workspaceId = computed(() => props.id)
const workspace = computed(() => store.workspaces.find(w => w.id === workspaceId.value))

const contentMd = computed(() =>
  workspace.value ? engine.parseAndRenderSync(workspace.value.index_content, {
    workspace: workspace.value || DefaultWsIndexContent,
  }) : ''
)

useSetTitle(computed(() => workspace.value?.name))

const mdPreviewProps = useMdPreviewProps()
</script>
