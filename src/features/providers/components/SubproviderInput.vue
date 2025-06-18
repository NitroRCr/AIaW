<template>
  <provider-input-items v-model="subprovider.provider" />
  <q-item>
    <q-item-section>
      <q-item-label>
        {{ $t("subproviderInput.modelList") }}
      </q-item-label>
      <q-item-label caption>
        <get-model-list
          :provider="subprovider.provider"
          v-model="models"
        />
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <models-input
        class="xs:w-250px md:w-400px"
        v-model="models"
        filled
        dense
      />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from "vue"

import { SubproviderMapped } from "@/services/supabase/types"

import GetModelList from "./GetModelList.vue"
import ModelsInput from "./ModelsInput.vue"
import ProviderInputItems from "./ProviderInputItems.vue"

const subprovider = defineModel<SubproviderMapped>()

const models = computed({
  get: () =>
    Object.entries(subprovider.value.model_map).map(([key, value]) =>
      key === value ? key : `${key}::${value}`
    ),
  set: (value: string[]) => {
    subprovider.value.model_map = Object.fromEntries(
      value.map((v) => (v.includes("::") ? v.split("::", 2) : [v, v]))
    )
  },
})
</script>
