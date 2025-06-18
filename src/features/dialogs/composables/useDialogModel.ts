import { computed, Ref, ref } from "vue"

import { useUserPerfsStore } from "@/shared/store"

import { useGetModel } from "@/features/providers/composables/useGetModel"

import { Assistant } from "@/services/data/types/assistant"
import { Dialog } from "@/services/data/types/dialogs"

export const useDialogModel = (
  dialog: Ref<Dialog>,
  assistant: Ref<Assistant>
) => {
  const { getModel, getSdkModel } = useGetModel()
  const modelOptions = ref({})
  const { data: perfs } = useUserPerfsStore()

  const model = computed(() =>
    getModel(dialog.value?.modelOverride || assistant.value?.model)
  )

  const sdkModel = computed(() =>
    getSdkModel(assistant.value?.provider, model.value, modelOptions.value)
  )

  const systemSdkModel = computed(() =>
    getSdkModel(perfs.systemProvider, perfs.systemModel)
  )

  return { model, sdkModel, modelOptions, systemSdkModel }
}
