# Active Development Context

## Current Work
- Refactoring dialog message handling in `src/features/dialogs`
- Consolidating duplicate UI components (avatars, dialog controls)
- Standardizing store initialization patterns across features
- Documented core code patterns in systemPatterns.md

## Key Technical Focus Areas
1. **Component Architecture**
   - Migrating legacy components to Composition API
   - Implementing new dialog tree visualization components
   - Creating shared plugin configuration UI elements

2. **State Management**
   - Optimizing real-time sync between Pinia and Supabase
   - Implementing store version migration system
   - Developing cross-store event bus for feature coordination

3. **Performance Optimization**
   - Message rendering optimizations for large dialog trees
   - Virtual scrolling implementation for artifact lists
   - Web Worker integration for expensive template processing

## Relevant Code Patterns
- **Dialog Message Handling** (`src/features/dialogs/composables/useDialogMessages.ts`)
  ```typescript
  export function useDialogMessages(dialogId: string) {
    const store = useDialogMessagesStore()
    const messages = computed(() => store.messages[dialogId])

    // New pattern for batch message updates
    const updateMessageBatch = (updates: MessageUpdate[]) => {
      store.applyBatchUpdates(dialogId, updates)
    }

    return { messages, updateMessageBatch }
  }
  ```

## Pending Tasks
- Complete store relationship documentation in `STORE_DIAGRAM.md`
- Implement cross-tab synchronization for real-time collaboration
- Finalize plugin manifest validation schema
- Create shared wallet interface package
- Introduce DialogService abstraction layer
- Develop plugin dependency injection system
