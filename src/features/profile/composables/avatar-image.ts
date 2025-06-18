import { Ref } from "vue"

import { getAvatarUrl } from "@/shared/composables/storage/utils"

export function useAvatarImage (imageId: Ref<string>) {
  return getAvatarUrl(imageId.value)
}
