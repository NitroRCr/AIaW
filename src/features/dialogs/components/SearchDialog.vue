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
          :placeholder="$t('searchDialog.placeholder')"
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
            :to="`/workspaces/${r.workspaceId}/dialogs/${r.dialogId}?goto=${JSON.stringify({ route: r.route, highlight: q })}`"
          >
            <q-item-section>
              <q-item-label>
                {{ r.title }}
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

import { useDialogsStore } from "@/features/dialogs/store"

const props = defineProps<{
  workspaceId: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const open = defineModel<boolean>({ required: true })

const global = ref(false)
const dialogsStore = useDialogsStore()
const q = ref("")
watchEffect(async () => {
  await search()
})

interface Result {
  workspaceId: string
  dialogId: string
  title: string
  route: number[]
  preview?: string
}
const results = ref<Result[]>(null)
const listRef = ref<QList>()

async function search () {
  if (!q.value) return

  // const hits = docs.value.filter(d => caselessIncludes(d.content, q.value)).slice(0, 100)
  unmark()
  const dialogs = await dialogsStore.searchDialogs(
    q.value,
    global.value ? null : props.workspaceId
  )
  console.log("---search dialogs: ", dialogs)
  // debugger
  results.value = (
    await dialogsStore.searchDialogs(q.value, props.workspaceId)
  ).map((d) => ({
    ...d,
    preview: d.text.match(
      new RegExp(`^.*${escapeRegex(q.value)}.*$`, "im")
    )?.[0],
  }))

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

// function getRoute (tree: Record<string, string[]>, target: string, curr = null) {
//   for (const [i, v] of tree[curr].entries()) {
//     if (v === target) return [i]

//     const route = getRoute(tree, target, v)

//     if (route) return [i, ...route]
//   }
// }

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>
