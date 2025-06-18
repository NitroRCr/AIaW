<template>
  <q-item>
    <q-item-section>{{ $t("modelInputItems.model") }}</q-item-section>
    <q-item-section side>
      <autocomplete-input
        class="w-250px"
        :model-value="model?.name"
        @update:model-value="setModel"
        :options="providersStore.modelOptions"
        filled
        dense
      >
        <template #option="{ opt, selected, itemProps }">
          <model-item
            :model="opt"
            :selected
            v-bind="itemProps"
          />
        </template>
      </autocomplete-input>
    </q-item-section>
  </q-item>
  <q-expansion-item
    :label="$t('modelInputItems.multimodalCapabilities')"
    :caption="$t('modelInputItems.multimodalCapabilitiesCaption')"
    v-if="model"
  >
    <q-item>
      <q-item-section>
        {{ $t("modelInputItems.userInputTypes") }}
      </q-item-section>
      <q-item-section side>
        <list-input
          class="xs:w-200px sm:w-250px"
          filled
          dense
          v-model="model.inputTypes.user"
          new-value-mode="add-unique"
        />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        {{ $t("modelInputItems.assistantMessageTypes") }}
      </q-item-section>
      <q-item-section side>
        <list-input
          class="xs:w-200px sm:w-250px"
          filled
          dense
          v-model="model.inputTypes.assistant"
          new-value-mode="add-unique"
        />
      </q-item-section>
    </q-item>
    <q-item>
      <q-item-section>
        {{ $t("modelInputItems.toolResultTypes") }}
      </q-item-section>
      <q-item-section side>
        <list-input
          class="xs:w-200px sm:w-250px"
          filled
          dense
          v-model="model.inputTypes.tool"
          new-value-mode="add-unique"
        />
      </q-item-section>
    </q-item>
  </q-expansion-item>
</template>

<script setup lang="ts">

import AutocompleteInput from "@/shared/components/ui/AutocompleteInput.vue"
import ListInput from "@/shared/components/ui/ListInput.vue"
import { Model } from "@/shared/utils/types"
import { InputTypes, models } from "@/shared/utils/values"

import { useProvidersStore } from "@/features/providers/store"

import ModelItem from "./ModelItem.vue"

const model = defineModel<Model>()

function setModel (name: string) {
  model.value = name
    ? models.find((m) => m.name === name) || {
      name,
      inputTypes: InputTypes.default,
    }
    : null
}

const providersStore = useProvidersStore()
</script>
