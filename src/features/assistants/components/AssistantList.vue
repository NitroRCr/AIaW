<template>
  <assistant-list-item
    v-for="assistant in assistants"
    :key="assistant.id"
    :assistant="assistant"
    :workspace-id="workspaceId"
    :get-link="getLink"
  />
  <q-item
    clickable
    @click="addItem"
    text-sec
    item-rd
    min-h="42px"
  >
    <q-item-section
      avatar
      min-w-0
    >
      <q-icon name="sym_o_add" />
    </q-item-section>
    <q-item-section>
      {{ $t("assistantsExpansion.createAssistant") }}
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useRouter } from "vue-router"

import { useUserPerfsStore } from "@/shared/store"
import { defaultAvatar } from "@/shared/utils/functions"

import { useAssistantsStore } from "@/features/assistants/store"

import AssistantListItem from "./AssistantListItem.vue"

const { workspaceId } = defineProps<{ workspaceId: string }>()
const assistantsStore = useAssistantsStore()
const { data: perfs } = storeToRefs(useUserPerfsStore())
const assistants = computed(() =>
  assistantsStore.assistants.filter(
    (a) => a.workspace_id === workspaceId || a.workspace_id == null
  )
)
const router = useRouter()

function getLink (id) {
  return workspaceId
    ? `/workspaces/${workspaceId}/assistants/${id}`
    : `/assistants/${id}`
}

async function addItem () {
  const assistant = await assistantsStore.add({
    name: "New Assistant",
    workspace_id: workspaceId,
    avatar: defaultAvatar("AI"),
    provider: perfs.value.provider,
    model: perfs.value.model,
  })
  router.push(getLink(assistant.id))
}
</script>
