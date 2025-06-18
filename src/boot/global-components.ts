import { boot } from "quasar/wrappers"

import AInput from "@/shared/components/global/AInput.js"

export default boot(({ app }) => {
  app.component("AInput", AInput)
})
