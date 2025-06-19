<template>
  <div>
    <!-- Pending files preview -->
    <div
      v-if="pendingFiles.length > 0"
      class="pending-files-container p-2 bg-sur-c-low rd-md pos-relative"
    >
      <q-btn
        flat
        dense
        round
        icon="sym_o_close"
        size="sm"
        @click="clearAllFiles"
        :title="$t('dialogView.clearAllFiles')"
        class="clear-all-btn"
      />
      <div class="flex flex-wrap gap-1 pr-8">
        <div
          v-for="(file, index) in pendingFiles"
          :key="index"
          class="pending-file-item flex items-center gap-2 p-2 bg-sur-c-high rd-sm"
        >
          <q-icon
            :name="getFileIcon(file)"
            size="20px"
          />
          <span class="text-sm truncate max-w-32">{{ file.name }}</span>
          <span class="text-xs text-sec">({{ formatFileSize(file.size) }})</span>
          <q-btn
            flat
            dense
            round
            icon="sym_o_close"
            size="xs"
            @click="removeFile(index)"
            :title="$t('dialogView.removeFile')"
          />
        </div>
      </div>
    </div>

    <div
      flex
      flex-wrap
      justify-end
      text-sec
      items-center
    >
      <q-btn
        v-if="props.model && mimeTypeMatch('image/webp', props.model.inputTypes.user)"
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
        v-if="props.assistant?.prompt_vars?.length"
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
        v-if="props.sdkModel"
        :provider-name="props.sdkModel.provider"
        :model-id="props.sdkModel.modelId"
        :model-value="props.modelOptions"
        @update:model-value="$emit('update:model-options', $event)"
        flat
        round
        min-w="2.7em"
        min-h="2.7em"
      />
      <add-info-btn
        :plugins="props.activePlugins"
        :assistant-plugins="props.assistant?.plugins || {}"
        :dialog-id="props.dialogId"
        :workspace-id="props.workspaceId"
        @add="$emit('add-input-items', $event)"
        flat
        round
        min-w="2.7em"
        min-h="2.7em"
      />
      <q-btn
        v-if="props.assistant"
        flat
        :round="!props.activePlugins.length"
        :class="{ 'px-2': props.activePlugins.length }"
        min-w="2.7em"
        min-h="2.7em"
        icon="sym_o_extension"
        :title="$t('dialogView.plugins')"
      >
        <code
          v-if="props.activePlugins.length"
          bg-sur-c-high
          px="6px"
        >{{
          props.activePlugins.length
        }}</code>
        <enable-plugins-menu :assistant-id="props.assistant.id" />
      </q-btn>
      <q-space />
      <div
        v-if="props.usage"
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
        >{{ props.usage.promptTokens }}+{{ props.usage.completionTokens }}</code>
        <q-tooltip>
          {{ $t("dialogView.messageTokens") }}<br>
          {{ $t("dialogView.tokenPrompt") }}：{{ props.usage.promptTokens }}，{{
            $t("dialogView.tokenCompletion")
          }}：{{ props.usage.completionTokens }}
        </q-tooltip>
      </div>
      <abortable-btn
        icon="sym_o_send"
        :label="$t('dialogView.send')"
        @click="handleSend"
        @abort="$emit('abort')"
        :loading="props.loading"
        ml-4
        min-h="40px"
        :disabled="props.inputEmpty && pendingFiles.length === 0"
      />
    </div>

    <div
      flex
      v-if="props.assistant"
      v-show="showVars"
    >
      <prompt-var-input
        class="mt-2 mr-2"
        v-for="promptVar of props.assistant.prompt_vars"
        :key="promptVar.id"
        :prompt-var="promptVar"
        :model-value="props.inputVars[promptVar.name]"
        @update:model-value="$emit('update-input-vars', promptVar.name, $event)"
        :input-props="{
          dense: true,
          outlined: true,
        }"
        component="input"
      />
    </div>

    <!-- Command suggestions overlay wrapping the input -->
    <command-suggestions-overlay
      ref="commandOverlay"
      :input-text="props.inputText"
      :commands="availableCommands"
      suggestion-position="top"
      @update-input-text="$emit('update-input-text', $event)"
      @command-executed="onCommandExecuted"
    >
      <template #default="{ onInput }">
        <a-input
          ref="messageInput"
          class="mt-2"
          max-h-50vh
          of-y-auto
          :model-value="props.inputText"
          @update:model-value="onInput"
          outlined
          autogrow
          clearable
          :debounce="30"
          :placeholder="$t('dialogView.chatPlaceholder')"
          @keydown.enter="handleEnterKey"
          @paste="$emit('paste', $event)"
        />
      </template>
    </command-suggestions-overlay>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import AbortableBtn from '@/shared/components/AbortableBtn.vue'
import CommandSuggestionsOverlay from '@/shared/components/input/control/CommandSuggestions.vue'
import { useDialogFileHandling } from '@/shared/components/input/control/dialogFileHandling'
import { useInputCommands } from '@/shared/components/input/control/useInputCommands'
import { mimeTypeMatch } from '@/shared/utils/functions'

import AddInfoBtn from '@/features/dialogs/components/AddPlugin/AddInfoBtn.vue'
import EnablePluginsMenu from '@/features/plugins/components/EnablePluginsMenu.vue'
import PromptVarInput from '@/features/prompt/components/PromptVarInput.vue'
import ModelOptionsBtn from '@/features/providers/components/ModelOptionsBtn.vue'

interface Props {
  model?: any
  assistant?: any
  sdkModel?: any
  modelOptions?: any
  activePlugins?: any[]
  usage?: any
  loading?: boolean
  inputEmpty?: boolean
  inputText?: string
  inputVars?: Record<string, any>
  dialogId?: string
  workspaceId?: string
}

const props = withDefaults(defineProps<Props>(), {
  model: undefined,
  assistant: undefined,
  sdkModel: undefined,
  modelOptions: undefined,
  activePlugins: () => [],
  usage: undefined,
  loading: false,
  inputEmpty: false,
  inputText: '',
  inputVars: () => ({}),
  dialogId: undefined,
  workspaceId: undefined
})

const emit = defineEmits<{
  'add-input-items': [items: any]
  'send': []
  'abort': []
  'update:model-options': [value: any]
  'update-input-vars': [name: string, value: any]
  'update-input-text': [text: string]
  'keydown-enter': [event: KeyboardEvent]
  'paste': [event: ClipboardEvent]
  'process-files': [files: File[]]
  'assistant-change': [assistantId: string]
}>()

const imageInput = ref()
const fileInput = ref()
const messageInput = ref()
const commandOverlay = ref()
const showVars = ref(true)

const {
  pendingFiles,
  onInputFiles,
  removeFile,
  clearAllFiles,
  getFileIcon,
  formatFileSize
} = useDialogFileHandling()

const {
  availableCommands,
  onCommandExecuted
} = useInputCommands(fileInput, imageInput, (assistantId) => {
  // Emit event to notify parent about assistant change
  emit('assistant-change', assistantId)
})

function handleEnterKey(event: KeyboardEvent) {
  // Check if the command overlay handled the event
  if (commandOverlay.value?.isShowingCommands()) {
    // Let the overlay handle it
    return
  }

  emit('keydown-enter', event)
}

async function handleSend() {
  // Hide command suggestions if they're showing
  if (commandOverlay.value?.isShowingCommands()) {
    commandOverlay.value.hideCommandSuggestions()

    return
  }

  // If there are pending files, process them first
  if (pendingFiles.value.length > 0) {
    emit('process-files', [...pendingFiles.value])
    pendingFiles.value = [] // Clear pending files after processing
  }

  // Emit the send event
  emit('send')
}

defineExpose({
  messageInput,
  imageInput,
  fileInput,
  focus: () => messageInput.value?.focus(),
  getPendingFiles: () => [...pendingFiles.value],
  clearPendingFiles: () => {
    pendingFiles.value = []
  }
})
</script>

<style scoped>
.pending-files-container {
  border: 1px dashed var(--q-color-separator);
  padding: 0px;
}
.pending-file-item {
  min-width: 0; /* Allow flex items to shrink */
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.max-w-32 {
  max-width: 8rem;
}

.clear-all-btn {
  position: absolute;
  top: 3px;
  right: 5px;
  transform: translateY(-50%);
  z-index: 1;
}
</style>
