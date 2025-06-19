<template>
  <div
    v-if="model && assistant && dialog"
    text-on-sur-var
    my-2
    of-hidden
    whitespace-nowrap
    text-ellipsis
    cursor-pointer
  >
    <q-icon
      name="sym_o_neurology"
      size="24px"
    />
    <code
      bg-sur-c-high
      px="6px"
      py="3px"
      text="xs"
    >{{ model.name }}</code>
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
          v-for="m of perfs.commonModelOptions"
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
  </div>
</template>

<script setup lang="ts">
import ATip from "@/shared/components/ATip.vue"
import { useUserPerfsStore } from "@/shared/store"
import { InputTypes, models } from "@/shared/utils/values"

import { useDialogsStore } from "@/features/dialogs/store"

import ModelItem from "./ModelItem.vue"

interface Props {
  model: any
  assistant: any
  dialog: any
}

const props = defineProps<Props>()

const { data: perfs } = useUserPerfsStore()
const dialogsStore = useDialogsStore()

function updateDialogModel(modelOverride: any) {
  dialogsStore.updateDialog({
    id: props.dialog.id,
    modelOverride,
  })
}
</script>
