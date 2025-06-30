import { useQuasar } from "quasar"
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"

export interface DataListManagerOptions<T = any> {
  /** Function to fetch all data items */
  fetchItems: () => Promise<T[]>
  /** Function to create a new item */
  createItem?: (item: Partial<T>) => Promise<T>
  /** Function to delete an item */
  deleteItem?: (item: T) => Promise<void>
  /** Function to update an item */
  updateItem?: (item: T, changes: Partial<T>) => Promise<T>
  /** Function to handle custom actions */
  handleAction?: (actionKey: string, item: T) => Promise<void>
  /** Error message keys for i18n */
  errorMessages?: {
    fetch?: string
    create?: string
    delete?: string
    update?: string
    action?: string
  }
  /** Success message keys for i18n */
  successMessages?: {
    create?: string
    delete?: string
    update?: string
    action?: string
  }
}

/**
 * Generic composable for managing data lists with CRUD operations
 * Provides loading states, error handling, and operation feedback
 */
export function useDataListManager<T = any>(options: DataListManagerOptions<T>) {
  const { t } = useI18n()
  const $q = useQuasar()

  // State
  const items = ref([] as T[])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasItems = computed(() => items.value.length > 0)
  const isEmpty = computed(() => !loading.value && !hasItems.value)

  // Methods
  async function fetchItems() {
    if (!options.fetchItems) {
      console.warn('fetchItems function not provided')

      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await options.fetchItems()
      items.value = result
    } catch (err) {
      const errorMessage = options.errorMessages?.fetch || 'common.errorFetching'
      error.value = t(errorMessage)
      console.error('Failed to fetch items:', err)

      $q.notify({
        type: 'negative',
        message: error.value
      })
    } finally {
      loading.value = false
    }
  }

  async function createItem(itemData: Partial<T>) {
    if (!options.createItem) {
      console.warn('createItem function not provided')

      return null
    }

    try {
      const newItem = await options.createItem(itemData)
      ;(items.value as any[]).push(newItem)

      if (options.successMessages?.create) {
        $q.notify({
          type: 'positive',
          message: t(options.successMessages.create)
        })
      }

      return newItem
    } catch (err) {
      const errorMessage = options.errorMessages?.create || 'common.errorCreating'
      console.error('Failed to create item:', err)

      $q.notify({
        type: 'negative',
        message: t(errorMessage)
      })

      return null
    }
  }

  async function deleteItem(item: T) {
    if (!options.deleteItem) {
      console.warn('deleteItem function not provided')

      return false
    }

    try {
      await options.deleteItem(item)
      const index = (items.value as any[]).indexOf(item)

      if (index !== -1) {
        items.value.splice(index, 1)
      }

      if (options.successMessages?.delete) {
        $q.notify({
          type: 'positive',
          message: t(options.successMessages.delete)
        })
      }

      return true
    } catch (err) {
      const errorMessage = options.errorMessages?.delete || 'common.errorDeleting'
      console.error('Failed to delete item:', err)

      $q.notify({
        type: 'negative',
        message: t(errorMessage)
      })

      return false
    }
  }

  async function updateItem(item: T, changes: Partial<T>) {
    if (!options.updateItem) {
      console.warn('updateItem function not provided')

      return null
    }

    try {
      const updatedItem = await options.updateItem(item, changes)
      const index = (items.value as any[]).indexOf(item)

      if (index !== -1) {
        ;(items.value as any[])[index] = updatedItem
      }

      if (options.successMessages?.update) {
        $q.notify({
          type: 'positive',
          message: t(options.successMessages.update)
        })
      }

      return updatedItem
    } catch (err) {
      const errorMessage = options.errorMessages?.update || 'common.errorUpdating'
      console.error('Failed to update item:', err)

      $q.notify({
        type: 'negative',
        message: t(errorMessage)
      })

      return null
    }
  }

  async function handleAction(actionKey: string, item: T) {
    if (!options.handleAction) {
      console.warn('handleAction function not provided')

      return false
    }

    try {
      await options.handleAction(actionKey, item)

      if (options.successMessages?.action) {
        $q.notify({
          type: 'positive',
          message: t(options.successMessages.action)
        })
      }

      return true
    } catch (err) {
      const errorMessage = options.errorMessages?.action || 'common.errorProcessing'
      console.error('Failed to handle action:', err)

      $q.notify({
        type: 'negative',
        message: t(errorMessage)
      })

      return false
    }
  }

  return {
    // State
    items,
    loading,
    error,

    // Computed
    hasItems,
    isEmpty,

    // Methods
    fetchItems,
    createItem,
    deleteItem,
    updateItem,
    handleAction
  }
}
