<template>
  <div v-if="route.hash === '#ai'">
    <settings-list>
      <q-item-label
        header
        id="default-provider"
      >
        {{ $t("settingsView.defaultProviderHeader") }}
      </q-item-label>
      <provider-input-items v-model="perfs.provider" />
      <q-item-label
        caption
        p="x-4 y-2"
        text-on-sur-var
        v-if="!perfs.provider"
      >
        {{ $t("settingsView.noProviderConfigured") }}
        <router-link
          pri-link
          to="/account"
        >
          {{ $t("settingsView.accountPage") }}
        </router-link>
        {{ $t("settingsView.pageSuffix") }}
      </q-item-label>

      <model-input-items
        v-model="perfs.model"
        :provider-models="providerModels"
      />
      <q-item>
        <q-item-section>
          <q-item-label>
            {{ $t("settingsView.commonModels") }}
          </q-item-label>
        <!-- <q-item-label caption>
              {{ $t("settingsView.commonModelsCaption") }}<br>
              <get-model-list
                :provider
                v-model="providerModels"
              />
              <a
                href="javascript:void(0)"
                @click="sortModels"
                pri-link
              >
                {{ $t("settingsView.sort") }}
              </a>
            </q-item-label> -->
        </q-item-section>
        <q-item-section side>
          <models-input
            class="xs:w-250px md:w-400px"
            v-model="providerModels"
            filled
            dense
          />
        </q-item-section>
      </q-item>
    </settings-list>
    <settings-list>
      <q-item-label
        header
        id="system-assistant"
      >
        {{ $t("settingsView.systemAssistantHeader") }}
      </q-item-label>
      <q-item-label
        caption
        p="x-4"
        text-on-sur-var
      >
        {{ $t("settingsView.systemAssistantCaption") }}
      </q-item-label>
      <provider-input-items v-model="perfs.systemProvider" />
      <model-input-items
        v-model="perfs.systemModel"
        :provider-models="providerModels"
      />
    </settings-list>
  </div>
  <settings-list
    v-if="route.hash === '#features'"
  >
    <q-item-label
      header
      id="feature"
    >
      {{ $t("settingsView.featureHeader") }}
    </q-item-label>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.autoSummarizeTitle") }}
        </q-item-label>
        <q-item-label caption>
          {{ $t("settingsView.autoSummarizeCaption") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="perfs.autoGenTitle" />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.messageSelectionMenu") }}
        </q-item-label>
        <q-item-label caption>
          {{ $t("settingsView.messageSelectionCaption") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="perfs.messageSelectionBtn" />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.codePasteOptimize") }}
        </q-item-label>
        <q-item-label caption>
          {{ $t("settingsView.codePasteCaption") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="perfs.codePasteOptimize" />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.quickScrollButton") }}
        </q-item-label>
        <q-item-label caption>
          {{ $t("settingsView.quickScrollCaption") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <platform-enabled-input
          v-model="perfs.dialogScrollBtn"
          class="min-w-120px"
          dense
          filled
        />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.autoFocusInput") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <platform-enabled-input
          v-model="perfs.autoFocusDialogInput"
          class="min-w-120px"
          dense
          filled
        />
      </q-item-section>
    </q-item>
    <q-item-label
      header
      id="operation"
    >
      {{ $t("settingsView.operationHeader") }}
    </q-item-label>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.autoLockBottom") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="perfs.streamingLockBottom" />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.messageContentCatalog") }}
        </q-item-label>
        <q-item-label caption>
          {{ $t("settingsView.messageContentCatalogCaption") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="perfs.messageCatalog" />
      </q-item-section>
    </q-item>
    <q-expansion-item :label="$t('settingsView.artifactsSettings')">
      <q-item>
        <q-item-section>
          <q-item-label>
            {{ $t("settingsView.enableArtifacts") }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <platform-enabled-input
            v-model="perfs.artifactsEnabled"
            class="min-w-120px"
            dense
            filled
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>
            {{ $t("settingsView.autoExtractArtifact") }}
          </q-item-label>
          <q-item-label caption>
            {{ $t("settingsView.autoExtractArtifactCaption") }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-toggle v-model="perfs.artifactsAutoExtract" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          {{ $t("settingsView.reserveOriginalArtifact") }}
        </q-item-section>
        <q-item-section side>
          <q-toggle v-model="perfs.artifactsReserveOriginal" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          {{ $t("settingsView.autoNameArtifact") }}
        </q-item-section>
        <q-item-section side>
          <q-toggle v-model="perfs.artifactsAutoName" />
        </q-item-section>
      </q-item>
    </q-expansion-item>
  </settings-list>
  <div
    v-if="route.hash === '#shortkeys'"
  >
    <settings-list>
      <q-item>
        <q-item-section>
          {{ $t("settingsView.sendKeyShortcut") }}
        </q-item-section>
        <q-item-section side>
          <q-select
            class="w-150px"
            v-model="perfs.sendKey"
            :options="[
              { label: 'Ctrl + Enter', value: 'ctrl+enter' },
              { label: 'Shift + Enter', value: 'shift+enter' },
              { label: 'Enter', value: 'enter' },
            ]"
            filled
            dense
            emit-value
            map-options
          />
        </q-item-section>
      </q-item>
    </settings-list>
    <settings-list>
      <shortcut-keys />
    </settings-list>
  </div>
  <settings-list
    v-if="route.hash === '#ui'"
  >
    <q-item>
      <q-item-section avatar>
        <q-icon name="sym_o_dark_mode" />
      </q-item-section>
      <q-item-section>{{ $t("settingsView.appearance") }}</q-item-section>
      <q-item-section side>
        <q-select
          class="min-w-120px"
          filled
          dense
          :options="darkModeOptions"
          v-model="perfs.darkMode"
          emit-value
          map-options
        />
      </q-item-section>
    </q-item>
    <q-item
      clickable
      v-ripple
      @click="pickThemeHue"
    >
      <q-item-section avatar>
        <q-icon name="sym_o_palette" />
      </q-item-section>
      <q-item-section>{{ $t("settingsView.themeColor") }}</q-item-section>
      <q-item-section side>
        <hct-preview-circle
          :hue="perfs.themeHue"
          :size="40"
        />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section avatar>
        <q-icon name="sym_o_report" />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          {{ $t("settingsView.showWarnings") }}
        </q-item-label>
        <q-item-label caption>
          {{ $t("settingsView.showWarningsCaption") }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-toggle v-model="perfs.showWarnings" />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section avatar>
        <q-icon name="sym_o_language" />
      </q-item-section>
      <q-item-section>{{ $t("settingsView.language") }}</q-item-section>
      <q-item-section side>
        <q-select
          filled
          dense
          :options="langOptions"
          v-model="localData.language"
          emit-value
          map-options
          class="w-120px"
        />
      </q-item-section>
    </q-item>
    <q-expansion-item
      :label="$t('settingsView.markdownRendering')"
      icon="sym_o_markdown"
      :content-inset-level="1"
    >
      <q-item>
        <q-item-section>
          <q-item-label>
            {{ $t("settingsView.theme") }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-select
            :options="mdPreviewThemes"
            v-model="perfs.mdPreviewTheme"
            dense
            filled
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          {{ $t("settingsView.codeTheme") }}
        </q-item-section>
        <q-item-section side>
          <q-select
            :options="mdCodeThemes"
            v-model="perfs.mdCodeTheme"
            dense
            filled
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          {{ $t("settingsView.disableMermaid") }}
        </q-item-section>
        <q-item-section side>
          <q-toggle v-model="perfs.mdNoMermaid" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>
            {{ $t("settingsView.codeAutoFoldThreshold") }}
          </q-item-label>
          <q-item-label caption>
            {{ $t("settingsView.codeAutoFoldThresholdCaption") }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <a-input
            type="number"
            v-model.number="perfs.mdAutoFoldThreshold"
            dense
            filled
            class="w-120px"
            clearable
          />
        </q-item-section>
      </q-item>
    </q-expansion-item>
    <!-- <q-separator spaced />
    <q-item-label
      header
      id="ui"
    >
      {{ $t("settingsView.dataHeader") }}
    </q-item-label>
    <q-item
      clickable
      v-ripple
      @click="restoreSettings"
    >
      <q-item-section avatar>
        <q-icon name="sym_o_restore" />
      </q-item-section>
      <q-item-section>
        {{ $t("settingsView.restoreDefaultSettings") }}
      </q-item-section>
      <q-item-section side>
        <q-icon name="sym_o_chevron_right" />
      </q-item-section>
    </q-item> -->
  </settings-list>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import HueSliderDialog from "@/shared/components/dialogs/HueSliderDialog.vue"
import HctPreviewCircle from "@/shared/components/HctPreviewCircle.vue"
import SettingsList from "@/shared/components/panels/SettingsList.vue"
import ShortcutKeys from "@/shared/components/panels/ShortcutKeys.vue"
import { useLocateId } from "@/shared/composables/locateId"
import { useUserPrefsStore } from "@/shared/store/userPrefs"
import { localData } from "@/shared/utils/localData"
import { mdCodeThemes, mdPreviewThemes, models } from "@/shared/utils/values"

// import ModelDragSortDialog from "@/features/providers/components/ModelDragSortDialog.vue"
import ModelInputItems from "@/features/providers/components/ModelInputItems.vue"
import ModelsInput from "@/features/providers/components/ModelsInput.vue"
import PlatformEnabledInput from "@/features/providers/components/PlatformEnabledInput.vue"
import ProviderInputItems from "@/features/providers/components/ProviderInputItems.vue"
import { useProvidersStore } from "@/features/providers/store"
defineEmits(["toggle-drawer"])

const { t } = useI18n()

// const { restore } = useUserPrefsStore()
const { data: perfs } = storeToRefs(useUserPrefsStore())
const providersStore = useProvidersStore()
const route = useRoute()

const darkModeOptions = [
  { label: t("settingsView.followSystem"), value: "auto" },
  { label: t("settingsView.light"), value: false },
  { label: t("settingsView.dark"), value: true },
]
const providerModels = ref([])
watch(() => perfs.value.provider, (provider) => {
  if (provider) {
    providersStore.getModelList(provider).then((modelsAvailable) => {
      providerModels.value = modelsAvailable.length > 0 ? modelsAvailable : models.map((m) => m.name)
    }).catch(() => {
      $q.notify({
        message: "Invalid provider or API key",
        color: "negative",
      })
      providerModels.value = []
    })
  }
}, { immediate: true })

const $q = useQuasar()

function pickThemeHue () {
  $q.dialog({
    component: HueSliderDialog,
    componentProps: { value: perfs.value.themeHue },
  }).onOk((hue) => {
    perfs.value.themeHue = hue
  })
}

// function restoreSettings () {
//   $q.dialog({
//     title: t("settingsView.restoreDefaultSettings"),
//     message: t("settingsView.restoreSettingsConfirmation"),
//     cancel: true,
//     ...dialogOptions,
//   }).onOk(() => {
//     restore()
//   })
// }

// const { getProvider } = useGetModel()
// const provider = computed(() => getProvider())

const langOptions = [
  { label: t("settingsView.auto"), value: null },
  { label: "English", value: "en-US" },
]

// function sortModels () {
//   const models = perfs.value.commonModelOptions
//   $q.dialog({
//     component: ModelDragSortDialog,
//     componentProps: { models },
//     persistent: true,
//     ...dialogOptions,
//   }).onOk((sortedModels) => {
//     perfs.value.commonModelOptions = sortedModels
//   })
// }

useLocateId(ref(true))

// const showPinModal = ref(false)
// const walletInfo = ref(authStore.walletInfo)
// const handlePinSubmit = async (pin: string) => {
//   walletInfo.value = await authStore.createGranteeWallet(pin)
//   showPinModal.value = false
// }

</script>
