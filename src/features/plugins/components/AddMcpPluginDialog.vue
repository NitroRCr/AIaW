<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(90vw, 500px)">
      <a-tip
        tip-key="mcp-stdio-platform"
        v-if="!IsTauri"
      >
        {{ $t("addMcpPluginDialog.stdioPlatformTip") }}
      </a-tip>
      <q-card-section p-0>
        <q-tabs
          v-model="type"
          dense
          active-color="primary"
          indicator-color="primary"
          v-if="IsTauri"
        >
          <q-tab
            name="stdio"
            :label="$t('addMcpPluginDialog.stdio')"
          />
          <q-tab
            name="sse"
            :label="$t('addMcpPluginDialog.sse')"
          />
        </q-tabs>

        <q-separator />

        <q-tab-panels
          v-model="type"
          animated
        >
          <q-tab-panel
            name="stdio"
            p-0
          >
            <q-list mt-2>
              <q-item>
                <q-item-section>
                  <q-item-label>
                    {{ $t("addMcpPluginDialog.pluginName") }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t("addMcpPluginDialog.pluginNameCaption") }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <a-input
                    v-model="title"
                    dense
                    class="w-150px"
                  />
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>
                    {{ $t("addMcpPluginDialog.command") }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t("addMcpPluginDialog.commandCaption") }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <a-input
                    v-model="stdioOptions.command"
                    dense
                    class="w-200px"
                  />
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>
                    {{ $t("addMcpPluginDialog.workDir") }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t("addMcpPluginDialog.workDirCaption") }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <a-input
                    v-model="stdioOptions.cwd"
                    dense
                    class="w-200px"
                  />
                </q-item-section>
              </q-item>
              <q-separator spaced />
              <q-item-label
                header
                py-2
              >
                {{ $t("addMcpPluginDialog.envVars") }}
              </q-item-label>
              <vars-input
                v-model="stdioOptions.env"
                :input-props="{
                  dense: true,
                  clearale: true,
                  placeholder: $t('addMcpPluginDialog.inputVarsPlaceholder'),
                }"
              />
            </q-list>
          </q-tab-panel>

          <q-tab-panel
            name="sse"
            p-0
          >
            <q-list mt-2>
              <q-item>
                <q-item-section>
                  <q-item-label>
                    {{ $t("addMcpPluginDialog.pluginName") }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t("addMcpPluginDialog.pluginNameCaption") }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <a-input
                    v-model="title"
                    dense
                  />
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  {{ $t("addMcpPluginDialog.url") }}
                </q-item-section>
                <q-item-section side>
                  <a-input
                    v-model="sseOptions.url"
                    dense
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('addMcpPluginDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('addMcpPluginDialog.install')"
          :disable="!valid"
          :loading
          @click="add"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar"
import { computed, reactive, ref, toRaw } from "vue"
import { useI18n } from "vue-i18n"

import ATip from "@/shared/components/ATip.vue"
import { hash53 } from "@/shared/utils/functions"
import { IsTauri } from "@/shared/utils/platformApi"
import { McpPluginManifest } from "@/shared/utils/types"

import { useInstallPlugin } from "@/features/plugins/composables/installPlugin"
import VarsInput from "@/features/prompt/components/VarsInput.vue"

const { t } = useI18n()

const type = ref<"stdio" | "sse">(IsTauri ? "stdio" : "sse")
const title = ref("")
const stdioOptions = reactive({
  command: "",
  cwd: undefined,
  env: {},
})
const sseOptions = reactive({
  url: "",
})

const valid = computed(() =>
  type.value === "stdio" ? stdioOptions.command : sseOptions.url
)

defineEmits([...useDialogPluginComponent.emits])

const loading = ref(false)
const { install } = useInstallPlugin()
const $q = useQuasar()

function add () {
  loading.value = true

  if (!stdioOptions.cwd) delete stdioOptions.cwd

  const manifest: McpPluginManifest = {
    id: hash53(type.value === "stdio" ? stdioOptions.command : sseOptions.url),
    title: title.value,
    transport:
      type.value === "stdio"
        ? { type: "stdio", ...toRaw(stdioOptions) }
        : { type: "sse", ...toRaw(sseOptions) },
  }
  install(manifest)
    .then(() => {
      onDialogOK()
    })
    .catch((err) => {
      console.error(err)
      $q.notify({
        message: `${t("addMcpPluginDialog.installFailed")}: ${err.message}`,
        color: "negative",
      })
    })
    .finally(() => {
      loading.value = false
    })
}

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()
</script>
