<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <model-override-menu
      :model="model"
      :assistant="assistant"
      :dialog="dialog"
    />
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
        @scroll="saveDialogScrollPosition"
      >
        <template
          v-for="(item) in dialogItems"
          :key="item.message.id"
        >
          <message-item
            class="message-item"
            :key="item.message.id"
            v-if="item.message"
            :model-value="item.index + 1"
            :message="item.message"
            :child-num="item.siblingMessageIds.length"
            :scroll-container
            @update:model-value="switchBranch(item, $event)"
            @edit="edit(item.message)"
            @regenerate="regenerate(item.message.parentId)"
            @delete="deleteBranch(item.message.id)"
            @quote="quote"
            @extract-artifact="extractArtifact(item.message, ...$event)"
            @rendered="item.message.generatingSession && lockBottom()"
            @create-cyberlink="sendCyberlinkPrompt"
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
          v-if="inputMessageContent?.storedItems.length"
          pos-absolute
          z-3
          top-0
          left-0
          translate-y="-100%"
          flex
          items-end
          p-2
          gap-2
        >
          <message-image
            v-for="image in inputContentItems.filter((i) =>
              i.mimeType?.startsWith('image/')
            )"
            :key="image.id"
            :image="image"
            removable
            h="100px"
            @remove="deleteStoredItemWithFile(inputMessageId, image)"
            shadow
          />
          <message-file
            v-for="file in inputContentItems.filter(
              (i) => !i.mimeType?.startsWith('image/')
            )"
            :key="file.id"
            :file="file"
            removable
            @remove="deleteStoredItemWithFile(inputMessageId, file)"
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
            v-if="assistant?.promptVars?.length"
            flat
            icon="sym_o_tune"
            :title="
              showVars ? $t('dialogView.hideVars') : $t('dialogView.showVars')
            "
            round
            min-w="2.7em"
            min-h="2.7em"
            @click="showVars = !showVars"
            :class="{ 'text-ter': showVars }"
          />
          <model-options-btn
            v-if="sdkModel"
            :provider-name="sdkModel.provider"
            :model-id="sdkModel.modelId"
            v-model="modelOptions"
            flat
            round
            min-w="2.7em"
            min-h="2.7em"
          />
          <add-info-btn
            :plugins="activePlugins"
            :assistant-plugins="assistant?.plugins || {}"
            :dialog-id="dialogId"
            :workspace-id="workspaceId"
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
            >{{
              activePlugins.length
            }}</code>
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
            >{{ usage.promptTokens }}+{{ usage.completionTokens }}</code>
            <q-tooltip>
              {{ $t("dialogView.messageTokens") }}<br>
              {{ $t("dialogView.tokenPrompt") }}：{{ usage.promptTokens }}，{{
                $t("dialogView.tokenCompletion")
              }}：{{ usage.completionTokens }}
            </q-tooltip>
          </div>
          <abortable-btn
            icon="sym_o_send"
            :label="$t('dialogView.send')"
            @click="sendUserMessageAndGenerateResponse"
            @abort="abortController?.abort()"
            :loading="
              isStreaming || !!dialogItems.at(-2)?.message?.generatingSession
            "
            ml-4
            min-h="40px"
            :disabled="inputEmpty"
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
              outlined: true,
            }"
            component="input"
          />
        </div>
        <a-input
          ref="messageInput"
          class="mt-2"
          max-h-50vh
          of-y-auto
          :model-value="inputMessageContent?.text"
          @update:model-value="inputMessageContent && updateInputText($event)"
          outlined
          autogrow
          clearable
          :debounce="30"
          :placeholder="$t('dialogView.chatPlaceholder')"
          @keydown.enter="handleInputEnterKeyPress"
          @paste="handleCodePasteFormatting"
        />
      </div>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { until } from "@vueuse/core"
import Mark from "mark.js"
import { useQuasar } from "quasar"
import { computed, inject, nextTick, onUnmounted, ref, toRef, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import AbortableBtn from "@/shared/components/AbortableBtn.vue"
import { useListenKey } from "@/shared/composables"
import { useSetTitle } from "@/shared/composables/setTitle"
import { useUiStateStore, useUserDataStore, useUserPerfsStore } from "@/shared/store"
import type { ApiResultItem, Plugin } from "@/shared/types"
import { MaxMessageFileSizeMB } from "@/shared/utils/config"
import {
  almostEqual,
  displayLength,
  isPlatformEnabled,
  isTextFile,
  mimeTypeMatch,
  pageFhStyle,
  textBeginning,
  wrapCode,
  wrapQuote
} from "@/shared/utils/functions"

import AddInfoBtn from "@/features/dialogs/components/AddPlugin/AddInfoBtn.vue"
import MessageItem from "@/features/dialogs/components/MessageItem.vue"
import { useDialogInput } from "@/features/dialogs/composables/useDialogInput"
import { useDialogMessages } from "@/features/dialogs/composables/useDialogMessages"
import { useDialogModel } from "@/features/dialogs/composables/useDialogModel"
import { useLlmDialog } from "@/features/dialogs/composables/useLlmDialog"
import { useDialogMessagesStore } from "@/features/dialogs/store"
import { DialogContent } from "@/features/dialogs/utils/dialogTemplateDefinitions"
import { engine } from "@/features/dialogs/utils/templateEngine"
import MessageFile from "@/features/media/components/MessageFile.vue"
import MessageImage from "@/features/media/components/MessageImage.vue"
import { scaleBlob } from "@/features/media/utils/imageProcess"
import EnablePluginsMenu from "@/features/plugins/components/EnablePluginsMenu.vue"
import { usePluginsStore } from "@/features/plugins/store"
import PromptVarInput from "@/features/prompt/components/PromptVarInput.vue"
import ModelOptionsBtn from "@/features/providers/components/ModelOptionsBtn.vue"
import ModelOverrideMenu from "@/features/providers/components/ModelOverrideMenu.vue"
import { useActiveWorkspace } from "@/features/workspaces/composables/useActiveWorkspace"

import { DialogMessageNested } from "@/services/data/types/dialogMessage"

import ParseFilesDialog from "../components/ParseFilesDialog.vue"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
import ErrorNotFound from "@/pages/ErrorNotFound.vue"
const { t } = useI18n()

const props = defineProps<{
  id: string
}>()

const rightDrawerAbove = inject("rightDrawerAbove")

const dialogId = computed(() => props.id)

const { assistant } = useActiveWorkspace()

const {
  dialog, workspaceId, dialogItems, fetchMessages, switchBranch,
  lastMessageId, getMessageContents, createBranch, deleteBranch, deleteStoredItemWithFile
} = useDialogMessages(dialogId)

const { addDialogMessage } = useDialogMessagesStore()

const {
  inputMessageId,
  updateInputText,
  inputMessageContent,
  inputContentItems,
  addInputItems,
  inputEmpty,
} = useDialogInput(dialogId)

const pluginsStore = usePluginsStore()
const { data: perfs } = useUserPerfsStore()

const { model, sdkModel, modelOptions } = useDialogModel(dialog, assistant)

const $q = useQuasar()
const { genTitle, extractArtifact, streamLlmResponse, isStreaming } = useLlmDialog(
  workspaceId,
  dialogId,
  assistant
)

const preventLockingBottom = ref(false)

const lockingBottom = computed(
  () =>
    !preventLockingBottom.value &&
    isStreaming.value &&
    perfs.streamingLockBottom
)

// stream abort controller
const abortController = ref<AbortController | null>(null)
const imageInput = ref()
const fileInput = ref()
const messageInput = ref()
const showVars = ref(true)

watch(
  () => dialogId.value,
  () => fetchMessages(),
  { immediate: true }
)

const startStream = async (target: string, insert = false) => {
  preventLockingBottom.value = false
  abortController.value = new AbortController()
  await streamLlmResponse(target, abortController.value)
}

function focusInput () {
  isPlatformEnabled(perfs.autoFocusDialogInput) && messageInput.value?.focus()
}

async function edit (message: DialogMessageNested) {
  await createBranch(message)
  await nextTick()
  focusInput()
}

function ensureAssistantAndModel () {
  if (!assistant.value) {
    $q.notify({
      message: t("dialogView.errors.setAssistant"),
      color: "negative",
    })

    return false
  }

  if (!sdkModel.value) {
    $q.notify({
      message: t("dialogView.errors.configModel"),
      color: "negative",
    })

    return false
  }

  return true
}

async function regenerate(parentId: string) {
  if (!ensureAssistantAndModel()) return

  await startStream(parentId)
}

/**
 * Handles pasting of code from editors like VSCode.
 * Automatically detects code snippets and formats them with proper markdown syntax.
 *
 * @param ev - The clipboard event containing the pasted content
 */
function handleCodePasteFormatting (ev: ClipboardEvent) {
  if (!perfs.codePasteOptimize) return

  const { clipboardData } = ev
  const i = clipboardData.types.findIndex((t) => t === "vscode-editor-data")

  if (i !== -1) {
    const code = clipboardData
      .getData("text/plain")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")

    if (!/\n/.test(code)) return

    const data = clipboardData.getData("vscode-editor-data")
    const lang = JSON.parse(data).mode ?? ""

    if (lang === "markdown") return

    const wrappedCode = wrapCode(code, lang)
    document.execCommand("insertText", false, wrappedCode)
    ev.preventDefault()
  }
}

function onInputFiles ({ target }) {
  const files = target.files
  parseFiles(Array.from(files))
  target.value = ""
}

function onPaste (ev: ClipboardEvent) {
  const { clipboardData } = ev

  if (clipboardData.types.includes("text/plain")) {
    if (
      !["TEXTAREA", "INPUT"].includes(document.activeElement.tagName) &&
      !["true", "plaintext-only"].includes(
        (document.activeElement as HTMLElement).contentEditable
      )
    ) {
      const text = clipboardData.getData("text/plain")
      addInputItems([
        {
          type: "text",
          name: t("dialogView.pastedText", { text: textBeginning(text, 12) }),
          contentText: text,
        },
      ])
    }

    return
  }

  parseFiles(Array.from(clipboardData.files) as File[])
}
addEventListener("paste", onPaste)
onUnmounted(() => removeEventListener("paste", onPaste))

async function parseFiles (files: File[]) {
  if (!files.length) return

  const textFiles = []
  const supportedFiles = []
  const otherFiles = []
  for (const file of files) {
    if (await isTextFile(file)) textFiles.push(file)
    else if (mimeTypeMatch(file.type, model.value.inputTypes.user)) {
      supportedFiles.push(file)
    } else otherFiles.push(file)
  }

  const parsedFiles: ApiResultItem[] = []
  for (const file of textFiles) {
    parsedFiles.push({
      type: "text",
      name: file.name,
      contentText: await file.text(),
    })
  }
  for (const file of supportedFiles) {
    if (file.size > MaxMessageFileSizeMB * 1024 * 1024) {
      $q.notify({
        message: t("dialogView.fileTooLarge", {
          maxSize: MaxMessageFileSizeMB,
        }),
        color: "negative",
      })
      continue
    }

    const f =
      file.type.startsWith("image/") && file.size > 512 * 1024
        ? await scaleBlob(file, 2048 * 2048)
        : file
    parsedFiles.push({
      type: "file",
      name: file.name,
      mimeType: file.type,
      contentBuffer: await f.arrayBuffer(), // TODO: fix this
    })
  }

  await addInputItems(parsedFiles)

  otherFiles.length &&
    $q
      .dialog({
        component: ParseFilesDialog,
        componentProps: { files: otherFiles, plugins: assistant.value.plugins },
      })
      .onOk((files: ApiResultItem[]) => {
        addInputItems(files)
      })
}

async function quote (item: ApiResultItem) {
  if (displayLength(item.contentText) > 200) {
    await addInputItems([item])
  } else {
    const { text } = inputMessageContent.value
    const content = wrapQuote(item.contentText) + "\n\n"
    await updateInputText(text ? text + "\n" + content : content)
    focusInput()
  }
}

async function sendPrompt (prompt: string) {
  if (!ensureAssistantAndModel()) return

  const parentId = lastMessageId.value

  const { id: newUserMessageId } = await addDialogMessage(
    dialog.value.id,
    parentId,
    {
      type: "user",
      messageContents: [{
        type: "user-message",
        text: prompt,
      }],
      status: "default"
    }
  )

  await nextTick()
  await startStream(newUserMessageId)
}

async function sendCyberlinkPrompt (text: string) {
  const prompt = `Create a cyberlink with type "Post" and the following content:\n\n${text}`
  await sendPrompt(prompt)
}

/**
 * Sends the current user message and initiates an LLM response generation.
 * This handles the core interaction flow of submitting user input and getting AI response.
 */
async function sendUserMessageAndGenerateResponse () {
  if (!ensureAssistantAndModel()) return

  showVars.value = false
  nextTick().then(() => {
    scroll("bottom")
  })

  await startStream(lastMessageId.value, false)
}

let lastScrollTop

function scrollListener () {
  const container = scrollContainer.value

  if (container.scrollTop < lastScrollTop) {
    preventLockingBottom.value = true
  }

  lastScrollTop = container.scrollTop
}

function lockBottom () {
  lockingBottom.value && scroll("bottom", "auto")
}

watch(lockingBottom, (val) => {
  if (val) {
    lastScrollTop = scrollContainer.value.scrollTop
    scrollContainer.value.addEventListener("scroll", scrollListener)
  } else {
    lastScrollTop = null
    scrollContainer.value.removeEventListener("scroll", scrollListener)
  }
})
const activePlugins = computed<Plugin[]>(() =>
  assistant.value
    ? pluginsStore.plugins.filter(
      (p) => p.available && assistant.value.plugins[p.id]?.enabled
    )
    : []
)
const usage = computed(() => dialogItems.value.at(-2)?.message?.usage)

async function copyContent () {
  await navigator.clipboard.writeText(
    await engine.parseAndRender(DialogContent, {
      contents: getMessageContents(),
      title: dialog.value.name,
    })
  )
}
const route = useRoute()
const router = useRouter()
const userDataStore = useUserDataStore()
watch(
  route,
  (to) => {
    userDataStore.data.lastDialogIds[workspaceId.value] = dialogId.value
    until(dialog)
      .toMatch((val) => val?.id === dialogId.value)
      .then(async () => {
        focusInput()

        if (to.hash === "#genTitle") {
          genTitle(getMessageContents())
          router.replace({ hash: "" })
        } else if (to.hash === "#copyContent") {
          copyContent()
          router.replace({ hash: "" })
        }

        if (to.query.goto) {
          const { route, highlight } = JSON.parse(to.query.goto as string)
          // TODO: fix this
          // if (
          //   !JSONEqual(route, dialog.value.msg_route.slice(0, route.length))
          // ) {
          //   updateMsgRoute(route)
          //   await until(chain).changed()
          // }

          await nextTick()
          const { items } = getEls()
          const item = items[route.length - 1]

          if (highlight) {
            const mark = new Mark(item)
            mark.unmark()
            mark.mark(highlight)
          }

          item.querySelector("mark[data-markjs]")?.scrollIntoView()
          router.replace({ query: {} })
        }
      })
  },
  { immediate: true }
)

/**
 * Handles the enter key press in the message input based on user preferences.
 * Supports different send key combinations (Enter, Ctrl+Enter, Shift+Enter).
 */
function handleInputEnterKeyPress (ev) {
  if (perfs.sendKey === "ctrl+enter") {
    ev.ctrlKey && sendUserMessageAndGenerateResponse()
  } else if (perfs.sendKey === "shift+enter") {
    ev.shiftKey && sendUserMessageAndGenerateResponse()
  } else {
    if (ev.ctrlKey) document.execCommand("insertText", false, "\n")
    else if (!ev.shiftKey) sendUserMessageAndGenerateResponse()
  }
}

const scrollContainer = ref<HTMLElement>()

function getEls () {
  const container = scrollContainer.value
  const items: HTMLElement[] = Array.from(
    document.querySelectorAll(".message-item")
  )

  return { container, items }
}

function itemInView (item: HTMLElement, container: HTMLElement) {
  return (
    item.offsetTop <= container.scrollTop + container.clientHeight &&
    item.offsetTop + item.clientHeight > container.scrollTop
  )
}

function scroll (
  action: "up" | "down" | "top" | "bottom",
  behavior: "smooth" | "auto" = "smooth"
) {
  const { container, items } = getEls()

  if (action === "top") {
    container.scrollTo({ top: 0, behavior })

    return
  } else if (action === "bottom") {
    container.scrollTo({ top: container.scrollHeight, behavior })

    return
  }

  // Get current position
  const index = items.findIndex((item) => itemInView(item, container))
  const itemTypes = items.map((i) =>
    i.clientHeight > container.clientHeight ? "partial" : "entire"
  )
  let position: "start" | "inner" | "end" | "out"
  const item = items[index]
  const type = itemTypes[index]

  if (type === "partial") {
    if (almostEqual(container.scrollTop, item.offsetTop, 5)) {
      position = "start"
    } else if (
      almostEqual(
        container.scrollTop + container.clientHeight,
        item.offsetTop + item.clientHeight,
        5
      )
    ) {
      position = "end"
    } else if (
      container.scrollTop + container.clientHeight <
      item.offsetTop + item.clientHeight
    ) {
      position = "inner"
    } else {
      position = "out"
    }
  } else {
    if (almostEqual(container.scrollTop, item.offsetTop, 5)) {
      position = "start"
    } else {
      position = "out"
    }
  }

  // Scroll
  let top

  if (type === "entire") {
    if (action === "up") {
      if (position === "start") {
        if (index === 0) return

        top =
          itemTypes[index - 1] === "entire"
            ? items[index - 1].offsetTop
            : items[index - 1].offsetTop +
              items[index - 1].clientHeight -
              container.clientHeight
      } else {
        top = item.offsetTop
      }
    } else {
      if (index === items.length - 1) return

      top = items[index + 1].offsetTop
    }
  } else {
    if (action === "up") {
      if (position === "start") {
        if (index === 0) return

        top =
          itemTypes[index - 1] === "entire"
            ? items[index - 1].offsetTop
            : items[index - 1].offsetTop +
              items[index - 1].clientHeight -
              container.clientHeight
      } else if (position === "out") {
        top = item.offsetTop + item.clientHeight - container.clientHeight
      } else {
        top = item.offsetTop
      }
    } else {
      if (position === "end" || position === "out") {
        if (index === items.length - 1) return

        top = items[index + 1].offsetTop
      } else {
        top = item.offsetTop + item.clientHeight - container.clientHeight
      }
    }
  }

  container.scrollTo({ top: top + 2, behavior: "smooth" })
}

// TODO: fix this
// function regenerateCurr () {
//   const { container, items } = getEls()
//   const index = items.findIndex(
//     (item, i) =>
//       itemInView(item, container) &&
//       messageMap.value[chain.value[i + 1]].type === "assistant"
//   )

//   if (index === -1) return

//   regenerate(index + 1)
// }

// function editCurr () {
//   const { container, items } = getEls()
//   const index = items.findIndex(
//     (item, i) =>
//       itemInView(item, container) &&
//       messageMap.value[chain.value[i + 1]].type === "user"
//   )

//   if (index === -1) return

//   edit(index + 1)
// }

// function switchTo (target: "prev" | "next" | "first" | "last") {
//   console.log("switchTo", target)

//   const { container, items } = getEls()

//   const index = items.findIndex(
//     (item, i) =>
//       itemInView(item, container) &&
//       dialogItems.value.length > 1
//   )

//   if (index === -1) return

// const id = chain.value[index]
// let to
// const curr = dialog.value.msg_route[index]
// const num = dialog.value.msg_tree[id].length

// if (target === "first") {
//   to = 0
// } else if (target === "last") {
//   to = num - 1
// } else if (target === "prev") {
//   to = curr - 1
// } else if (target === "next") {
//   to = curr + 1
// }

// if (to < 0 || to >= num || to === curr) return

// switchChain(index, to)
// }

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "scrollUpKeyV2"), () => scroll("up"))
  useListenKey(toRef(perfs, "scrollDownKeyV2"), () => scroll("down"))
  useListenKey(toRef(perfs, "scrollTopKey"), () => scroll("top"))
  useListenKey(toRef(perfs, "scrollBottomKey"), () => scroll("bottom"))
  // TODO: fix this

  // useListenKey(toRef(perfs, "switchPrevKeyV2"), () => switchTo("prev"))
  // useListenKey(toRef(perfs, "switchNextKeyV2"), () => switchTo("next"))
  // useListenKey(toRef(perfs, "switchFirstKey"), () => switchTo("first"))
  // useListenKey(toRef(perfs, "switchLastKey"), () => switchTo("last"))
  // useListenKey(toRef(perfs, "regenerateCurrKey"), () => regenerateCurr())
  // useListenKey(toRef(perfs, "editCurrKey"), () => editCurr())
  useListenKey(toRef(perfs, "focusDialogInputKey"), () => focusInput())
}

const uiStateStore = useUiStateStore()
const scrollTops = uiStateStore.dialogScrollTops

/**
 * Saves the current scroll position for the active dialog.
 * This allows restoring the same position when switching between dialogs.
 */
function saveDialogScrollPosition (ev) {
  scrollTops[dialogId.value] = ev.target.scrollTop
}
watch(
  () => dialogId.value,
  (id) => {
    if (!id) return

    nextTick(() => {
      scrollContainer.value?.scrollTo({ top: scrollTops[id] ?? 0 })
    })
  }
)

defineEmits(["toggle-drawer"])

useSetTitle(computed(() => dialog.value?.name))
</script>
