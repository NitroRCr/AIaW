<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("assistantView.header") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container
    v-if="assistant"
    bg-sur-c-low
  >
    <q-page
      pb-2
      bg-sur
      :class="{ 'rd-rt-lg': rightDrawerAbove }"
      :style-fn="pageFhStyle"
    >
      <q-list>
        <a-tip
          tip-key="assistant-effect-scope"
          rd-0
        >
          {{ $t("assistantView.effectScopeTip") }}
          <router-link
            to="/settings"
            pri-link
          >
            {{ $t("assistantView.settingsPage") }}
          </router-link>
        </a-tip>
        <q-item-label
          header
          id="assistant"
        >
          {{ $t("assistantView.assistant") }}
        </q-item-label>
        <q-item>
          <q-item-section>{{ $t("assistantView.name") }}</q-item-section>
          <q-item-section side>
            <a-input
              class="w-150px"
              filled
              dense
              v-model="assistant.name"
            />
          </q-item-section>
        </q-item>
        <q-item
          clickable
          @click="pickAvatar"
        >
          <q-item-section>{{ $t("assistantView.avatar") }}</q-item-section>
          <q-item-section side>
            <a-avatar :avatar="assistant.avatar" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            {{ $t("assistantView.roleSetting") }}
          </q-item-section>
          <q-item-section>
            <a-input
              filled
              v-model="assistant.prompt"
              autogrow
              clearable
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            {{ $t("assistantView.promptTemplate") }}
          </q-item-section>
          <q-item-section>
            <a-input
              filled
              v-model="assistant.promptTemplate"
              autogrow
              clearable
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            {{ $t("assistantView.promptVars") }}
          </q-item-section>
          <q-item-section>
            <prompt-var-editor
              ml-2
              v-model="assistant.promptVars"
            />
          </q-item-section>
        </q-item>
        <q-item-label
          caption
          p="x-4 y-2"
          text-on-sur-var
        >
          {{ $t("assistantView.promptVarsGuide1") }}
          <a
            href="https://docs.aiaw.app/usage/prompt-vars.html"
            target="_blank"
            pri-link
          >{{ $t("assistantView.promptVarsGuide2") }}</a>
        </q-item-label>
        <q-separator spaced />
        <q-item-label
          header
          id="model"
        >
          {{ $t("assistantView.model") }}
        </q-item-label>
        <model-input-items v-model="assistant.model" />
        <q-item-label
          caption
          p="x-4 y-2"
          text-on-sur-var
        >
          {{ $t("assistantView.modelEmptyTip") }}
        </q-item-label>
        <q-separator spaced />
        <q-item-label
          header
          id="provider"
        >
          {{ $t("assistantView.provider") }}
        </q-item-label>
        <provider-input-items v-model="assistant.provider" />
        <q-item-label
          caption
          p="x-4 y-2"
          text-on-sur-var
        >
          {{ $t("assistantView.providerEmptyTip") }}
        </q-item-label>
        <q-separator spaced />
        <q-item id="plugins">
          <q-item-section text-sec>
            {{ $t("assistantView.plugins") }}
          </q-item-section>
          <q-item-section side>
            {{ $t("assistantView.enable") }}
          </q-item-section>
        </q-item>
        <enable-plugins-items :assistant-id="assistant.id" />
        <q-separator spaced />
        <q-item-label
          header
          id="generate-settings"
        >
          {{ $t("assistantView.generateSettings") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.stream") }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="assistant.stream" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.maxRetries") }}</q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.maxRetriesTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.maxRetries"
              type="number"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.maxSteps") }}</q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.maxStepsTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.maxSteps"
              type="number"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.contextNum") }}</q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.contextNumTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.contextNum"
              type="number"
              clearable
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.promptRole") }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-select
              class="w-100px"
              filled
              dense
              v-model="assistant.promptRole"
              :options="['system', 'user', 'assistant']"
            />
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item-label
          header
          id="model-params"
        >
          {{ $t("assistantView.modelParams") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.temperature") }}<code>temperature</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.temperatureTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.temperature"
              type="number"
              step="0.1"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.topP") }}<code>topP</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.topPTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.topP"
              type="number"
              step="0.1"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.presencePenalty")
              }}<code>presencePenalty</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.presencePenaltyTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.presencePenalty"
              type="number"
              step="0.1"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.frequencyPenalty")
              }}<code>frequencyPenalty</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.frequencyPenaltyTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.frequencyPenalty"
              type="number"
              step="0.1"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.stopSequences") }}<code>stopSequences</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.stopSequencesTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-select
              class="w-150px"
              filled
              dense
              v-model="assistant.modelSettings.stopSequences"
              use-input
              use-chips
              multiple
              hide-dropdown-icon
              input-debounce="0"
              new-value-mode="add-unique"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.maxTokens") }}<code>maxTokens</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.maxTokensTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-150px"
              filled
              dense
              v-model.number="assistant.modelSettings.maxTokens"
              type="number"
              clearable
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ $t("assistantView.seed") }}<code>seed</code>
            </q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.seedTip") }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-100px"
              filled
              dense
              v-model.number="assistant.modelSettings.seed"
              type="number"
              clearable
            />
          </q-item-section>
        </q-item>
        <q-item-label
          caption
          p="x-4 y-2"
          text-on-sur-var
        >
          {{ $t("assistantView.notAllParamsSupported") }}
        </q-item-label>
        <q-separator spaced />
        <q-item-label
          header
          id="model-params"
        >
          {{ $t("assistantView.metadata") }}
        </q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.author") }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="w-150px"
              filled
              dense
              v-model="assistant.author"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.description") }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="xs:w-250px sm:w-400px"
              filled
              dense
              autogrow
              v-model="assistant.description"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.homepage") }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <a-input
              class="xs:w-250px sm:w-400px"
              filled
              dense
              v-model="assistant.homepage"
            />
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t("assistantView.export") }}</q-item-label>
            <q-item-label caption>
              {{ $t("assistantView.exportTip1")
              }}<a
                href="https://docs.aiaw.app/usage/assistants.html#分享助手"
                target="_blank"
                pri-link
              >{{ $t("assistantView.exportTip2") }}</a>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              :label="$t('assistantView.export')"
              bg-pri-c
              text-on-pri-c
            >
              <q-menu>
                <q-item
                  clickable
                  v-close-popup
                  @click="exportAssistant('file')"
                >
                  <q-item-section>
                    {{ $t("assistantView.exportToFile") }}
                  </q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="exportAssistant('clipboard')"
                >
                  <q-item-section>
                    {{ $t("assistantView.exportToClipboard") }}
                  </q-item-section>
                </q-item>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from "quasar"
import { computed, inject, toRaw } from "vue"

import ATip from "@/shared/components/ATip.vue"
import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import { useLocateId } from "@/shared/composables/locateId"
import { useSetTitle } from "@/shared/composables/setTitle"
import { getAvatarUrl } from "@/shared/composables/storage/utils"
import { syncRef } from "@/shared/composables/syncRef"
import { pageFhStyle } from "@/shared/utils/functions"
import { exportFile } from "@/shared/utils/platformApi"

import { useAssistantsStore } from "@/features/assistants/store"
import EnablePluginsItems from "@/features/plugins/components/EnablePluginsItems.vue"
import PromptVarEditor from "@/features/prompt/components/PromptVarEditor.vue"
import ModelInputItems from "@/features/providers/components/ModelInputItems.vue"
import ProviderInputItems from "@/features/providers/components/ProviderInputItems.vue"

import { Assistant } from "@/services/data/types/assistant"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
import ErrorNotFound from "@/pages/ErrorNotFound.vue"

const props = defineProps<{
  id: string
}>()

defineEmits(["toggle-drawer"])

const store = useAssistantsStore()
const assistant = syncRef<Assistant>(
  () => store.assistants.find((a) => a.id === props.id),
  (val) => {
    store.put(toRaw(val))
  },
  { valueDeep: true }
)

const $q = useQuasar()

function pickAvatar () {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: assistant.value.avatar,
      defaultTab: "ai",
    },
  }).onOk((avatar) => {
    assistant.value.avatar = avatar
  })
}

const rightDrawerAbove = inject("rightDrawerAbove")
useLocateId(assistant)

useSetTitle(computed(() => assistant.value?.name))

async function exportAssistant (target: "file" | "clipboard") {
  let { avatar } = assistant.value

  if (avatar.type === "image") {
    avatar = { type: "url", url: getAvatarUrl(avatar.imageId) }
  }

  const {
    name,
    prompt,
    promptVars,
    promptTemplate,
    model,
    modelSettings,
    author,
    homepage,
    description,
  } = assistant.value
  const json = JSON.stringify({
    name,
    avatar,
    prompt,
    promptVars,
    promptTemplate,
    model,
    modelSettings,
    author,
    homepage,
    description,
  })

  if (target === "file") {
    exportFile(`${name}.json`, json)
  } else {
    copyToClipboard(json)
  }
}
</script>
