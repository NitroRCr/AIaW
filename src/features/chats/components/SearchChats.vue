<template>
  <q-dialog
    ref="dialogRef"
    v-model="open"
    @hide="onDialogHide"
    position="top"
  >
    <q-card
      mx-4
      important:bg-sur
      min-w="min(500px, 90vw)"
    >
      <div
        p-2
        flex
        gap-2
      >
        <a-input
          v-model="q"
          @keyup.enter="search"
          outlined
          dense
          clearable
          class="grow"
          autofocus
          :placeholder="'Search chats...'"
        >
          <template #prepend>
            <q-icon name="sym_o_search" />
          </template>
        </a-input>
        <q-btn-toggle
          shrink-0
          unelevated
          toggle-color="pri-c"
          toggle-text-color="on-pri-c"
          v-model="global"
          no-caps
          :options="[
            { label: $t('searchDialog.workspace'), value: false },
            { label: $t('searchDialog.global'), value: true },
          ]"
        />
      </div>
      <div
        v-if="results"
        max-h="80vh"
        overflow-y-auto
        pb-1
      >
        <q-list ref="listRef">
          <q-item v-if="!results.length">
            <q-item-section>
              <q-item-label text-on-sur-var>
                {{ $t("searchDialog.noResults") }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            v-for="(r, i) in results"
            :key="i"
            clickable
            item-rd
            :to="`${r.workspaceId ? `/workspaces/${r.workspaceId}` : ''}/chats/${r.chatId}?goto=${JSON.stringify({ messageId: r.messageId, highlight: q })}`"
          >
            <q-item-section>
              <q-item-label>
                {{ r.name }}
              </q-item-label>
              <q-item-label
                caption
                v-if="r.preview"
              >
                {{ r.preview }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import Mark from "mark.js"
import { QList, useDialogPluginComponent } from "quasar"
import { nextTick, watch, ref, watchEffect } from "vue"

import { escapeRegex } from "@/shared/utils/functions"

import { useChatsStore } from "@/features/chats/store"

const props = defineProps<{
  workspaceId: string | null
}>()

defineEmits([...useDialogPluginComponent.emits])

const open = defineModel<boolean>({ required: true })

const chatsStore = useChatsStore()
const q = ref("")

const global = ref(false)
watchEffect(async () => {
  search()
})

interface Result {
  workspaceId: string
  chatId: string
  name: string
  messageId: string
  preview?: string
}
const results = ref<Result[]>(null)
const listRef = ref<QList>()

async function search () {
  if (!q.value) return

  // const hits = docs.value.filter(d => caselessIncludes(d.content, q.value)).slice(0, 100)
  unmark()
  results.value = (
    await chatsStore.search(q.value, global.value ? null : props.workspaceId)
  ).map((r) => ({
    workspaceId: r.chat.workspace_id,
    chatId: r.chat_id,
    name: r.chat.name,
    messageId: r.id,
    preview: r.content.match(
      new RegExp(`^.*${escapeRegex(q.value)}.*$`, "im")
    )[0],
  }))
  // results.value = [
  //   ...hits.map(h => {
  //     const dialog = dialogs.value.find(d => d.id === h.dialogId)
  //     return dialog && {
  //       workspaceId: dialog.workspaceId,
  //       dialogId: dialog.id,
  //       title: dialog.name,
  //       preview: h.content.match(new RegExp(`^.*${escapeRegex(q.value)}.*$`, 'im'))[0],
  //       route: getRoute(dialog.msgTree, h.id)
  //     }
  //   }).filter(Boolean),
  //   ...dialogs.value.filter(d => caselessIncludes(d.name, q.value)).map(d => ({
  //     workspaceId: d.workspaceId,
  //     dialogId: d.id,
  //     title: d.name,
  //     route: []
  //   }))
  // ].reverse()
  nextTick(() => {
    highlight()
  })
}

function unmark () {
  if (!listRef.value) return

  const mark = new Mark(listRef.value.$el)
  mark.unmark()
}

function highlight () {
  if (!q.value) return

  if (!listRef.value) return

  const mark = new Mark(listRef.value.$el)
  mark.mark(q.value)
}

watch(open, (val) => {
  val &&
    results.value &&
    nextTick(() => {
      highlight()
    })
})

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>
