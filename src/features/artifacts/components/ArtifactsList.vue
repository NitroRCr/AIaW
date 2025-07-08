<template>
  <select-file-btn @input="artifactFromFiles" />
  <icon-side-button
    :title="$t('mainLayout.createArtifact')"
    icon="sym_o_add"
    flat
    dense
    @click="createEmptyArtifact"
  />
  <q-list>
    <div p="x-4 y-2">
      <a-input
        dense
        outlined
        v-model="filter"
        clearable
        :placeholder="$t('artifactsExpansion.searchPlaceholder')"
      />
    </div>
    <q-item
      v-for="artifact in filteredArtifacts"
      :key="artifact.id"
      clickable
      @click="
        route.query.artifactId !== artifact.id &&
          router.push({ query: { openArtifact: artifact.id } })
      "
      :class="{ 'route-active': openedArtifacts.includes(artifact.id) }"
      item-rd
      min-h="32px"
      py-1
      px-3
    >
      <q-item-section
        avatar
        min-w-0
        pr-2
      >
        <artifact-item-icon
          size="16px"
          :artifact
        />
      </q-item-section>
      <q-item-section>
        {{ artifact.name }}
      </q-item-section>
      <q-item-section side>
        <q-btn
          v-if="openedArtifacts.includes(artifact.id)"
          flat
          dense
          round
          icon="sym_o_close"
          :title="$t('artifactsExpansion.close')"
          size="sm"
          @click.prevent.stop="closeArtifact(artifact)"
        />
      </q-item-section>
      <artifact-item-menu :artifact />
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, inject, ref, Ref, toRef } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter, useRoute } from "vue-router"

import IconSideButton from "@/shared/components/layout/IconSideButton.vue"
import { useUserDataStore } from "@/shared/store"
import { caselessIncludes, getFileExt, isTextFile } from "@/shared/utils/functions"
import { dialogOptions } from "@/shared/utils/values"

import { useCloseArtifact } from "@/features/artifacts/composables/useCloseArtifact"
import { useCreateArtifact } from "@/features/artifacts/composables/useCreateArtifact"
import SelectFileBtn from "@/features/files/components/SelectFileBtn.vue"

import { Artifact } from "@/services/data/types/artifact"
import { Workspace } from "@/services/data/types/workspace"

import ArtifactItemIcon from "./ArtifactItemIcon.vue"
import ArtifactItemMenu from "./ArtifactItemMenu.vue"

const artifacts: Ref<Artifact[]> = inject("artifacts")

const filter = ref(null)
const filteredArtifacts = computed(() => {
  return artifacts.value
    .filter((d) => !filter.value || caselessIncludes(d.name, filter.value))
    .reverse()
})

const { closeArtifact } = useCloseArtifact()
const userDataStore = useUserDataStore()
const workspace = inject<Ref<Workspace>>("workspace")
const openedArtifacts = computed(
  () => userDataStore.data.openedArtifacts[workspace.value.id] || []
)
const { t } = useI18n()
const $q = useQuasar()
const { createArtifact } = useCreateArtifact(toRef(workspace.value, "id"))
const router = useRouter()
const route = useRoute()

function createEmptyArtifact () {
  $q.dialog({
    title: t("artifactsExpansion.createArtifact"),
    prompt: {
      model: "",
      type: "text",
      label: t("artifactsExpansion.name"),
      isValid: (v) => !!v.trim(),
    },
    cancel: true,
    ok: t("artifactsExpansion.create"),
    ...dialogOptions,
  }).onOk((name) => {
    const language = getFileExt(name)
    createArtifact({ name, language })
  })
}

async function artifactFromFiles (files: File[]) {
  for (const file of files) {
    if (!(await isTextFile(file))) {
      $q.notify({
        message: t("artifactsExpansion.nonTextFile", { name: file.name }),
        color: "negative",
      })
      continue
    }

    const text = await file.text()
    await createArtifact({
      name: file.name,
      language: getFileExt(file.name),
      versions: [{ date: new Date(file.lastModified).toISOString(), text }],
      currIndex: 0,
      tmp: text,
    })
  }
}
</script>
