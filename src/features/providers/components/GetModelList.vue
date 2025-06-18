<template>
  <a
    v-if="providerType?.getModelList"
    pri-link
    href="javascript:void(0)"
    @click="getModelList"
  >
    {{ $t("getModelList.getModelList") }}
  </a>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import { Provider } from "@/shared/utils/types"

import { useProvidersStore } from "@/features/providers/store"

const props = defineProps<{
  provider: Provider
}>()

const models = defineModel<string[]>()

const $q = useQuasar()
const { t } = useI18n()

const providersStore = useProvidersStore()
const providerType = computed(() =>
  providersStore.providerTypes.find((p) => p.name === props.provider?.type)
)

async function getModelList () {
  try {
    const list = await providerType.value.getModelList?.(props.provider.settings)
    models.value = list
  } catch (error) {
    $q.notify({
      type: "negative",
      message: t("getModelList.error", { error: error.message || error }),
    })
  }
}
</script>
