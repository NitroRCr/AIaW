<template>
  <div class="command-overlay-container pos-relative">
    <!-- Command suggestions dropdown -->
    <div
      v-if="showCommandSuggestions"
      class="command-suggestions-container absolute z-10 bg-sur-c-high rd-md shadow-md"
      :style="suggestionStyles"
    >
      <div
        v-for="(command, index) in filteredCommands"
        :key="command.name"
      >
        <div
          :class="[
            'command-suggestion-item p-2 cursor-pointer flex items-center gap-2',
            { 'bg-sur-c-low': selectedCommandIndex === index }
          ]"
          @click="executeCommand(command)"
          @mouseenter="selectedCommandIndex = index"
        >
          <q-icon
            :name="command.icon"
            size="20px"
          />
          <div>
            <div class="text-sm font-medium">
              {{ command.name }}
            </div>
            <div class="text-xs text-sec">
              {{ command.description }}
            </div>
          </div>
        </div>
        <q-separator v-if="index < filteredCommands.length - 1" />
      </div>
    </div>

    <!-- Slot for the input component -->
    <slot
      :on-input="handleInputChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { useListenKey } from "@/shared/composables"
import { useUserPerfsStore } from '@/shared/store'
import { isPlatformEnabled } from '@/shared/utils/functions'

export interface Command {
  name: string
  description: string
  icon: string
  action: () => void
}

interface Props {
  inputText?: string
  commands?: Command[]
  suggestionPosition?: 'top' | 'bottom'
  suggestionOffset?: string
}

const props = withDefaults(defineProps<Props>(), {
  inputText: '',
  commands: () => [],
  suggestionPosition: 'bottom',
  suggestionOffset: '60px'
})

const emit = defineEmits<{
  'update-input-text': [text: string]
  'command-executed': [command: Command]
}>()

const { data: perfs } = useUserPerfsStore()
const showCommandSuggestions = ref(false)
const selectedCommandIndex = ref(0)
const currentCommandQuery = ref('')

// Computed styles for suggestion dropdown positioning
const suggestionStyles = computed(() => {
  const styles: Record<string, string> = {
    left: '0',
    right: '0',
    'max-height': '200px',
    'overflow-y': 'auto'
  }

  if (props.suggestionPosition === 'top') {
    styles.bottom = props.suggestionOffset
  } else {
    styles.top = props.suggestionOffset
  }

  return styles
})

// Filter commands based on current input
const filteredCommands = computed(() => {
  if (!currentCommandQuery.value || !props.commands.length) {
    return props.commands
  }

  const query = currentCommandQuery.value.toLowerCase()

  return props.commands.filter(command =>
    command.name.toLowerCase().includes(query)
  )
})

// Watch input text for command detection
watch(() => props.inputText, (newText) => {
  detectCommand(newText || '')
}, { immediate: true })

function detectCommand(text: string) {
  const words = text.split(' ')
  const lastWord = words[words.length - 1]

  if ((lastWord.startsWith('/') || lastWord.startsWith('@')) && lastWord.length > 1) {
    currentCommandQuery.value = lastWord
    showCommandSuggestions.value = true
    selectedCommandIndex.value = 0
  } else if ((text.startsWith('/') || text.startsWith('@')) && text.indexOf(' ') === -1) {
    currentCommandQuery.value = text
    showCommandSuggestions.value = true
    selectedCommandIndex.value = 0
  } else {
    hideCommandSuggestions()
  }
}

function hideCommandSuggestions() {
  showCommandSuggestions.value = false
  currentCommandQuery.value = ''
  selectedCommandIndex.value = 0
}

function executeCommand(command: Command) {
  // Remove the command from input text
  const currentText = props.inputText || ''
  let newText = ''

  if ((currentText.startsWith('/') || currentText.startsWith('@')) && currentText.indexOf(' ') === -1) {
    // Command is the entire input
    newText = ''
  } else {
    // Command is at the end, remove it
    const words = currentText.split(' ')
    words.pop() // Remove the last word (command)
    newText = words.join(' ')

    if (newText && !newText.endsWith(' ')) {
      newText += ' '
    }
  }

  emit('update-input-text', newText)
  hideCommandSuggestions()

  // Execute the command action and emit event
  command.action()
  emit('command-executed', command)
}

function handleInputChange(text: string) {
  emit('update-input-text', text)
}

function handleEnterKey() {
  if (showCommandSuggestions.value && filteredCommands.value.length > 0) {
    const selectedCommand = filteredCommands.value[selectedCommandIndex.value]

    if (selectedCommand) {
      executeCommand(selectedCommand)
    }

    return true // Indicate that the event was handled
  }

  return false // Let the parent handle the event
}

function handleArrowDown() {
  if (showCommandSuggestions.value) {
    selectedCommandIndex.value = Math.min(
      filteredCommands.value.length - 1,
      selectedCommandIndex.value + 1
    )

    return true
  }

  return false
}

function handleArrowUp() {
  if (showCommandSuggestions.value) {
    selectedCommandIndex.value = Math.max(0, selectedCommandIndex.value - 1)

    return true
  }

  return false
}

// Set up global keyboard shortcuts using useListenKey
if (isPlatformEnabled(perfs.enableShortcutKey)) {
  // Enter key to execute selected command
  useListenKey(ref({ key: 'Enter' }), () => {
    if (showCommandSuggestions.value) {
      handleEnterKey()
    }
  })

  // Tab key to execute selected command (same as Enter)
  useListenKey(ref({ key: 'Tab' }), () => {
    if (showCommandSuggestions.value) {
      handleEnterKey()
    }
  })

  // Arrow up to navigate up in suggestions
  useListenKey(ref({ key: 'ArrowUp' }), () => {
    if (showCommandSuggestions.value) {
      handleArrowUp()
    }
  })

  // Arrow down to navigate down in suggestions
  useListenKey(ref({ key: 'ArrowDown' }), () => {
    if (showCommandSuggestions.value) {
      handleArrowDown()
    }
  })

  // Escape to hide suggestions
  useListenKey(ref({ key: 'Escape' }), () => {
    if (showCommandSuggestions.value) {
      hideCommandSuggestions()
    }
  })
}

// Expose methods for external use
defineExpose({
  hideCommandSuggestions,
  isShowingCommands: () => showCommandSuggestions.value
})
</script>

<style scoped>
.command-overlay-container {
  position: relative;
}

.command-suggestions-container {
  border: 1px solid var(--q-color-separator);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.command-suggestion-item {
  transition: all 0.2s ease;
  border: 2px solid transparent;
  border-radius: 4px;
}

.command-suggestion-item.bg-sur-c-low {
  border-color: var(--q-color-primary);
}
</style>
