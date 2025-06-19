/**
 * Utility functions for handling dialog messages and their content.
 * This file contains functions for transforming stored message content
 * into formats needed for display or for sending to language models.
 */
import { pickBy } from "lodash"

import { getFileUrl } from "@/shared/composables/storage/utils"
import { ToolResultContent } from "@/shared/types"

import { StoredItemResult } from "@/services/data/types/storedItem"

// TODO: multimodal version ???
// export const storedItemResultContent = async (item: MessageContentResult, mimeSupported: string[]): Promise<ToolResultContent> => {
//   const { type, mime_type, content_text, file_url } = item

//   const result: ToolResultContent = {
//     type: type as ToolResultContent['type'],
//   }

//   if (content_text) {
//     result.text = content_text
//   }

//   if (file_url) {
//     const url = getFileUrl(file_url)
//     if (mimeSupported.includes(mime_type)) {
//       result.mimeType = mime_type

//       result.data = await fetch(url).then(res => res.arrayBuffer())
//     } else {
//       result.text = url
//     }
//   }

//   return result
// }

export const storedItemResultContent = (item: StoredItemResult) => {
  const { type, mimeType, contentText, fileUrl } = item

  const result: ToolResultContent = {
    type: type as ToolResultContent["type"],
    mimeType,
    data: fileUrl ? getFileUrl(fileUrl) : undefined,
    text: contentText,
  }

  return pickBy(result, (v) => v !== undefined) as ToolResultContent
}
