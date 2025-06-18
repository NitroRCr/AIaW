import { pickBy } from "lodash"

import { getFileUrl } from "@/shared/composables/storage/utils"
import { ToolResultContent } from "@/shared/utils/types"

import { MessageContentResult } from "@/services/supabase/types"

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

export const storedItemResultContent = (item: MessageContentResult) => {
  const { type, mime_type, content_text, file_url } = item

  const result: ToolResultContent = {
    type: type as ToolResultContent["type"],
    mimeType: mime_type,
    data: file_url ? getFileUrl(file_url) : undefined,
    text: content_text,
  }

  return pickBy(result, (v) => v !== undefined) as ToolResultContent
}
