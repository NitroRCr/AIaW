# AIaW Development Guide

This guide outlines the architecture, patterns, and conventions used in the AIaW (AI as Workspace) project. It serves as a reference for developers to understand the codebase and maintain consistency when contributing.

## Table of Contents

- [Project Overview](#project-overview)
- [Technical Stack](#technical-stack)
- [Architecture](#architecture)
- [Feature-Based Structure](#feature-based-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Refactoring Guidelines](#refactoring-guidelines)
- [State Management](#state-management)
- [Component Development](#component-development)
- [Cross-Platform Development](#cross-platform-development)
- [Testing](#testing)
- [Internationalization](#internationalization)
- [Documentation](#documentation)

## Project Overview

AIaW is a next-generation, multi-user AI workspace platform designed for real-time collaboration, team chat, and extensibility. It integrates with various AI providers and offers a plugin system to extend functionality.

### Key Features

- Multi-user collaboration with real-time chat
- Supabase backend for authentication, roles, and data storage
- Support for multiple AI providers
- Plugin system for extensibility
- Cross-platform support (Web, Desktop, Mobile)
- Web3 layer for decentralized features

## Technical Stack

- **Frontend Framework**: Vue 3 with Composition API
- **UI Framework**: Quasar Framework (Material Design)
- **Build System**: Vite (via Quasar CLI)
- **State Management**: Pinia
- **Database/Backend**: Supabase
- **Desktop**: Tauri
- **Mobile**: Capacitor
- **Typing**: TypeScript
- **Internationalization**: Vue-i18n
- **Testing**: Jest
- **Documentation**: VitePress
- **Component Showcase**: Storybook

## Architecture

AIaW follows a **feature-based modular architecture** with a clear separation of concerns. Each feature is self-contained with its own components, logic, and state management.

### Directory Structure

```
src/
├── app/               # App-specific setup
├── assets/            # Static assets
├── boot/              # Initialization scripts
├── css/               # Global styles
├── features/          # Feature modules (main code organization)
├── i18n/              # Internationalization resources
├── layouts/           # Layout components
├── pages/             # Page components (routing entry points)
├── router/            # Routing configuration
├── services/          # Service layers for external integrations
├── shared/            # Shared components and utilities
├── utils/             # Global utility functions
```

## Feature-Based Structure

The `features/` directory is the core of the application, where most business logic and UI components reside. Each feature follows a consistent structure:

```
features/
├── feature-name/
│   ├── components/    # UI components specific to the feature
│   ├── composables/   # Vue composables (hooks) for feature logic
│   ├── store/         # Pinia store for feature state
│   ├── utils/         # Utility functions
│   ├── views/         # Routable view components
│   └── types.ts       # TypeScript types and interfaces (optional)
```

### Current Features

- **artifacts**: Manages AI-generated artifacts
- **assistants**: Assistant configuration and management
- **auth**: Authentication and authorization
- **chats**: Real-time chat functionality
- **cyber**: Web3/blockchain integrations
- **dialogs**: AI conversation dialogs
- **files**: File management
- **llm**: Language model integrations
- **media**: Media handling (images, audio)
- **plugins**: Plugin system
- **profile**: User profile management
- **providers**: AI provider configuration
- **settings**: Application settings
- **workspaces**: Workspace management

## Development Workflow

### Setup and Installation

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Set up Supabase (local or cloud)
4. Start the development server with `npm run dev` or `quasar dev`

### Commands

- **Development**: `npm run dev` or `quasar dev`
- **Build**: `npm run build` or `quasar build`
- **Lint**: `npm run lint` or `npm run eslint:fix`
- **Type Check**: `vue-tsc --noEmit`
- **Test**: `npm test` or `jest [testFilePath]`
- **Storybook**: `npm run storybook`
- **Documentation**: `npm run docs:dev`

## Coding Standards

### General Guidelines

- **TypeScript**: Use TypeScript for all new code
- **Vue 3 Composition API**: Use `<script setup lang="ts">` for Vue components
- **ESLint**: Follow the ESLint configuration
- **Naming Conventions**:
  - PascalCase for components, interfaces, and types
  - camelCase for variables, functions, and methods
  - kebab-case for file names (except Vue components)

### File Organization

- One component per file
- Group related functionality in appropriate feature directories

### Import Standards

- **Path Aliases**: Always use `@/` prefix for path aliases
  ```typescript
  // Correct
  import { useUserStore } from "@/shared/store"
  import { useDialogsStore } from "@/features/dialogs/store"

  // Incorrect
  import { useUserStore } from "@shared/store"
  import { useDialogsStore } from "../../dialogs/store"
  ```

- **Import Order**: Organize imports in the following order:
  1. Vue and external libraries
  2. Types (grouped)
  3. Services
  4. Shared utilities and components
  5. Other features
  6. Current feature (relative paths for closely related files)

- **Relative vs Absolute**:
  - Use absolute paths for imports across features
  - Use relative paths only for closely related files in the same directory

- **Utility Scripts**:
  - `npm run fix:imports`: Fix import paths across the codebase
  - `./scripts/fix-imports.sh path/to/file.ts`: Fix imports in a specific file

### Component Structure

```vue
<script setup lang="ts">
// Imports from Vue/Quasar
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

// Imports from other packages
import { someUtility } from 'external-package'

// Imports from internal modules
import { useFeatureStore } from '../store'
import { someHelper } from '../utils/helpers'

// Types
interface Props {
  propName: string
}

// Props, emits definition
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

// Composables
const featureStore = useFeatureStore()
const $q = useQuasar()

// Reactive state
const localState = ref('')

// Computed properties
const derivedValue = computed(() => {
  return someHelper(localState.value, props.propName)
})

// Methods
function handleEvent() {
  emit('update', derivedValue.value)
}
</script>

<template>
  <q-card class="my-component">
    <q-card-section>
      {{ derivedValue }}
    </q-card-section>
    <q-card-actions>
      <q-btn @click="handleEvent">Update</q-btn>
    </q-card-actions>
  </q-card>
</template>

<style lang="scss" scoped>
.my-component {
  // Component-specific styles
}
</style>
```

## Refactoring Guidelines

### Component Consolidation

To maintain a clean and organized codebase, follow these component consolidation guidelines:

#### Shared Component Organization

Components should be organized based on their usage scope:

- **Feature-specific components**: Keep in `src/features/[module]/components/`
- **Generic UI components**: Move to appropriate shared directories:
  - `src/shared/components/avatar/` - Avatar-related components
  - `src/shared/components/file/` - File handling components
  - `src/shared/components/layout/` - Layout and navigation components
  - `src/shared/components/media/` - Media display components
  - `src/shared/components/dialogs/` - Dialog components
  - `src/shared/components/input/` - Form and input components

#### Duplicate Component Resolution

When consolidating duplicate components:

1. **Identify the canonical version**: Choose the most complete or appropriately located version
2. **Update all imports**: Use absolute path imports when moving components
3. **Verify functionality**: Ensure all usage scenarios still work
4. **Remove duplicates**: Delete duplicate files after successful migration

Example consolidation:
```typescript
// Before - duplicate components
src/shared/components/AAvatar.vue (duplicate)
src/shared/components/avatar/AAvatar.vue (keep)

// After - consolidated imports
import AAvatar from "@shared/components/avatar/AAvatar.vue"
```

#### Component Naming Standards

- Use PascalCase for component names
- Fix typos in component names (e.g., `DragableSeparator` → `DraggableSeparator`)
- Ensure component names are descriptive and follow consistent patterns

### Function Refactoring

Break down complex functions to improve maintainability:

#### Complexity Indicators

Refactor functions that exhibit:
- **High line count**: Functions with 50+ lines
- **Deep nesting**: More than 3-4 levels of nested conditionals
- **Multiple responsibilities**: Functions doing more than one distinct task
- **Parameter complexity**: Functions with many parameters or complex parameter handling

#### Refactoring Approach

1. **Identify distinct responsibilities** within the function
2. **Extract helper functions** for each responsibility
3. **Maintain clear data flow** between functions
4. **Add comprehensive JSDoc documentation**

Example refactoring pattern:
```typescript
// Before - complex function
async function complexOperation(data, options) {
  // 90+ lines of mixed responsibilities
  // Data validation, processing, API calls, error handling
}

// After - refactored with helper functions
async function complexOperation(data, options) {
  const validatedData = validateInput(data);
  const processedData = processData(validatedData, options);
  const result = await performApiCall(processedData);
  return handleResult(result);
}

function validateInput(data) { /* focused validation logic */ }
function processData(data, options) { /* focused processing logic */ }
async function performApiCall(data) { /* focused API logic */ }
function handleResult(result) { /* focused result handling */ }
```

### Parameter Standardization

Standardize function parameter patterns for consistency:

#### Parameter Order

Follow this consistent order for function parameters:

1. **Identifiers/Keys**: IDs and key values (e.g., `dialogId`, `messageId`)
2. **Content/Data**: Main data objects being manipulated
3. **Options/Configuration**: Optional settings that modify behavior
4. **Callbacks**: Callback functions for async operations

```typescript
// Standardized parameter order
function updateDialogMessage(
  dialogId: string,              // 1. Identifier
  messageId: string,             // 1. Identifier
  message: Partial<DialogMessage>, // 2. Content
  options?: UpdateOptions,       // 3. Options
  onComplete?: () => void        // 4. Callback
) { /* ... */ }
```

#### Parameter Patterns

- **Simple functions (1-3 parameters)**: Use explicit parameters
- **Complex functions (4+ parameters)**: Use object destructuring
- **Optional parameters**: Use TypeScript optional syntax with default values

```typescript
// Simple function - explicit parameters
function processText(text: string, maxLength: number = 100): string {
  return text.length > maxLength ? text.substring(0, maxLength) : text;
}

// Complex function - object destructuring
function createDialog(options: {
  workspaceId: string;
  title?: string;
  participants?: string[];
  settings?: DialogSettings;
  onCreated?: (dialog: Dialog) => void;
}) {
  const { workspaceId, title = 'New Dialog', participants = [], settings, onCreated } = options;
  // Implementation
}
```

#### Parameter Naming

- Use `id` suffix for identifiers: `dialogId`, `messageId`, `workspaceId`
- Use `options` for configuration objects
- Use descriptive verb-noun combinations for callbacks: `onComplete`, `onError`, `handleSuccess`
- Maintain consistency across similar functions

### Store Standardization

Standardize Pinia store organization and naming:

#### Store File Structure

```
src/
├── features/
│   └── [module]/
│       └── store/
│           ├── index.ts          # Main store, re-exports others
│           ├── [substore].ts     # Secondary stores if needed
│           └── types.ts          # Store-specific types
└── shared/
    └── store/
        ├── index.ts              # Re-exports all shared stores
        ├── [storeName].ts        # Individual store files
        └── types.ts              # Shared store types
```

#### Store Naming Conventions

- **File names**: Use kebab-case without "Store" suffix (`user-preferences.ts`)
- **Store IDs**: Use kebab-case, dot notation for nested stores (`"user-preferences"`, `"dialogs.messages"`)
- **Export names**: Use camelCase with "Store" suffix (`useUserPreferencesStore`)

```typescript
// features/dialogs/store/index.ts
export const useDialogsStore = defineStore('dialogs', () => {
  // Main dialogs functionality
});

// features/dialogs/store/messages.ts
export const useDialogMessagesStore = defineStore('dialogs.messages', () => {
  // Messages-specific functionality
});

// shared/store/user-preferences.ts
export const useUserPreferencesStore = defineStore('user-preferences', () => {
  // User preferences functionality
});
```

#### Store Re-exports

Always provide clean re-exports through index files:

```typescript
// features/dialogs/store/index.ts
export { useDialogsStore } from './main';
export { useDialogMessagesStore } from './messages';
export type * from './types';

// shared/store/index.ts
export { useUserPreferencesStore } from './user-preferences';
export { useUiStateStore } from './ui-state';
// ... other stores
```

## State Management

AIaW uses Pinia for state management with standardized patterns:

### Store Structure

```typescript
// features/feature-name/store/index.ts
import { defineStore } from 'pinia'

export const useFeatureStore = defineStore('feature', () => {
  // State
  const items = ref<Item[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const filteredItems = computed(() =>
    items.value.filter(item => item.active)
  )

  // Actions
  async function fetchItems() {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.getItems()
      items.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch items:', err)
    } finally {
      isLoading.value = false
    }
  }

  function updateItem(id: string, updates: Partial<Item>) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updates }
    }
  }

  // Return public API
  return {
    // State
    items: readonly(items),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Getters
    filteredItems,

    // Actions
    fetchItems,
    updateItem
  }
})
```

### Store Usage Patterns

```typescript
// In components
import { useFeatureStore } from '@/features/feature-name/store'

const featureStore = useFeatureStore()

// Access reactive state
const items = computed(() => featureStore.filteredItems)
const isLoading = computed(() => featureStore.isLoading)

// Call actions
async function loadData() {
  await featureStore.fetchItems()
}
```

### Store Composition

For complex features, compose multiple stores:

```typescript
// features/dialogs/store/index.ts
export const useDialogsStore = defineStore('dialogs', () => {
  const messagesStore = useDialogMessagesStore()
  const settingsStore = useDialogSettingsStore()

  // Coordinate between stores
  async function createDialog(options: CreateDialogOptions) {
    const dialog = await createDialogRecord(options)
    messagesStore.initializeMessages(dialog.id)
    settingsStore.applyDefaults(dialog.id)
    return dialog
  }

  return {
    createDialog,
    // Re-export from composed stores
    ...messagesStore,
    ...settingsStore
  }
})
```

## Component Development

### UI Components

- Use Quasar components (`q-*`) whenever possible
- Follow Material Design patterns for consistency
- Use Quasar's responsive classes for layout

### Composables

Extract reusable logic into composables following the naming convention `use[Feature]`:

```typescript
// features/feature-name/composables/useFeatureAction.ts
import { ref, computed } from 'vue'

export function useFeatureAction(initialValue: string) {
  const state = ref(initialValue)

  const derivedValue = computed(() => {
    return state.value.toUpperCase()
  })

  function updateState(newValue: string) {
    state.value = newValue
  }

  return {
    state,
    derivedValue,
    updateState
  }
}
```

## Cross-Platform Development

AIaW supports multiple platforms:

### Web (PWA)

- Use responsive design principles
- Use Quasar's responsive utilities (`$q.screen`)
- Test on different screen sizes

### Desktop (Tauri)

- Import Tauri API from `@tauri-apps/api`
- Use conditional imports for platform-specific code
- Use feature detection for platform capabilities

### Mobile (Capacitor)

- Use Capacitor plugins for native functionality
- Test on both Android and iOS
- Be mindful of touch interactions and screen sizes

## Testing

AIaW uses Jest for testing:

### Component Tests

```typescript
import { mount } from '@vue/test-utils'
import MyComponent from '../MyComponent.vue'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: {
        propName: 'test'
      }
    })

    expect(wrapper.text()).toContain('test')
  })

  it('emits update event when button is clicked', async () => {
    const wrapper = mount(MyComponent)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update')).toBeTruthy()
  })
})
```

### Unit Tests

```typescript
import { someUtility } from '../utils'

describe('someUtility', () => {
  it('returns expected result', () => {
    expect(someUtility('input')).toBe('expected result')
  })
})
```

## Internationalization

AIaW supports multiple languages using Vue-i18n:

### Translation Files

Organize translations by feature:

```typescript
// i18n/en-US/feature-name.ts
export default {
  title: 'Feature Title',
  actions: {
    save: 'Save',
    cancel: 'Cancel'
  },
  messages: {
    success: 'Operation completed successfully',
    error: 'An error occurred'
  }
}
```

### Usage in Components

```vue
<template>
  <div>
    <h1>{{ $t('feature-name.title') }}</h1>
    <q-btn>{{ $t('feature-name.actions.save') }}</q-btn>
  </div>
</template>
```

## Documentation

### Code Documentation

- Use JSDoc comments for public APIs and complex functions
- Document props, emits, and return values

```typescript
/**
 * Performs a specific action with the given input
 * @param {string} input - The input string to process
 * @returns {string} The processed result
 */
function processInput(input: string): string {
  // Implementation
}
```

### Component Documentation

- Use Storybook for component documentation
- Include examples and variants

```typescript
// MyComponent.stories.ts
import MyComponent from './MyComponent.vue'

export default {
  title: 'Components/MyComponent',
  component: MyComponent,
  argTypes: {
    propName: { control: 'text' }
  }
}

export const Default = {
  args: {
    propName: 'Default value'
  }
}

export const Variant = {
  args: {
    propName: 'Variant value'
  }
}
```

## Best Practices

1. **Performance**
   - Use `v-memo` for expensive renders
   - Memoize expensive computations
   - Lazy load components and routes
   - **Function optimization**: Break down complex functions to improve performance and caching

2. **Security**
   - Never expose API keys in client-side code
   - Validate all user inputs
   - Use HTTPS for all external requests

3. **Accessibility**
   - Use semantic HTML elements
   - Ensure proper keyboard navigation
   - Provide ARIA attributes when needed

4. **Error Handling**
   - Use try/catch blocks for async operations
   - Provide user-friendly error messages
   - Log errors for debugging
   - **Centralized error handling**: Use consistent error handling patterns across similar functions

5. **Code Organization**
   - Keep components focused and small
   - Extract complex logic to composables
   - Use TypeScript interfaces for complex data structures
   - **Follow consolidation guidelines**: Regularly review and consolidate duplicate components
   - **Apply refactoring principles**: Continuously improve code structure and maintainability

6. **Maintainability**
   - **Regular refactoring**: Schedule regular code reviews to identify refactoring opportunities
   - **Documentation**: Maintain up-to-date JSDoc comments for complex functions
   - **Consistent patterns**: Follow established parameter and naming conventions
   - **Testing**: Write tests for refactored components to ensure behavior consistency

## Refactoring Checklist

When refactoring code, use this checklist:

### Component Consolidation
- [ ] Identify duplicate or similar components
- [ ] Choose the canonical version to keep
- [ ] Update all imports to use absolute paths
- [ ] Test functionality after consolidation
- [ ] Remove duplicate files
- [ ] Update related documentation

### Function Refactoring
- [ ] Identify functions with high complexity (50+ lines, deep nesting)
- [ ] Break down into smaller, focused helper functions
- [ ] Maintain clear data flow between functions
- [ ] Add comprehensive JSDoc documentation
- [ ] Verify all functionality still works
- [ ] Update tests to cover new function structure

### Parameter Standardization
- [ ] Review function parameter orders
- [ ] Standardize parameter naming conventions
- [ ] Update functions to use consistent patterns
- [ ] Add TypeScript types for all parameters
- [ ] Update function calls throughout codebase

### Store Standardization
- [ ] Review store file naming and structure
- [ ] Standardize store IDs and export names
- [ ] Ensure proper re-exports through index files
- [ ] Update imports throughout the application
- [ ] Verify store functionality after changes

## Conclusion

By following this development guide, we can maintain a consistent, high-quality codebase that is easy to understand and extend. The feature-based architecture allows for scalability while keeping related code together, making it easier to reason about and maintain.

For any questions or clarifications, refer to the team leads or open a discussion in the project repository.