<template>
  <a
    pri-link
    href="javascript:void(0)"
    @click="getModelList"
  >
    {{ $t("getModelList.getModelList") }}
  </a>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"

import { Provider } from "@/shared/types"

import { useProvidersStore } from "@/features/providers/store"

const props = defineProps<{
  provider: Provider
}>()

const models = defineModel<string[]>()

const $q = useQuasar()
const { t } = useI18n()

const providersStore = useProvidersStore()
// const providerType = computed(() =>
//   providersStore.providerTypes.find((p) => p.name === props.provider?.type)
// )

async function getModelList () {
  try {
    console.log("---!!getModelList", props.provider)
    const list = await providersStore.getModelList(props.provider)
    models.value = list
  } catch (error) {
    $q.notify({
      type: "negative",
      message: t("getModelList.error", { error: error.message || error }),
    })
  }
}
</script>
