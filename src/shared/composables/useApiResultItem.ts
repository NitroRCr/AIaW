import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"

import ParseFilesDialog from "@/features/dialogs/components/ParseFilesDialog.vue"

import { ApiResultItem, AssistantPlugins } from "../types"
import { parseFilesToApiResultItems } from "../utils/files"

export function useApiResultItem() {
  const $q = useQuasar()
  const { t } = useI18n()
  const filesToApiResultItems = async (files: File[], mimeTypes: string[], parserPlugins: AssistantPlugins) => {
    const { parsedItems, otherFiles } = await parseFilesToApiResultItems(files, mimeTypes,
      (maxFileSize, file) => {
        $q.notify({
          message: t("dialogView.fileTooLarge", {
            maxSize: maxFileSize
          }),
          color: "negative"
        })
      }
    )
    console.log("otherFiles", otherFiles, parsedItems)

    if (otherFiles.length) {
      $q.dialog({
        component: ParseFilesDialog,
        componentProps: { files: otherFiles, plugins: parserPlugins }
      }).onOk((files: ApiResultItem[]) => {
        parsedItems.push(...files)
      })
    }

    return parsedItems
  }

  return { filesToApiResultItems }
}
