<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="."
  >
    <q-toolbar-title>
      {{ $t("shortcutKeysView.keyboardShortcuts") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container>
    <q-page :style-fn="pageFhStyle">
      <q-list
        py-2
        max-w="1000px"
        mx-a
      >
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.enableKeyboardShortcuts") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <platform-enabled-input
              v-model="perfs.enableShortcutKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item-label header>
          {{ $t("shortcutKeysView.dialogPage") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.scrollUp") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.scrollUpKeyV2"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.scrollDown") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.scrollDownKeyV2"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.scrollToTop") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.scrollTopKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.scrollToBottom") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.scrollBottomKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.switchToPreviousThread") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.switchPrevKeyV2"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.switchToNextThread") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.switchNextKeyV2"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.switchToFirstThread") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.switchFirstKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.switchToLastThread") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.switchLastKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.regenerateAssistantMessage") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.regenerateCurrKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.editUserMessage") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.editCurrKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.focusInputBox") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.focusDialogInputKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item-label header>
          {{ $t("shortcutKeysView.dialogList") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.createDialog") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.createDialogKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>

        <q-separator spaced />
        <q-item-label header>
          {{ $t("shortcutKeysView.editArtifacts") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("shortcutKeysView.saveArtifact") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <shortcut-key-input
              v-model="perfs.saveArtifactKey"
              v-bind="inputProps"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import ShortcutKeyInput from "@/shared/components/ui/ShortcutKeyInput.vue"
import { useUserPerfsStore } from "@/shared/store/userPerfs"
import { pageFhStyle } from "@/shared/utils/functions"

import PlatformEnabledInput from "@/features/providers/components/PlatformEnabledInput.vue"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

const { data: perfs } = useUserPerfsStore()

defineEmits(["toggle-drawer"])

const inputProps = {
  dense: true,
  filled: true,
  class: "min-w-150px",
}
</script>
