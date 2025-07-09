<template>
  <q-btn
    v-if="model && assistant && dialog"
    flat
    dense
    icon="sym_o_neurology"
    icon-right="sym_o_keyboard_arrow_down"
  >
    <div
      px="6px"
      py="3px"
      text="xs"
      class="model-name"
    >
      {{ model.name }}
    </div>
    <q-menu important:max-w="300px">
      <q-list>
        <template v-if="assistant.model">
          <q-item-label
            header
            pb-2
          >
            {{ $t("dialogView.assistantModel") }}
          </q-item-label>
          <model-item
            v-if="assistant.model"
            :model="assistant.model.name"
            @click="updateDialogModel(null)"
            :selected="!dialog.modelOverride"
            clickable
            v-close-popup
          />
        </template>
        <template v-else-if="perfs.model">
          <q-item-label
            header
            pb-2
          >
            {{ $t("dialogView.globalDefault") }}
          </q-item-label>
          <model-item
            v-if="perfs.model"
            :model="perfs.model.name"
            @click="updateDialogModel(null)"
            :selected="!dialog.modelOverride"
            clickable
            v-close-popup
          />
        </template>
        <q-separator spaced />
        <q-item-label
          header
          py-2
        >
          {{ $t("dialogView.commonModels") }}
        </q-item-label>
        <a-tip
          tip-key="configure-common-models"
          rd-0
        >
          {{ $t("dialogView.modelsConfigGuide1")
          }}<router-link
            to="/settings"
            pri-link
          >
            {{ $t("dialogView.settings") }}
          </router-link>
          {{ $t("dialogView.modelsConfigGuide2") }}
        </a-tip>
        <model-item
          v-for="m of providerModels"
          :key="m"
          clickable
          :model="m"
          @click="updateDialogModel(models.find((model) => model.name === m) || {
            name: m,
            inputTypes: InputTypes.default,
          })"
          :selected="dialog.modelOverride?.name === m"
          v-close-popup
        />
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"

import ATip from "@/shared/components/ATip.vue"
import { useUserPerfsStore } from "@/shared/store"
import { Model } from "@/shared/types"
import { InputTypes, models } from "@/shared/utils/values"

import { useDialogsStore } from "@/features/dialogs/store"

import { Assistant } from "@/services/data/types/assistant"
import { Dialog } from "@/services/data/types/dialogs"

import { useProvidersStore } from "../store"

import ModelItem from "./ModelItem.vue"

interface Props {
  model: Model
  assistant: Assistant
  dialog: Dialog
}

const props = defineProps<Props>()

const { data: perfs } = useUserPerfsStore()
const dialogsStore = useDialogsStore()
const providersStore = useProvidersStore()
const providerModels = ref([])
watch(() => props.assistant.provider, (provider) => {
  providersStore.getModelList(provider).then((models) => {
    providerModels.value = models
  })
}, { immediate: true })

function updateDialogModel(modelOverride: any) {
  dialogsStore.updateDialog({
    id: props.dialog.id,
    modelOverride,
  })
}
</script>

<style scoped>
.q-btn {
  border-radius: 10px;
}
.model-name {
  text-transform: none;
}
</style>
