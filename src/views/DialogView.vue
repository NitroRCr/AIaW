<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    @contextmenu="createDialog"
  >
    <div>
      <assistant-item
        clickable
        :assistant
        v-if="dialog"
        text-base
        item-rd
        py-1
        min-h-0
      />
      <q-menu>
        <q-list>
          <assistant-item
            clickable
            v-for="a in assistants"
            :key="a.id"
            :assistant="a"
            @click="dialog.assistantId = a.id"
            v-close-popup
            py-1.5
            min-h-0
          />
        </q-list>
      </q-menu>
    </div>
    <div
      v-if="model"
      text-on-sur-var
      my-2
      of-hidden
      whitespace-nowrap
      text-ellipsis
      cursor-pointer
    >
      <q-icon
        name="sym_o_neurology"
        size="24px"
      />
      <code
        bg-sur-c-high
        px="6px"
        py="3px"
        text="xs"
      >{{ model.name }}</code>
      <q-menu important:max-w="300px">
        <q-list>
          <q-item>
            <q-item-section>
              <autocomplete-input
                :model-value="dialog.modelOverride?.name"
                @update:model-value="setModel"
                :options="providersStore.modelOptions"
                dense
                :label="$t('dialogView.model')"
              >
                <template #option="{ opt, selected, itemProps }">
                  <model-item
                    :model="opt"
                    :selected
                    v-bind="itemProps"
                  />
                </template>
              </autocomplete-input>
            </q-item-section>
          </q-item>
          <template v-if="assistant.model">
            <q-item-label
              header
              py-2
            >
              {{ $t('dialogView.assistantModel') }}
            </q-item-label>
            <model-item
              v-if="assistant.model"
              :model="assistant.model.name"
              @click="dialog.modelOverride = null"
              :selected="!dialog.modelOverride"
              clickable
              v-close-popup
            />
          </template>
          <template v-else-if="perfs.model">
            <q-item-label
              header
              py-2
            >
              {{ $t('dialogView.globalDefault') }}
            </q-item-label>
            <model-item
              v-if="perfs.model"
              :model="perfs.model.name"
              @click="dialog.modelOverride = null"
              :selected="!dialog.modelOverride"
              clickable
              v-close-popup
            />
          </template>
          <q-item-label
            header
            py-2
          >
            {{ $t('dialogView.commonModels') }}
          </q-item-label>
          <a-tip
            tip-key="configure-common-models"
            rd-0
          >
            {{ $t('dialogView.modelsConfigGuide1') }}
            <router-link
              to="/settings"
              pri-link
            >
              {{ $t('dialogView.settings') }}
            </router-link> {{ $t('dialogView.modelsConfigGuide2') }}
          </a-tip>
          <model-item
            v-for="m of perfs.commonModelOptions"
            :key="m"
            clickable
            :model="m"
            @click="setModel(m)"
            :selected="dialog.modelOverride?.name === m"
            v-close-popup
          />
        </q-list>
      </q-menu>
    </div>
    <q-space />
  </view-common-header>
  <q-page-container
    bg-sur-c-low
    v-if="dialog"
  >
    <q-page
      flex
      flex-col
      :style-fn="pageFhStyle"
    >
      <div
        grow
        bg-sur
        of-y-auto
        py-4
        ref="scrollContainer"
        pos-relative
        :class="{ 'rd-r-lg': rightDrawerAbove }"
        @scroll="onScroll"
      >
        <template
          v-for="(i, index) in chain"
          :key="i"
        >
          <message-item
            class="message-item"
            v-if="messageMap[i] && i !== '$root'"
            :model-value="dialog.msgRoute[index - 1] + 1"
            :message="messageMap[i]"
            :child-num="dialog.msgTree[chain[index - 1]].length"
            :scroll-container
            @update:model-value="switchChain(index - 1, $event - 1)"
            @edit="edit(index)"
            @regenerate="regenerate(index)"
            @delete="deleteBranch(index)"
            @quote="quote"
            @extract-artifact="extractArtifact(messageMap[i], ...$event)"
            @rendered="messageMap[i].generatingSession && lockBottom()"
            pt-2
            pb-4
          />
        </template>
      </div>
      <div
        bg-sur-c-low
        p-2
        pos-relative
      >
        <div
          v-if="inputMessageContent?.items?.length"
          pos-absolute
          z-3
          top-0
          left-0
          translate-y="-100%"
          flex
          items-end
          p-2
          gap-2
          of-x-auto
        >
          <message-image
            v-for="image in inputContentItems.filter(i => i.mimeType?.startsWith('image/'))"
            :key="image.id"
            :image
            removable
            h="100px"
            shrink-0
            @remove="removeItem(image)"
            shadow
          />
          <message-file
            v-for="file in inputContentItems.filter(i => !i.mimeType?.startsWith('image/'))"
            :key="file.id"
            :file
            removable
            @remove="removeItem(file)"
            shadow
          />
        </div>
        <div
          v-if="isPlatformEnabled(perfs.dialogScrollBtn)"
          pos-absolute
          top--1
          right-2
          flex="~ col"
          text-sec
          translate-y="-100%"
          z-1
        >
          <q-btn
            flat
            round
            dense
            icon="sym_o_first_page"
            rotate-90
            @click="scroll('top')"
          />
          <q-btn
            flat
            round
            dense
            icon="sym_o_keyboard_arrow_up"
            @click="scroll('up')"
          />
          <q-btn
            flat
            round
            dense
            icon="sym_o_keyboard_arrow_down"
            @click="scroll('down')"
          />
          <q-btn
            flat
            round
            dense
            icon="sym_o_last_page"
            rotate-90
            @click="scroll('bottom')"
          />
        </div>
        <div
          flex
          flex-wrap
          justify-end
          text-sec
          items-center
        >
          <q-btn
            v-if="model && mimeTypeMatch('image/webp', model.inputTypes.user)"
            flat
            icon="sym_o_image"
            :title="$t('dialogView.addImage')"
            round
            min-w="2.7em"
            min-h="2.7em"
            @click="imageInput.click()"
          >
            <input
              ref="imageInput"
              type="file"
              multiple
              accept="image/*"
              @change="onInputFiles"
              un-hidden
            >
          </q-btn>
          <q-btn
            flat
            icon="sym_o_folder"
            :title="$t('dialogView.addFile')"
            round
            min-w="2.7em"
            min-h="2.7em"
            @click="fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="*"
              @change="onInputFiles"
              un-hidden
            >
          </q-btn>
          <q-btn
            v-if="assistant?.promptVars.length"
            flat
            icon="sym_o_tune"
            :title="showVars ? $t('dialogView.hideVars') : $t('dialogView.showVars')"
            round
            min-w="2.7em"
            min-h="2.7em"
            @click="showVars = !showVars"
            :class="{ 'text-ter': showVars }"
          />
          <provider-options-btn
            v-if="sdkModel"
            :provider-name="sdkModel.provider"
            :model-id="sdkModel.modelId"
            v-model:provider-options="providerOptions"
            v-model:tools="providerTools"
            flat
            round
            min-w="2.7em"
            min-h="2.7em"
          />
          <add-info-btn
            v-if="assistant"
            :plugins="activePlugins"
            :assistant-plugins="assistant.plugins"
            @add="addInputItems"
            flat
            round
            min-w="2.7em"
            min-h="2.7em"
          />
          <q-btn
            v-if="assistant"
            flat
            :round="!activePlugins.length"
            :class="{ 'px-2': activePlugins.length }"
            min-w="2.7em"
            min-h="2.7em"
            icon="sym_o_extension"
            :title="$t('dialogView.plugins')"
          >
            <code
              v-if="activePlugins.length"
              bg-sur-c-high
              px="6px"
            >{{ activePlugins.length }}</code>
            <enable-plugins-menu :assistant-id="assistant.id" />
          </q-btn>
          <q-space />
          <div
            v-if="usage"
            my-2
            ml-2
          >
            <q-icon
              name="sym_o_generating_tokens"
              size="24px"
            />
            <code
              bg-sur-c-high
              px-2
              py-1
            >{{ usage.inputTokens }}+{{ usage.outputTokens }}</code>
            <q-tooltip>
              {{ $t('dialogView.messageTokens') }}<br>
              {{ $t('dialogView.tokenPrompt') }}：{{ usage.inputTokens }}，{{ $t('dialogView.tokenCompletion') }}：{{ usage.outputTokens }}
            </q-tooltip>
          </div>
          <abortable-btn
            icon="sym_o_send"
            :label="$t('dialogView.send')"
            @click="send"
            @abort="abortController?.abort()"
            :loading="generating"
            :disable="inputEmpty && !generating"
            ml-4
            min-h="40px"
          />
        </div>
        <div
          flex
          v-if="assistant"
          v-show="showVars"
        >
          <prompt-var-input
            class="mt-2 mr-2"
            v-for="promptVar of assistant.promptVars"
            :key="promptVar.id"
            :prompt-var="promptVar"
            v-model="dialog.inputVars[promptVar.name]"
            :input-props="{
              dense: true,
              outlined: true
            }"
            component="input"
          />
        </div>
        <a-input
          ref="messageInput"
          class="mt-2"
          max-h-50vh
          of-y-auto
          :model-value="inputText"
          @update:model-value="inputMessageContent && updateInputText($event ?? '')"
          outlined
          autogrow
          clearable
          :debounce="perfs.userInputDebounce"
          :placeholder="$t('dialogView.chatPlaceholder')"
          @keydown.enter="onEnter"
          @paste="onTextPaste"
        />
      </div>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { computed, inject, onUnmounted, provide, ref, Ref, toRaw, toRef, watch, nextTick } from 'vue'
import { db } from 'src/utils/db'
import { useLiveQueryWithDeps } from 'src/composables/live-query'
import { almostEqual, displayLength, genId, inputValueEmpty, isPlatformEnabled, isTextFile, JSONEqual, mimeTypeMatch, pageFhStyle, textBeginning, wrapCode, wrapQuote } from 'src/utils/functions'
import { useAssistantsStore } from 'src/stores/assistants'
import { streamText, generateText, tool, jsonSchema, StreamTextResult, GenerateTextResult, ModelMessage, stepCountIs } from 'ai'
import { copyToClipboard, throttle, useQuasar } from 'quasar'
import AssistantItem from 'src/components/AssistantItem.vue'
import { DialogContent, ExtractArtifactPrompt, ExtractArtifactResult, GenDialogTitle, NameArtifactPrompt, PluginsPrompt } from 'src/utils/templates'
import sessions from 'src/utils/sessions'
import PromptVarInput from 'src/components/PromptVarInput.vue'
import { MessageContent, PluginApi, ApiCallError, Plugin, Dialog, Message, Workspace, UserMessageContent, StoredItem, ModelSettings, ApiResultItem, Artifact, ConvertArtifactOptions, AssistantMessageContent } from 'src/utils/types'
import { usePluginsStore } from 'src/stores/plugins'
import MessageItem from 'src/components/MessageItem.vue'
import { scaleBlob } from 'src/utils/image-process'
import MessageImage from 'src/components/MessageImage.vue'
import { engine } from 'src/utils/template-engine'
import { useCallApi } from 'src/composables/call-api'
import { until } from '@vueuse/core'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import { syncRef } from 'src/composables/sync-ref'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import ModelItem from 'src/components/ModelItem.vue'
import ParseFilesDialog from 'src/components/ParseFilesDialog.vue'
import MessageFile from 'src/components/MessageFile.vue'
import { dialogOptions, InputTypes, models } from 'src/utils/values'
import { useUserDataStore } from 'src/stores/user-data'
import ErrorNotFound from 'src/pages/ErrorNotFound.vue'
import { useRoute, useRouter } from 'vue-router'
import AbortableBtn from 'src/components/AbortableBtn.vue'
import { MaxMessageFileSizeMB } from 'src/utils/config'
import ATip from 'src/components/ATip.vue'
import { useListenKey } from 'src/composables/listen-key'
import { useSetTitle } from 'src/composables/set-title'
import { useCreateArtifact } from 'src/composables/create-artifact'
import artifactsPlugin from 'src/utils/artifacts-plugin'
import providerOptionsBtn from 'src/components/ProviderOptionsBtn.vue'
import AddInfoBtn from 'src/components/AddInfoBtn.vue'
import { useI18n } from 'vue-i18n'
import Mark from 'mark.js'
import { useCreateDialog } from 'src/composables/create-dialog'
import EnablePluginsMenu from 'src/components/EnablePluginsMenu.vue'
import { useGetModel } from 'src/composables/get-model'
import { useUiStateStore } from 'src/stores/ui-state'
import AutocompleteInput from 'src/components/AutocompleteInput.vue'
import { useProvidersStore } from 'src/stores/providers'

const { t, locale } = useI18n()

const props = defineProps<{
  id: string
}>()

const rightDrawerAbove = inject('rightDrawerAbove')

const dialogs: Ref<Dialog[]> = inject('dialogs')
const liveData = useLiveQueryWithDeps(() => props.id, async () => {
  const [dialog, messages, items] = await Promise.all([
    db.dialogs.get(props.id),
    db.messages.where('dialogId').equals(props.id).toArray(),
    db.items.where('dialogId').equals(props.id).toArray()
  ])
  return { dialog, messages, items }
}, { initialValue: { dialog: null, messages: [], items: [] } as { dialog: Dialog, messages: Message[], items: StoredItem[] } })
const dialog = syncRef<Dialog>(
  () => liveData.value.dialog,
  val => { db.dialogs.put(toRaw(val)) },
  { valueDeep: true }
)
const assistantsStore = useAssistantsStore()
const workspace: Ref<Workspace> = inject('workspace')
const assistants = computed(() => assistantsStore.assistants.filter(
  a => [workspace.value.id, '$root'].includes(a.workspaceId)
))
const assistant = computed(() => {
  const val = assistantsStore.assistants.find(a => a.id === dialog.value?.assistantId)
  return val && { ...val } // force trigger updates
})
provide('dialog', dialog)

const chain = computed<string[]>(() => liveData.value.dialog ? getChain(liveData.value.dialog.msgTree, '$root', getBranchState())[0] : [])
const historyChain = ref<string[]>([])
function clampIndex(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
function switchChain(index, value) {
  const branchState = { ...getBranchState(), [chain.value[index]]: value }
  updateChain(branchState)
}
function getBranchState(route = dialog.value?.msgRoute || []) {
  if (!liveData.value.dialog) return {}
  if (dialog.value?.msgBranchState) return { ...dialog.value.msgBranchState }
  return mergeRouteIntoBranchState(liveData.value.dialog.msgTree, route, {})
}
function mergeRouteIntoBranchState(tree: Record<string, string[]>, route: number[], baseState: Record<string, number>) {
  const branchState = { ...baseState }
  let node = '$root'
  for (const rawIndex of route) {
    const children = tree[node]
    if (!children?.length) break
    const index = clampIndex(rawIndex ?? 0, 0, children.length - 1)
    branchState[node] = index
    node = children[index]
  }
  return branchState
}
function updateChain(routeOrBranchState: number[] | Record<string, number>) {
  const branchState = Array.isArray(routeOrBranchState)
    ? mergeRouteIntoBranchState(liveData.value.dialog.msgTree, routeOrBranchState, getBranchState())
    : routeOrBranchState
  const res = getChain(liveData.value.dialog.msgTree, '$root', branchState)
  historyChain.value = res[0]
  db.dialogs.update(dialog.value.id, { msgRoute: res[1], msgBranchState: branchState })
}
watch([() => liveData.value.messages.length, () => liveData.value.dialog?.id], () => {
  liveData.value.dialog && updateChain(liveData.value.dialog.msgRoute)
})
function getChain(tree: Record<string, string[]>, node: string, branchState: Record<string, number>) {
  const children = tree[node]
  if (!children?.length) return [[node], []]
  const index = clampIndex(branchState[node] ?? 0, 0, children.length - 1)
  const [restChain, restRoute] = getChain(tree, children[index], branchState)
  return [[node, ...restChain], [index, ...restRoute]]
}

const messageInput = ref()
function focusInput() {
  isPlatformEnabled(perfs.autoFocusDialogInput) && messageInput.value?.focus()
}
async function edit(index) {
  const target = chain.value[index - 1]
  const { type, contents } = messageMap.value[chain.value[index]]
  await db.transaction('rw', db.dialogs, db.messages, db.items, async () => {
    await appendMessage(target, {
      type,
      contents,
      status: 'inputing'
    }, false, true)
    const content = contents[0] as UserMessageContent
    await saveItems(content.items.map(id => itemMap.value[id]))
  })
  await nextTick()
  focusInput()
}
async function regenerate(index) {
  if (!assistant.value) {
    $q.notify({ message: t('dialogView.errors.setAssistant'), color: 'negative' })
    return
  }
  if (!sdkModel.value) {
    $q.notify({ message: t('dialogView.errors.configModel'), color: 'negative' })
    return
  }
  const target = chain.value[index - 1]
  await stream(target, false)
}
async function deleteBranch(index) {
  const parent = chain.value[index - 1]
  const anchor = chain.value[index]
  const branch = dialog.value.msgRoute[index - 1]
  branch === dialog.value.msgTree[parent].length - 1 && switchChain(index - 1, branch - 1)
  const ids = expandMessageTree(anchor)
  const itemIds = ids.flatMap(id => messageMap.value[id].contents).flatMap(c => {
    if (c.type === 'user-message') return c.items
    else if (c.type === 'assistant-tool') return c.result || []
    else return []
  })
  await db.transaction('rw', db.dialogs, db.messages, db.items, () => {
    db.messages.bulkDelete(ids)
    itemIds.forEach(id => {
      let { references } = itemMap.value[id]
      references--
      references === 0 ? db.items.delete(id) : db.items.update(id, { references })
    })
    const msgTree = { ...toRaw(dialog.value.msgTree) }
    msgTree[parent] = msgTree[parent].filter(id => id !== anchor)
    ids.forEach(id => {
      delete msgTree[id]
    })
    db.dialogs.update(props.id, { msgTree })
  })
}

async function appendMessage(target, info: Partial<Message>, insert = false, selectBranch = false) {
  const id = genId()
  await db.transaction('rw', db.dialogs, db.messages, async () => {
    await db.messages.add({
      id,
      dialogId: dialog.value.id,
      workspaceId: dialog.value.workspaceId,
      ...info
    } as Message)
    const d = await db.dialogs.get(props.id)
    const children = d.msgTree[target]
    const changes = insert ? {
      [target]: [id],
      [id]: children
    } : {
      [target]: [...children, id],
      [id]: []
    }
    const msgTree = { ...d.msgTree, ...changes }
    const dialogChanges: Partial<Dialog> = { msgTree }
    if (selectBranch) {
      const branchState = d.msgBranchState
        ? { ...d.msgBranchState }
        : mergeRouteIntoBranchState(d.msgTree, d.msgRoute, {})
      branchState[target] = insert ? 0 : children.length
      dialogChanges.msgBranchState = branchState
      dialogChanges.msgRoute = getChain(msgTree, '$root', branchState)[1]
    }
    await db.dialogs.update(props.id, dialogChanges)
  })
  return id
}
function expandMessageTree(root): string[] {
  return [root, ...dialog.value.msgTree[root].flatMap(id => expandMessageTree(id))]
}

const inputMessageContent = computed(() => messageMap.value[chain.value.at(-1)]?.contents[0] as UserMessageContent)
const inputContentItems = computed(() => inputMessageContent.value.items.map(id => itemMap.value[id]).filter(x => x))
const messageMap = computed<Record<string, Message>>(() => {
  const map = {}
  liveData.value.messages.forEach(m => { map[m.id] = m })
  return map
})
const itemMap = computed<Record<string, StoredItem>>(() => {
  const map = {}
  liveData.value.items.forEach(i => { map[i.id] = i })
  return map
})
provide('messageMap', messageMap)
provide('itemMap', itemMap)
const generating = computed(() => !!messageMap.value[chain.value.at(-2)]?.generatingSession)
const inputEmpty = computed(() => !inputMessageContent.value?.text && !inputMessageContent.value?.items?.length)

const inputText = ref('')
const pendingTexts = []
let pendingTimeout = null
async function updateInputText(text) {
  inputText.value = text
  pendingTexts.push(text)
  clearTimeout(pendingTimeout)
  pendingTimeout = window.setTimeout(() => {
    pendingTexts.splice(0)
  }, 200)
  await db.messages.update(chain.value.at(-1), {
    // use shallow keyPath to avoid dexie's sync bug
    contents: [{
      ...inputMessageContent.value,
      text
    }]
  })
}
watch(() => inputMessageContent.value?.text, val => {
  const index = pendingTexts.indexOf(val)
  if (index !== -1) {
    pendingTexts.splice(0, index + 1)
  } else {
    inputText.value = val
  }
})

function onTextPaste(ev: ClipboardEvent) {
  if (!perfs.codePasteOptimize) return
  const { clipboardData } = ev
  const i = clipboardData.types.findIndex(t => t === 'vscode-editor-data')
  if (i !== -1) {
    const code = clipboardData.getData('text/plain')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    if (!/\n/.test(code)) return
    const data = clipboardData.getData('vscode-editor-data')
    const lang = JSON.parse(data).mode ?? ''
    if (lang === 'markdown') return
    const wrappedCode = wrapCode(code, lang)
    document.execCommand('insertText', false, wrappedCode)
    ev.preventDefault()
  }
}

const imageInput = ref()
const fileInput = ref()
function onInputFiles({ target }) {
  const files = target.files
  parseFiles(Array.from(files))
  target.value = ''
}
function onPaste(ev: ClipboardEvent) {
  const { clipboardData } = ev
  if (clipboardData.types.includes('text/plain')) {
    if (
      !['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName) &&
      !['true', 'plaintext-only'].includes((document.activeElement as HTMLElement).contentEditable)
    ) {
      const text = clipboardData.getData('text/plain')
      addInputItems([{
        type: 'text',
        name: t('dialogView.pastedText', { text: textBeginning(text, 12) }),
        contentText: text
      }])
    }
    return
  }
  parseFiles(Array.from(clipboardData.files) as File[])
}
addEventListener('paste', onPaste)
onUnmounted(() => removeEventListener('paste', onPaste))
async function removeItem({ id, references }: StoredItem) {
  const items = [...inputMessageContent.value.items]
  items.splice(items.indexOf(id), 1)
  await db.transaction('rw', db.messages, db.items, () => {
    db.messages.update(chain.value.at(-1), {
      contents: [{
        ...inputMessageContent.value,
        items
      }]
    })
    references--
    references === 0 ? db.items.delete(id) : db.items.update(id, { references })
  })
}
async function parseFiles(files: File[]) {
  if (!files.length) return
  const textFiles = []
  const supportedFiles = []
  const otherFiles = []
  for (const file of files) {
    if (await isTextFile(file)) textFiles.push(file)
    else if (mimeTypeMatch(file.type, model.value.inputTypes.user)) supportedFiles.push(file)
    else otherFiles.push(file)
  }

  const parsedFiles: ApiResultItem[] = []
  for (const file of textFiles) {
    parsedFiles.push({
      type: 'text',
      name: file.name,
      contentText: await file.text()
    })
  }
  for (const file of supportedFiles) {
    if (file.size > MaxMessageFileSizeMB * 1024 * 1024) {
      $q.notify({ message: t('dialogView.fileTooLarge', { maxSize: MaxMessageFileSizeMB }), color: 'negative' })
      continue
    }
    const f = file.type.startsWith('image/') && file.size > 512 * 1024 ? await scaleBlob(file, 2048 * 2048) : file
    parsedFiles.push({
      type: 'file',
      name: file.name,
      mimeType: file.type,
      contentBuffer: await f.arrayBuffer()
    })
  }
  addInputItems(parsedFiles)

  otherFiles.length && $q.dialog({
    component: ParseFilesDialog,
    componentProps: { files: otherFiles, plugins: assistant.value.plugins }
  }).onOk((files: ApiResultItem[]) => {
    addInputItems(files)
  })
}
function quote(item: ApiResultItem) {
  if (displayLength(item.contentText) > 200) {
    addInputItems([item])
  } else {
    const { text } = inputMessageContent.value
    const content = wrapQuote(item.contentText) + '\n\n'
    updateInputText(text ? text + '\n' + content : content)
    focusInput()
  }
}
async function addInputItems(items: ApiResultItem[]) {
  const storedItems = items.map(i => ({ ...i, id: genId(), dialogId: props.id, references: 0 }))
  const ids = storedItems.map(i => i.id)
  await db.transaction('rw', db.messages, db.items, () => {
    db.messages.update(chain.value.at(-1), {
      // use shallow keyPath to avoid dexie's sync bug
      contents: [{
        ...inputMessageContent.value,
        items: [...inputMessageContent.value.items, ...ids]
      }]
    })
    saveItems(storedItems)
  })
}

async function saveItems(items: StoredItem[]) {
  items.forEach(i => {
    i.references++
  })
  await db.items.bulkPut(items)
}

function getChainMessages() {
  const val: ModelMessage[] = []
  historyChain.value
    .slice(1)
    .slice(-assistant.value.contextNum || 0)
    .filter(id => messageMap.value[id].status !== 'inputing')
    .map(id => messageMap.value[id].contents)
    .flat()
    .forEach(content => {
      if (content.type === 'user-message') {
        val.push({
          role: 'user',
          content: [
            { type: 'text', text: content.text },
            ...content.items.map(id => itemMap.value[id]).map(i => {
              if (i.contentText != null) {
                if (i.type === 'file') {
                  return { type: 'text' as const, text: `<file_content filename="${i.name}">\n${i.contentText}\n</file_content>` }
                } else if (i.type === 'quote') {
                  return { type: 'text' as const, text: `<quote name="${i.name}">${i.contentText}</quote>` }
                } else {
                  return { type: 'text' as const, text: i.contentText }
                }
              } else {
                if (!mimeTypeMatch(i.mimeType, model.value.inputTypes.user)) {
                  return null
                } else if (i.mimeType.startsWith('image/')) {
                  return { type: 'image' as const, image: i.contentBuffer, mediaType: i.mimeType }
                } else {
                  return { type: 'file' as const, mediaType: i.mimeType, data: i.contentBuffer }
                }
              }
            }).filter(x => x)
          ]
        })
      } else if (content.type === 'assistant-message') {
        val.push({
          role: 'assistant',
          content: [
            { type: 'text', text: content.text },
            ...content.reasoning ? [{ type: 'reasoning' as const, text: content.reasoning }] : []
          ]
        })
      } else if (content.type === 'assistant-tool') {
        if (content.status !== 'completed') return
        const { name, args, result, pluginId } = content
        const id = genId()
        val.push({
          role: 'assistant',
          content: [{
            type: 'tool-call',
            toolName: `${pluginId}-${name}`,
            toolCallId: id,
            input: args
          }]
        })
        val.push({
          role: 'tool',
          content: [{
            type: 'tool-result',
            toolName: `${pluginId}-${name}`,
            toolCallId: id,
            output: toToolResultContent(result.map(id => itemMap.value[id]))
          }]
        })
      }
    })
  return val
}

function getSystemPrompt(enabledPlugins) {
  try {
    const prompt = engine.parseAndRenderSync(assistant.value.promptTemplate, {
      ...getCommonVars(),
      ...workspace.value.vars,
      ...dialog.value.inputVars,
      _pluginsPrompt: enabledPlugins.length
        ? engine.parseAndRenderSync(PluginsPrompt, { plugins: enabledPlugins })
        : '',
      _rolePrompt: assistant.value.prompt
    })
    return prompt.trim() ? prompt : undefined
  } catch (e) {
    console.error(e)
    $q.notify({ message: t('dialogView.promptParseFailed'), color: 'negative' })
    throw e
  }
}

function getCommonVars() {
  return {
    _currentTime: new Date().toString(),
    _userLanguage: navigator.language,
    _workspaceId: workspace.value.id,
    _workspaceName: workspace.value.name,
    _assistantId: assistant.value.id,
    _assistantName: assistant.value.name,
    _dialogId: dialog.value.id,
    _modelId: model.value.name,
    _isDarkMode: $q.dark.isActive,
    _platform: $q.platform
  }
}

const pluginsStore = usePluginsStore()

const { callApi } = useCallApi({ workspace, dialog })

const providerOptions = ref({})
const providerTools = ref({})
const { getModel, getSdkModel } = useGetModel()
const model = computed(() => getModel(dialog.value?.modelOverride || assistant.value?.model))
const sdkModel = computed(() => getSdkModel(assistant.value?.provider, model.value))
const $q = useQuasar()
const { data } = useUserDataStore()
async function send() {
  if (inputEmpty.value) return
  if (!assistant.value) {
    $q.notify({ message: t('dialogView.errors.setAssistant'), color: 'negative' })
    return
  }
  if (!sdkModel.value) {
    $q.notify({ message: t('dialogView.errors.configModel'), color: 'negative' })
    return
  }
  if (!data.noobAlertDismissed && chain.value.length > 10 && dialogs.value.length < 3) {
    $q.dialog({
      title: t('dialogView.noobAlert.title'),
      message: t('dialogView.noobAlert.message'),
      persistent: true,
      ok: t('dialogView.noobAlert.okBtn'),
      cancel: t('dialogView.noobAlert.cancelBtn'),
      ...dialogOptions
    }).onCancel(() => {
      data.noobAlertDismissed = true
      send()
    })
    return
  }
  showVars.value = false
  const target = chain.value.at(-1)
  await db.messages.update(target, { status: 'default' })
  until(chain).changed().then(() => {
    nextTick().then(() => {
      scroll('bottom')
    })
  })
  await stream(target, false)
  perfs.autoGenTitle && chain.value.length === 4 && genTitle()
}

const artifacts = inject<Ref<Artifact[]>>('artifacts')
const abortController = ref<AbortController>()
async function stream(target, insert = false) {
  const settings: Partial<ModelSettings> = {}
  for (const key in assistant.value.modelSettings) {
    const val = assistant.value.modelSettings[key]
    if (!inputValueEmpty(val)) {
      settings[key] = val
    }
  }
  const messageContent: AssistantMessageContent = {
    type: 'assistant-message',
    text: ''
  }
  const contents: MessageContent[] = [messageContent]
  let id
  await db.transaction('rw', db.dialogs, db.messages, async () => {
    id = await appendMessage(target, {
      type: 'assistant',
      assistantId: assistant.value.id,
      contents,
      status: 'pending',
      generatingSession: sessions.id,
      modelName: model.value.name
    }, insert, true)
    !insert && await appendMessage(id, {
      type: 'user',
      contents: [{
        type: 'user-message',
        text: '',
        items: []
      }],
      status: 'inputing'
    })
  })

  const update = throttle(() => db.messages.update(id, { contents }), 50)
  async function callTool(plugin: Plugin, api: PluginApi, args) {
    const content: MessageContent = {
      type: 'assistant-tool',
      pluginId: plugin.id,
      name: api.name,
      args,
      status: 'calling'
    }
    contents.push(content)
    update()
    const { result: apiResult, error } = await callApi(plugin, api, args)
    const result: StoredItem[] = apiResult.map(r => ({ ...r, id: genId(), dialogId: props.id, references: 0 }))
    saveItems(result)
    if (error) {
      content.status = 'failed'
      content.error = error
    } else {
      content.status = 'completed'
      content.result = result.map(i => i.id)
    }
    update()
    return { result, error }
  }
  const { plugins } = assistant.value
  const tools = {}
  const enabledPlugins = []
  let noRoundtrip = true
  await Promise.all(activePlugins.value.map(async p => {
    noRoundtrip &&= p.noRoundtrip
    const plugin = plugins[p.id]
    const pluginVars = {
      ...getCommonVars(),
      ...plugin.vars
    }
    plugin.tools.forEach(api => {
      if (!api.enabled) return
      const a = p.apis.find(a => a.name === api.name)
      const { name, prompt } = a
      tools[`${p.id}-${name}`] = tool({
        description: engine.parseAndRenderSync(prompt, pluginVars),
        inputSchema: jsonSchema(a.parameters),
        async execute(args) {
          const { result, error } = await callTool(p, a, args)
          if (error) throw new ApiCallError(error)
          return result
        },
        toModelOutput: toToolResultContent
      })
    })
    const pluginInfos = {}
    await Promise.all(plugin.infos.map(async api => {
      if (!api.enabled) return
      const a = p.apis.find(a => a.name === api.name)
      if (a.infoType !== 'prompt-var') return
      try {
        pluginInfos[a.name] = await callApi(p, a, api.args)
      } catch (e) {
        $q.notify({ message: t('dialogView.callPluginInfoFailed', { message: e.message }), color: 'negative' })
      }
    }))

    try {
      enabledPlugins.push({
        id: p.id,
        prompt: p.prompt && engine.parseAndRenderSync(p.prompt, { ...pluginVars, infos: pluginInfos })
      })
    } catch (e) {
      $q.notify({ message: t('dialogView.pluginPromptParseFailed', { title: p.title }), color: 'negative' })
    }
  }))
  if (isPlatformEnabled(perfs.artifactsEnabled) && artifacts.value.some(a => a.open)) {
    const { plugin, getPrompt, api } = artifactsPlugin
    enabledPlugins.push({
      id: plugin.id,
      prompt: getPrompt(artifacts.value.filter(a => a.open)),
      actions: []
    })
    tools[`${plugin.id}-${api.name}`] = tool({
      description: api.prompt,
      inputSchema: jsonSchema(api.parameters),
      async execute(args) {
        const { result, error } = await callTool(plugin, api, args)
        if (error) throw new ApiCallError(error)
        return result
      },
      toModelOutput: toToolResultContent
    })
  }
  try {
    if (noRoundtrip) settings.maxSteps = 1
    abortController.value = new AbortController()
    const messages = getChainMessages()
    const prompt = getSystemPrompt(enabledPlugins.filter(p => p.prompt))
    prompt && messages.unshift({ role: assistant.value.promptRole, content: prompt })
    const params = {
      model: sdkModel.value,
      messages,
      tools: {
        ...providerTools.value,
        ...tools
      },
      providerOptions: providerOptions.value,
      ...settings,
      stopWhen: stepCountIs(settings.maxSteps),
      abortSignal: abortController.value.signal
    }
    let result: StreamTextResult<any, any> | GenerateTextResult<any, any>
    if (assistant.value.stream) {
      result = streamText(params)
      await db.messages.update(id, { status: 'streaming' })
      lockingBottom.value = perfs.streamingLockBottom
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          messageContent.text += part.text
          update()
        } else if (part.type === 'reasoning-delta') {
          messageContent.reasoning = (messageContent.reasoning ?? '') + part.text
          update()
        } else if (part.type === 'error') {
          throw part.error
        }
      }
    } else {
      result = await generateText(params)
      messageContent.text = await result.text
      messageContent.reasoning = await result.reasoningText
    }

    const usage = await result.usage
    const warnings = (await result.warnings).map(w => (w.type === 'unsupported-setting' || w.type === 'unsupported-tool') ? w.details : w.message)
    await db.messages.update(id, { contents, status: 'default', generatingSession: null, warnings, usage })
  } catch (e) {
    console.error(e)
    if (e.data?.error?.type === 'budget_exceeded') {
      $q.notify({
        message: t('dialogView.errors.insufficientQuota'),
        color: 'err-c',
        textColor: 'on-err-c',
        actions: [{ label: t('dialogView.recharge'), color: 'on-sur', handler() { router.push('/account') } }]
      })
    }
    await db.messages.update(id, { contents, error: e.message || e.toString(), status: 'failed', generatingSession: null })
  }
  perfs.artifactsAutoExtract && autoExtractArtifact()
  lockingBottom.value = false
}
function toToolResultContent(items: StoredItem[]) {
  const val = []
  for (const item of items) {
    if (item.type === 'text') {
      val.push({ type: 'text', text: item.contentText })
    } else if (mimeTypeMatch(item.mimeType, model.value.inputTypes.tool)) {
      val.push({ type: item.mimeType.startsWith('image/') ? 'image' : 'file', mimeType: item.mimeType, data: item.contentBuffer })
    }
  }
  return {
    type: 'content' as const,
    value: val
  }
}
const lockingBottom = ref(false)
let lastScrollTop
function scrollListener() {
  const container = scrollContainer.value
  if (container.scrollTop < lastScrollTop) {
    lockingBottom.value = false
  }
  lastScrollTop = container.scrollTop
}
function lockBottom() {
  lockingBottom.value && scroll('bottom', 'auto')
}
watch(lockingBottom, val => {
  if (val) {
    lastScrollTop = scrollContainer.value.scrollTop
    scrollContainer.value.addEventListener('scroll', scrollListener)
  } else {
    lastScrollTop = null
    scrollContainer.value.removeEventListener('scroll', scrollListener)
  }
})
const activePlugins = computed<Plugin[]>(() => pluginsStore.plugins.filter(p => p.available && assistant.value.plugins[p.id]?.enabled))
const usage = computed(() => messageMap.value[chain.value.at(-2)]?.usage)

const systemSdkModel = computed(() => getSdkModel(perfs.systemProvider, perfs.systemModel))
function getDialogContents() {
  return chain.value.slice(1, -1).map(id => messageMap.value[id].contents).flat()
}
async function genTitle() {
  try {
    const dialogId = props.id
    const { text } = await generateText({
      model: systemSdkModel.value,
      prompt: await engine.parseAndRender(GenDialogTitle, {
        contents: getDialogContents(),
        lang: locale.value
      })
    })
    await db.dialogs.update(dialogId, { name: text })
  } catch (e) {
    console.error(e)
    $q.notify({ message: t('dialogView.summarizeFailed'), color: 'negative' })
  }
}
async function copyContent() {
  await copyToClipboard(await engine.parseAndRender(DialogContent, {
    contents: getDialogContents(),
    title: dialog.value.name
  }))
}
const route = useRoute()
const router = useRouter()
watch(route, to => {
  db.workspaces.update(workspace.value.id, { lastDialogId: props.id } as Partial<Workspace>)

  until(dialog).toMatch(val => val?.id === props.id).then(async () => {
    focusInput()
    if (to.hash === '#genTitle') {
      genTitle()
      router.replace({ hash: '' })
    } else if (to.hash === '#copyContent') {
      copyContent()
      router.replace({ hash: '' })
    }
    if (to.query.goto) {
      const { route, highlight } = JSON.parse(to.query.goto as string)
      if (!JSONEqual(route, dialog.value.msgRoute.slice(0, route.length))) {
        updateChain(route)
        await until(chain).changed()
      }
      await nextTick()
      const { items } = getEls()
      if (route.length) {
        const item = items[route.length - 1]
        if (highlight) {
          const mark = new Mark(item)
          mark.unmark()
          mark.mark(highlight)
        }
        item.querySelector('mark[data-markjs]')?.scrollIntoView()
      }
      router.replace({ query: {} })
    }
  })
}, { immediate: true })

function onEnter(ev) {
  if (perfs.sendKey === 'ctrl+enter') {
    ev.ctrlKey && send()
  } else if (perfs.sendKey === 'shift+enter') {
    ev.shiftKey && send()
  } else if (perfs.sendKey === 'meta+enter') {
    ev.metaKey && send()
  } else {
    if (ev.ctrlKey) {
      document.execCommand('insertText', false, '\n')
    } else if (!ev.shiftKey) {
      ev.preventDefault()
      send()
    }
  }
}

const showVars = ref(true)

const scrollContainer = ref<HTMLElement>()
function getEls() {
  const container = scrollContainer.value
  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  return { container, items }
}
function itemInView(item: HTMLElement, container: HTMLElement) {
  return item.offsetTop <= container.scrollTop + container.clientHeight &&
  item.offsetTop + item.clientHeight > container.scrollTop
}
function switchTo(target: 'prev' | 'next' | 'first' | 'last') {
  const { container, items } = getEls()
  const index = items.findIndex((item, i) =>
    itemInView(item, container) &&
    dialog.value.msgTree[chain.value[i]].length > 1
  )
  if (index === -1) return

  const id = chain.value[index]
  let to
  const curr = dialog.value.msgRoute[index]
  const num = dialog.value.msgTree[id].length
  if (target === 'first') {
    to = 0
  } else if (target === 'last') {
    to = num - 1
  } else if (target === 'prev') {
    to = curr - 1
  } else if (target === 'next') {
    to = curr + 1
  }
  if (to < 0 || to >= num || to === curr) return
  switchChain(index, to)
}
function scroll(action: 'up' | 'down' | 'top' | 'bottom', behavior: 'smooth' | 'auto' = 'smooth') {
  const { container, items } = getEls()
  if (action === 'top') {
    container.scrollTo({ top: 0, behavior })
    return
  } else if (action === 'bottom') {
    container.scrollTo({ top: container.scrollHeight, behavior })
    return
  }

  // Get current position
  const index = items.findIndex(item => itemInView(item, container))
  const itemTypes = items.map(i => i.clientHeight > container.clientHeight ? 'partial' : 'entire')
  let position: 'start' | 'inner' | 'end' | 'out'
  const item = items[index]
  const type = itemTypes[index]
  if (type === 'partial') {
    if (almostEqual(container.scrollTop, item.offsetTop, 5)) {
      position = 'start'
    } else if (almostEqual(container.scrollTop + container.clientHeight, item.offsetTop + item.clientHeight, 5)) {
      position = 'end'
    } else if (container.scrollTop + container.clientHeight < item.offsetTop + item.clientHeight) {
      position = 'inner'
    } else {
      position = 'out'
    }
  } else {
    if (almostEqual(container.scrollTop, item.offsetTop, 5)) {
      position = 'start'
    } else {
      position = 'out'
    }
  }

  // Scroll
  let top
  if (type === 'entire') {
    if (action === 'up') {
      if (position === 'start') {
        if (index === 0) return
        top = itemTypes[index - 1] === 'entire'
          ? items[index - 1].offsetTop
          : items[index - 1].offsetTop + items[index - 1].clientHeight - container.clientHeight
      } else {
        top = item.offsetTop
      }
    } else {
      if (index === items.length - 1) return
      top = items[index + 1].offsetTop
    }
  } else {
    if (action === 'up') {
      if (position === 'start') {
        if (index === 0) return
        top = itemTypes[index - 1] === 'entire'
          ? items[index - 1].offsetTop
          : items[index - 1].offsetTop + items[index - 1].clientHeight - container.clientHeight
      } else if (position === 'out') {
        top = item.offsetTop + item.clientHeight - container.clientHeight
      } else {
        top = item.offsetTop
      }
    } else {
      if (position === 'end' || position === 'out') {
        if (index === items.length - 1) return
        top = items[index + 1].offsetTop
      } else {
        top = item.offsetTop + item.clientHeight - container.clientHeight
      }
    }
  }
  container.scrollTo({ top: top + 2, behavior: 'smooth' })
}
function regenerateCurr() {
  const { container, items } = getEls()
  const index = items.findIndex(
    (item, i) => itemInView(item, container) && messageMap.value[chain.value[i + 1]].type === 'assistant'
  )
  if (index === -1) return
  regenerate(index + 1)
}
function editCurr() {
  const { container, items } = getEls()
  const index = items.findIndex(
    (item, i) => itemInView(item, container) && messageMap.value[chain.value[i + 1]].type === 'user'
  )
  if (index === -1) return
  edit(index + 1)
}
const { perfs } = useUserPerfsStore()
if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, 'scrollUpKeyV2'), () => scroll('up'))
  useListenKey(toRef(perfs, 'scrollDownKeyV2'), () => scroll('down'))
  useListenKey(toRef(perfs, 'scrollTopKey'), () => scroll('top'))
  useListenKey(toRef(perfs, 'scrollBottomKey'), () => scroll('bottom'))
  useListenKey(toRef(perfs, 'switchPrevKeyV2'), () => switchTo('prev'))
  useListenKey(toRef(perfs, 'switchNextKeyV2'), () => switchTo('next'))
  useListenKey(toRef(perfs, 'switchFirstKey'), () => switchTo('first'))
  useListenKey(toRef(perfs, 'switchLastKey'), () => switchTo('last'))
  useListenKey(toRef(perfs, 'regenerateCurrKey'), () => regenerateCurr())
  useListenKey(toRef(perfs, 'editCurrKey'), () => editCurr())
  useListenKey(toRef(perfs, 'focusDialogInputKey'), () => focusInput())
}

async function genArtifactName(content: string, lang?: string) {
  const { text } = await generateText({
    model: systemSdkModel.value,
    prompt: engine.parseAndRenderSync(NameArtifactPrompt, { content, lang })
  })
  return text
}
const { createArtifact } = useCreateArtifact(workspace)
async function extractArtifact(message: Message, text: string, pattern, options: ConvertArtifactOptions) {
  const name = options.name || await genArtifactName(text, options.lang)
  const id = await createArtifact({
    name,
    language: options.lang,
    versions: [{
      date: new Date(),
      text
    }],
    tmp: text
  })
  if (options.reserveOriginal) return
  const to = `> ${t('dialogView.convertedToArtifact')}: <router-link to="?openArtifact=${id}">${name}</router-link>\n`
  const index = message.contents.findIndex(c => ['assistant-message', 'user-message'].includes(c.type))
  const content = message.contents[index] as UserMessageContent | AssistantMessageContent
  await db.messages.update(message.id, {
    [`contents.${index}.text`]: content.text.replace(pattern, to) as any
  })
}
async function autoExtractArtifact() {
  const message = messageMap.value[chain.value.at(-2)]
  const { text } = await generateText({
    model: systemSdkModel.value,
    prompt: engine.parseAndRenderSync(ExtractArtifactPrompt, {
      contents: chain.value.slice(-3, -1).map(id => messageMap.value[id].contents).flat()
    })
  })
  const object: ExtractArtifactResult = JSON.parse(text)
  if (!object.found) return
  const reg = new RegExp(`(\`{3,}.*\\n)?(${object.regex})(\\s*\`{3,})?`)
  const content = message.contents.find(c => c.type === 'assistant-message')
  const match = content.text.match(reg)
  if (!match) return
  await extractArtifact(message, match[2], reg, {
    name: object.name,
    lang: object.language,
    reserveOriginal: perfs.artifactsReserveOriginal
  })
}

const uiStateStore = useUiStateStore()
const scrollTops = uiStateStore.dialogScrollTops
function onScroll(ev) {
  scrollTops[props.id] = ev.target.scrollTop
}
watch(() => liveData.value.dialog?.id, id => {
  if (!id) return
  nextTick(() => {
    scrollContainer.value?.scrollTo({ top: scrollTops[id] ?? 0 })
  })
})

const providersStore = useProvidersStore()
function setModel(name: string) {
  dialog.value.modelOverride = name
    ? models.find(model => model.name === name) || { name, inputTypes: InputTypes.default }
    : null
}

const { createDialog } = useCreateDialog(workspace)

defineEmits(['toggle-drawer'])

useSetTitle(computed(() => dialog.value?.name))
</script>
