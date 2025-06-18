<template>
  <q-item>
    <q-item-section>
      <q-item-label>
        {{ label || $t("providerInputItems.provider") }}
      </q-item-label>
      <q-item-label
        caption
        v-if="caption"
      >
        {{ caption }}
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <q-select
        class="w-200px"
        :model-value="provider?.type"
        @update:model-value="switchProvider"
        :options="providerOptions"
        emit-value
        map-options
        filled
        dense
        clearable
      >
        <template #option="{ opt, itemProps }">
          <q-item
            v-bind="itemProps"
            min-h-0
          >
            <q-item-section
              avatar
              min-w-0
              pr-2
            >
              <a-avatar
                size="24px"
                :avatar="
                  store.providerTypes.find((p) => p.name === opt.value).avatar
                "
              />
            </q-item-section>
            <q-item-section>{{ opt.label }}</q-item-section>
          </q-item>
        </template>
      </q-select>
    </q-item-section>
  </q-item>
  <json-input
    v-if="provider && providerType"
    :schema="providerType.settings"
    v-model="provider.settings"
    component="item"
    lazy
    :input-props="{
      clearable: true,
    }"
  />
</template>

<script setup lang="ts">
import { computed } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import JsonInput from "@/shared/components/ui/JsonInput.vue"
import { Provider } from "@/shared/utils/types"

import { useProvidersStore } from "@/features/providers/store"

defineProps<{
  label?: string
  caption?: string
}>()

const provider = defineModel<Provider>()
const store = useProvidersStore()
const providerOptions = computed(() =>
  store.providerTypes.map((p) => ({
    label: p.label,
    value: p.name,
  }))
)
const providerType = computed(() =>
  store.providerTypes.find((p) => p.name === provider.value?.type)
)

function switchProvider (type: string) {
  if (type) {
    provider.value = {
      type,
      settings: {
        ...store.providerTypes.find((p) => p.name === type).initialSettings,
      },
    }
  } else {
    provider.value = null
  }
}
</script>
