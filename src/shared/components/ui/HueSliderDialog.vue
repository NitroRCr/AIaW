<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(90vw, 400px)">
      <q-card-section>
        <div class="text-h6">
          {{ $t("hueSliderDialog.title") }}
        </div>
      </q-card-section>
      <q-card-section py-0>
        <div flex>
          <a-input
            type="number"
            :label="$t('hueSliderDialog.hue')"
            v-model.number="model"
            class="grow"
            @keyup.enter="onDialogOK(model)"
          />
          <hct-preview-circle
            m-1
            :hue="model"
            :size="48"
          />
        </div>
        <div mt-2>
          <hue-slider v-model="model" />
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('hueSliderDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('hueSliderDialog.ok')"
          @click="onDialogOK(model)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from "quasar"
import { ref } from "vue"

import HctPreviewCircle from "./HctPreviewCircle.vue"
import HueSlider from "./HueSlider.vue"

const props = defineProps({
  value: {
    type: Number,
    required: true,
  },
})

const model = ref(props.value)

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()
</script>
