<template>
  <settings-list>
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
  </settings-list>
  <settings-list>
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
  </settings-list>
</template>

<script setup lang="ts">
import SettingsList from "@/shared/components/panels/SettingsList.vue"
import ShortcutKeyInput from "@/shared/components/ShortcutKeyInput.vue"
import { useUserPrefsStore } from "@/shared/store/userPrefs"

import PlatformEnabledInput from "@/features/providers/components/PlatformEnabledInput.vue"

const { data: perfs } = useUserPrefsStore()

defineEmits(["toggle-drawer"])

const inputProps = {
  dense: true,
  filled: true,
  class: "min-w-150px",
}
</script>
