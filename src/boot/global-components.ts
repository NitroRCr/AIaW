import { boot } from "quasar/wrappers"

import AInput from "@/shared/components/global/AInput.js"
import StickySaveButton from "@/shared/components/StickySaveButton.vue"

export default boot(({ app }) => {
  app.component("AInput", AInput)
  app.component("StickySaveButton", StickySaveButton)
})
