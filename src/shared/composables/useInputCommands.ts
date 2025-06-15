import { computed } from 'vue'

import type { Command } from '@/shared/components/input/CommandSuggestionsOverlay.vue'

export function useInputCommands(fileInput: { value?: { click: () => void } }, imageInput: { value?: { click: () => void } }) {
  // Available commands for the overlay
  const availableCommands = computed<Command[]>(() => [
    {
      name: '/attach',
      description: 'Attach files to your message',
      icon: 'sym_o_folder',
      action: () => {
        fileInput.value?.click()
      }
    },
    {
      name: '/image',
      description: 'Add images to your message',
      icon: 'sym_o_image',
      action: () => {
        imageInput.value?.click()
      }
    }
  ])

  function onCommandExecuted(command: Command) {
    // Additional handling when a command is executed
    console.log('Command executed:', command.name)
  }

  return {
    availableCommands,
    onCommandExecuted
  }
}
