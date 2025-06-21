import { MdPreviewProps } from "md-editor-v3"
import { Dark } from "quasar"
import { watchEffect } from "vue"

import {
  Avatar,
  Model,
  PlatformEnabled,
  Provider,
  ShortcutKey,
} from "@/shared/types"
import { models } from "@/shared/utils/values"

import { createKeyValueDbStore } from "./utils/createKeyValueDbStore"

interface Prefs {
  darkMode: boolean | "auto"
  themeHue: number
  provider: Provider
  model: Model
  systemProvider: Provider
  systemModel: Model
  userAvatar: Avatar
  // commonModelOptions: string[]
  autoGenTitle: boolean
  sendKey: "ctrl+enter" | "shift+enter" | "enter"
  messageSelectionBtn: boolean
  codePasteOptimize: boolean
  dialogScrollBtn: PlatformEnabled
  enableShortcutKey: PlatformEnabled
  scrollUpKeyV2?: ShortcutKey
  scrollDownKeyV2?: ShortcutKey
  scrollTopKey?: ShortcutKey
  scrollBottomKey?: ShortcutKey
  switchPrevKeyV2?: ShortcutKey
  switchNextKeyV2?: ShortcutKey
  switchFirstKey?: ShortcutKey
  switchLastKey?: ShortcutKey
  regenerateCurrKey?: ShortcutKey
  editCurrKey?: ShortcutKey
  createDialogKey?: ShortcutKey
  createSocialKey?: ShortcutKey
  focusDialogInputKey?: ShortcutKey
  saveArtifactKey?: ShortcutKey
  searchDialogKey?: ShortcutKey
  searchChatsKey?: ShortcutKey
  autoFocusDialogInput: PlatformEnabled
  artifactsEnabled: PlatformEnabled
  artifactsAutoExtract: boolean
  artifactsAutoName: boolean
  artifactsReserveOriginal: boolean
  mdPreviewTheme: MdPreviewProps["previewTheme"]
  mdCodeTheme: MdPreviewProps["codeTheme"]
  mdNoMermaid: MdPreviewProps["noMermaid"]
  mdAutoFoldThreshold?: MdPreviewProps["autoFoldThreshold"]
  streamingLockBottom: boolean
  messageCatalog: boolean
  showWarnings: boolean
}

const defaultPrefs: Prefs = {
  darkMode: "auto",
  themeHue: 300,
  provider: null,
  model: models.find((m) => m.name === "gpt-4.1"),
  systemProvider: null,
  systemModel: models.find((m) => m.name === "gpt-4o-mini"),
  userAvatar: {
    type: "text",
    text: "U",
    hue: 300,
  },
  // commonModelOptions: [
  //   "gpt-4.1",
  //   "gpt-4.1-mini",
  //   "o4-mini",
  //   "claude-3-7-sonnet-20250219",
  //   "claude-3-5-sonnet-20241022",
  //   "gemini-1.5-pro",
  //   "gemini-2.0-flash",
  //   "deepseek-chat",
  //   "deepseek-reasoner",
  // ],
  autoGenTitle: true,
  sendKey: "enter",
  messageSelectionBtn: true,
  codePasteOptimize: true,
  dialogScrollBtn: "always",
  enableShortcutKey: "desktop-only",
  scrollUpKeyV2: { key: "ArrowUp", withCtrl: true },
  scrollDownKeyV2: { key: "ArrowDown", withCtrl: true },
  scrollTopKey: { key: "ArrowUp", withShift: true },
  scrollBottomKey: { key: "ArrowDown", withShift: true },
  switchPrevKeyV2: { key: "ArrowLeft", withCtrl: true },
  switchNextKeyV2: { key: "ArrowRight", withCtrl: true },
  switchFirstKey: { key: "ArrowLeft", withShift: true },
  switchLastKey: { key: "ArrowRight", withShift: true },
  regenerateCurrKey: null,
  editCurrKey: null,
  createDialogKey: null,
  createSocialKey: null,
  focusDialogInputKey: null,
  saveArtifactKey: { key: "KeyS", withCtrl: true },
  searchDialogKey: null,
  searchChatsKey: null,
  autoFocusDialogInput: "desktop-only",
  artifactsEnabled: "desktop-only",
  artifactsAutoExtract: false,
  artifactsAutoName: false,
  artifactsReserveOriginal: false,
  mdPreviewTheme: "vuepress",
  mdCodeTheme: "atom",
  mdNoMermaid: false,
  mdAutoFoldThreshold: null,
  streamingLockBottom: true,
  messageCatalog: true,
  showWarnings: false,
}

export const useUserPrefsStore = () => {
  const store = createKeyValueDbStore<Prefs>("user-prefs", defaultPrefs)()

  watchEffect(() => {
    Dark.set(store.data.darkMode)
  })

  return store
}
