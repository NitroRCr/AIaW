import { createUserDataStore } from "@/shared/store/utils/createUserDataStore"
import { PluginData } from "@/shared/utils/types"

import { defaultData } from "@/features/plugins/utils/plugins"

export const useUserPluginsStore = () => {
  return createUserDataStore<Record<string, PluginData>>(
    "user-plugins",
    defaultData
  )()
}
