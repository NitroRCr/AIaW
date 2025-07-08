<template>
  <dragable-separator
    v-model="widthLocal"
    @update:model-value="onResize"
    reverse
    :min="600"
    h-full
    w-2
    v-if="showArtifacts"
  />

  <div
    v-if="showArtifacts"
    h-full
    min-w-0
    flex="~ col 1"
  >
    <div
      flex
      items-center
      h="50px"
    >
      <q-tabs
        inline-label
        dense
        mt="14px"
        rd-t
      >
        <q-route-tab
          no-caps
          v-for="artifact in openedArtifacts"
          :key="artifact.id"
          :to="{ query: { artifactId: artifact.id } }"
          :class="{
            'text-pri icon-fill': focusedArtifact?.id === artifact.id,
          }"
          pl-3
          pr-2
        >
          <artifact-item-icon :artifact="artifact" />
          <div ml-2>
            {{ artifact.name }}
          </div>
          <div v-if="artifactUnsaved(artifact)">
            *
          </div>
          <q-btn
            ml-1
            flat
            dense
            round
            icon="sym_o_close"
            :title="$t('workspacePage.closeArtifact')"
            size="sm"
            text-out
            @click.prevent.stop="closeArtifact(artifact)"
          />
          <artifact-item-menu :artifact />
        </q-route-tab>
      </q-tabs>
      <q-space />
      <q-btn
        flat
        dense
        round
        icon="sym_o_close"
        :title="$t('workspacePage.closeAllArtifacts')"
        text-on-sur-var
        @click="closeAllArtifacts"
      />
    </div>
    <edit-artifact
      :artifact="focusedArtifact"
      v-if="focusedArtifact"
    />
  </div>
</template>

<script setup lang="ts">

import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DragableSeparator from "@/shared/components/DragableSeparator.vue"
import { useUserDataStore } from "@/shared/store"
import { artifactUnsaved } from "@/shared/utils/functions"

import ArtifactItemIcon from "@/features/artifacts/components/ArtifactItemIcon.vue"
import ArtifactItemMenu from "@/features/artifacts/components/ArtifactItemMenu.vue"
import { useCloseArtifact } from "@/features/artifacts/composables/useCloseArtifact"
import { useArtifactsStore } from "@/features/artifacts/store"
import EditArtifact from "@/features/artifacts/views/EditArtifact.vue"

import { Artifact } from "@/services/data/types/artifact"

const { closeArtifact } = useCloseArtifact()

const props = defineProps<{
  workspaceId: string,
  showArtifacts: boolean,
  width: number,
}>()

const emit = defineEmits<{
  'update:width': [number]
}>()

function onResize(newWidth: number) {
  emit('update:width', newWidth)
}

const widthLocal = ref(props.width)
watch(
  () => props.width,
  (val) => {
    widthLocal.value = val
  }
)

const userDataStore = useUserDataStore()

const artifactsStore = useArtifactsStore()

const artifacts = computed(() =>
  Object.values(artifactsStore.workspaceArtifacts[props.workspaceId] || {}).map(
    (a) => a as Artifact
  )
)
const route = useRoute()

function closeAllArtifacts () {
  for (const artifact of openedArtifacts.value) {
    closeArtifact(artifact)
  }
}

const openedArtifacts = computed(() =>
  artifacts.value.filter((a) =>
    userDataStore.data.openedArtifacts.includes(a.id)
  )
)
const focusedArtifact = computed(
  () =>
    openedArtifacts.value.find((a) => a.id === route.query.artifactId) ||
    openedArtifacts.value.at(-1)
)

const router = useRouter()

console.log("ws page opened artifacts", openedArtifacts.value, focusedArtifact)

watch(
  () => route.query.openArtifact,
  (val) => {
    if (!val) return

    const artifact = artifacts.value.find((a) => a.id === val)

    if (artifact) {
      if (!userDataStore.data.openedArtifacts.includes(artifact.id)) {
        userDataStore.data.openedArtifacts.push(artifact.id)
        router.replace({ query: { artifactId: artifact.id } })
      }
    } else {
      router.replace({ query: { artifactId: focusedArtifact.value?.id } })
    }
  }
)

watch(
  focusedArtifact,
  (val) => {
    if (val) {
      val.id !== route.query.artifactId &&
        router.replace({ query: { artifactId: val.id } })
    } else {
      router.replace({ query: { artifactId: undefined } })
    }
  },
  { immediate: true }
)
</script>
