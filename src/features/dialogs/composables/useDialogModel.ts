import { computed, Ref, ref } from "vue"

import { useUserPerfsStore } from "@/shared/store"

import { useGetModel } from "@/features/providers/composables/getModel"

import { AssistantMapped, DialogMapped } from "@/services/supabase/types"

export const useDialogModel = (
  dialog: Ref<DialogMapped>,
  assistant: Ref<AssistantMapped>
) => {
  const { getModel, getSdkModel } = useGetModel()
  const modelOptions = ref({})
  const { data: perfs } = useUserPerfsStore()

  const model = computed(() =>
    getModel(dialog.value?.model_override || assistant.value?.model)
  )

  const sdkModel = computed(() =>
    getSdkModel(assistant.value?.provider, model.value, modelOptions.value)
  )

  const systemSdkModel = computed(() =>
    getSdkModel(perfs.systemProvider, perfs.systemModel)
  )

  return { model, sdkModel, modelOptions, systemSdkModel }
}
