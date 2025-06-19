import { computed } from 'vue'

import type { Command } from '@/shared/components/input/control/CommandSuggestions.vue'
import { useUserDataStore } from '@/shared/store'

import { useAssistantsStore } from '@/features/assistants/store'
import { useActiveWorkspace } from '@/features/workspaces/composables/useActiveWorkspace'

export function useInputCommands(
  fileInput: { value?: { click: () => void } },
  imageInput: { value?: { click: () => void } },
  onAssistantChange?: (assistantId: string) => void
) {
  const assistantsStore = useAssistantsStore()
  const userDataStore = useUserDataStore()
  const { workspace } = useActiveWorkspace()

  // Available commands for the overlay
  const availableCommands = computed<Command[]>(() => {
    const commands: Command[] = [
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
    ]

    // Add assistant switching commands
    const availableAssistants = assistantsStore.assistants.filter(
      a => a.workspaceId === workspace.value?.id || a.workspaceId == null
    )

    availableAssistants.forEach(assistant => {
      commands.push({
        name: `@${assistant.name}`,
        description: `Switch to ${assistant.name}`,
        icon: 'sym_o_psychology',
        action: () => {
          if (workspace.value) {
            userDataStore.data.defaultAssistantIds[workspace.value.id] = assistant.id
            // Notify about assistant change
            onAssistantChange?.(assistant.id)
          }
        }
      })
    })

    return commands
  })

  function onCommandExecuted(command: Command) {
    // Additional handling when a command is executed
    console.log('Command executed:', command.name)
  }

  return {
    availableCommands,
    onCommandExecuted
  }
}
