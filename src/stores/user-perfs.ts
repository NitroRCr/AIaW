import { MdPreviewProps } from 'md-editor-v3'
import { defineStore } from 'pinia'
import { Dark, extend } from 'quasar'
import { persistentReactive } from 'src/composables/persistent-reactive'
import { Avatar, Model, PlatformEnabled, Provider, ShortcutKey } from 'src/utils/types'
import { models } from 'src/utils/values'
import { watchEffect } from 'vue'

interface Perfs {
  darkMode: boolean | 'auto'
  themeHue: number
  provider: Provider
  model: Model
  systemProvider: Provider
  systemModel: Model
  userAvatar: Avatar
  commonModelOptions: string[]
  autoGenTitle: boolean
  sendKey: 'ctrl+enter' | 'shift+enter' | 'meta+enter' | 'enter'
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
  focusDialogInputKey?: ShortcutKey
  saveArtifactKey?: ShortcutKey
  searchDialogKey?: ShortcutKey
  autoFocusDialogInput: PlatformEnabled
  artifactsEnabled: PlatformEnabled
  artifactsAutoExtract: boolean
  artifactsAutoName: boolean
  artifactsReserveOriginal: boolean
  mdPreviewTheme: MdPreviewProps['previewTheme']
  mdCodeTheme: MdPreviewProps['codeTheme']
  mdNoMermaid: MdPreviewProps['noMermaid']
  mdAutoFoldThreshold?: MdPreviewProps['autoFoldThreshold']
  streamingLockBottom: boolean
  messageCatalog: boolean
  showWarnings: boolean
  userInputDebounce: number
  expandReasoningContent: boolean
}

export const useUserPerfsStore = defineStore('user-perfs', () => {
  const defaultPerfs: Perfs = {
    darkMode: 'auto',
    themeHue: 300,
    provider: null,
    model: models.find(m => m.name === 'gpt-5'),
    systemProvider: null,
    systemModel: models.find(m => m.name === 'gpt-5-nano'),
    userAvatar: {
      type: 'text',
      text: 'U',
      hue: 300
    },
    commonModelOptions: [
      'gpt-5.1',
      'gpt-5-mini',
      'o4-mini',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-1-20250805',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'deepseek-chat',
      'deepseek-reasoner'
    ],
    autoGenTitle: true,
    sendKey: 'ctrl+enter',
    messageSelectionBtn: true,
    codePasteOptimize: true,
    dialogScrollBtn: 'always',
    enableShortcutKey: 'desktop-only',
    scrollUpKeyV2: { key: 'ArrowUp', withCtrl: true },
    scrollDownKeyV2: { key: 'ArrowDown', withCtrl: true },
    scrollTopKey: { key: 'ArrowUp', withShift: true },
    scrollBottomKey: { key: 'ArrowDown', withShift: true },
    switchPrevKeyV2: { key: 'ArrowLeft', withCtrl: true },
    switchNextKeyV2: { key: 'ArrowRight', withCtrl: true },
    switchFirstKey: { key: 'ArrowLeft', withShift: true },
    switchLastKey: { key: 'ArrowRight', withShift: true },
    regenerateCurrKey: null,
    editCurrKey: null,
    createDialogKey: null,
    focusDialogInputKey: null,
    saveArtifactKey: { key: 'KeyS', withCtrl: true },
    searchDialogKey: null,
    autoFocusDialogInput: 'desktop-only',
    artifactsEnabled: 'desktop-only',
    artifactsAutoExtract: false,
    artifactsAutoName: false,
    artifactsReserveOriginal: false,
    mdPreviewTheme: 'vuepress',
    mdCodeTheme: 'atom',
    mdNoMermaid: false,
    mdAutoFoldThreshold: null,
    streamingLockBottom: true,
    messageCatalog: true,
    showWarnings: false,
    userInputDebounce: 30,
    expandReasoningContent: true
  }
  const [perfs, ready] = persistentReactive('#user-perfs', { ...defaultPerfs })
  watchEffect(() => {
    Dark.set(perfs.darkMode)
  })
  function restore() {
    Object.assign(perfs, extend(true, {}, defaultPerfs))
  }
  return { perfs, ready, restore }
})
