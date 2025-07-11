import { scaleBlob } from "@/features/media/utils/imageProcess"

import { ApiResultItem } from "../types"

import { MaxMessageFileSizeMB } from "./config"
import { getFileName, isTextFile, mimeTypeMatch } from "./functions"

/**
 * Parses files to API result items
 *
 * @param files - Files to parse
 * @param mimeTypes - Optional mime types to filter by (if empty, all files are supported)
 * @param onTooLarge - Callback for when a file is too large
 */
export async function parseFilesToApiResultItems(files: File[], mimeTypes:string[], onTooLarge: (maxFileSize: number, file: File) => void) {
  if (!files.length) return

  const textFiles = []
  const supportedFiles = []
  const otherFiles = []
  for (const file of files) {
    if (await isTextFile(file)) {
      textFiles.push(file)
    } else if (mimeTypes.length === 0 || mimeTypeMatch(file.type, mimeTypes)) {
      supportedFiles.push(file)
    } else {
      otherFiles.push(file)
    }
  }

  const parsedItems: ApiResultItem[] = []
  for (const file of textFiles) {
    parsedItems.push({
      type: "text",
      name: getFileName(file.name),
      contentText: await file.text()
    })
  }
  for (const file of supportedFiles) {
    if (file.size > MaxMessageFileSizeMB * 1024 * 1024) {
      onTooLarge(MaxMessageFileSizeMB, file)
      continue
    }

    const f =
      file.type.startsWith("image/") && file.size > 512 * 1024
        ? await scaleBlob(file, 2048 * 2048)
        : file
    parsedItems.push({
      type: "file",
      name: getFileName(file.name),
      mimeType: file.type,
      contentBuffer: await f.arrayBuffer()
    })
  }

  return { parsedItems, otherFiles }
}
