import { onActivated, onDeactivated, onMounted, onUnmounted, Ref } from "vue"

import { ShortcutKey } from "@/shared/utils/types"

export function useListenKey (
  shortcutKey: Ref<ShortcutKey>,
  callback,
  prevent = true
) {
  const listener = (event) => {
    if (!shortcutKey.value) return

    const {
      key,
      withCtrl = false,
      withShift = false,
      withAlt = false,
    } = shortcutKey.value

    if (
      event.code === key &&
      event.ctrlKey === withCtrl &&
      event.shiftKey === withShift &&
      event.altKey === withAlt
    ) {
      callback()
      prevent && event.preventDefault()
    }
  }
  const addListener = () => {
    document.addEventListener("keydown", listener)
  }
  const rmListener = () => {
    document.removeEventListener("keydown", listener)
  }
  onMounted(addListener)
  onUnmounted(rmListener)
  onActivated(addListener)
  onDeactivated(rmListener)
}
