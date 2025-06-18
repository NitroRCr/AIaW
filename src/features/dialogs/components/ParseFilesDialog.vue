<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          {{ $t("parseFilesDialog.parseFiles") }}
        </div>
      </q-card-section>
      <q-card-section :class="{ 'px-0': $q.screen.xs }">
        <q-list>
          <q-item
            v-for="(file, index) in props.files"
            :key="index"
          >
            <q-item-section
              avatar
              max-w="xs:150px sm:200px"
            >
              <q-item-label
                text-ellipsis
                of-hidden
                whitespace-nowrap
              >
                {{ file.name }}
              </q-item-label>
              <q-item-label
                caption
                text-ellipsis
                of-hidden
                whitespace-nowrap
              >
                {{ file.type }}
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="selected[index]?.rangeInput">
              <a-input
                v-model="ranges[index]"
                :label="selected[index].rangeInput.label"
                :placeholder="selected[index].rangeInput.hint"
                :mask="selected[index].rangeInput.mask"
                dense
              />
            </q-item-section>
            <q-item-section side>
              <q-select
                v-if="allOptions[index].length"
                v-model="selected[index]"
                @update:model-value="ranges[index] = null"
                :options="allOptions[index]"
                :label="$t('parseFilesDialog.parser')"
                dense
              >
                <template #option="{ opt, itemProps }">
                  <q-item
                    v-bind="itemProps"
                    min-h="40px"
                  >
                    <q-item-section>
                      {{ opt.label }}
                    </q-item-section>
                    <q-item-section side>
                      {{ opt.caption }}
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div
                v-else
                text-err
              >
                {{ $t("parseFilesDialog.noParserAvailable") }}
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('parseFilesDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :loading="loading"
          :disable="!selected.some((x) => x)"
          :label="$t('parseFilesDialog.parse')"
          @click="parse"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from "quasar"
import { computed, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"

import { mimeTypeMatch } from "@/shared/utils"

import { usePluginsStore } from "@/features/plugins/store"

const { t } = useI18n()

const props = defineProps<{
  files: File[]
}>()

defineEmits([...useDialogPluginComponent.emits])

const pluginsStore = usePluginsStore()
const fileparsers = computed(() => {
  const val = []
  pluginsStore.plugins
    .filter((p) => p.available)
    .forEach((p) => {
      const data = pluginsStore.data[p.id]
      p.fileparsers.forEach((fp) => {
        data.fileparsers[fp.name].enabled &&
          val.push({
            id: `${p.id}-${fp.name}`,
            pluginTitle: p.title,
            name: fp.name,
            mimeTypes: data.fileparsers[fp.name].mimeTypes,
            rangeInput: fp.rangeInput,
            execute: fp.execute,
            settings: data.settings,
            avatar: data.avatar,
          })
      })
    })

  return val
})
const allOptions = computed(() =>
  props.files.map((file) => {
    return fileparsers.value
      .filter((fp) => mimeTypeMatch(file.type, fp.mimeTypes))
      .map((fp) => ({
        label: fp.pluginTitle,
        value: fp.id,
        avatar: fp.avatar,
        caption: fp.name,
        rangeInput: fp.rangeInput,
      }))
  })
)

const loading = ref(false)
const $q = useQuasar()

async function parse () {
  loading.value = true
  const results = await Promise.all(
    selected.map(async ({ value }, index) => {
      if (!value) return []

      const file = props.files[index]
      const fp = fileparsers.value.find((fp) => fp.id === value)
      try {
        const result = await fp.execute(
          { file, range: ranges[index] },
          fp.settings
        )

        return result.map((r) => ({ ...r, name: file.name }))
      } catch (e) {
        console.error(e)
        $q.notify({
          message: t("parseFilesDialog.parseFailed", {
            file: file.name,
            error: e,
          }),
          color: "negative",
        })

        return []
      }
    })
  )
  loading.value = false
  onDialogOK(results.flat())
}

const ranges = reactive(props.files.map(() => null))
const selected = reactive(
  props.files.map((val, index) => allOptions.value[index][0])
)

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()
</script>
