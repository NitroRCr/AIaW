<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
    <q-toolbar>
      <q-btn
        flat
        dense
        round
        icon="sym_o_arrow_back"
        @click="back"
      />
      <q-toolbar-title>
        键盘快捷键
      </q-toolbar-title>
    </q-toolbar>
  </q-header>
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
              启用键盘快捷键
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
          对话页面
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              向上滚动
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
              向下滚动
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
              滚动到顶部
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
              滚动到底部
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
              切换到前一条消息链
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
              切换到后一条消息链
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
              切换到第一条消息链
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
              切换到最后一条消息链
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
              重新生成助手消息
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
              编辑用户消息
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
              聚焦输入框
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
          对话列表
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              新建对话
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
          编辑 Artifacts
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              保存 Artifact
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
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { pageFhStyle } from 'src/utils/functions'
import { useBack } from 'src/composables/back'
import ShortcutKeyInput from 'src/components/ShortcutKeyInput.vue'
import PlatformEnabledInput from 'src/components/PlatformEnabledInput.vue'

const { perfs } = useUserPerfsStore()

const back = useBack('/settings')

const inputProps = {
  dense: true,
  filled: true,
  class: 'min-w-150px'
}
</script>
