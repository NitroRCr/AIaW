import { fileTypeFromBuffer } from "file-type"

import { genId } from "@/shared/utils/functions"
import { ApiResultItem } from "@/shared/utils/types"

import { supabase } from "@/services/supabase/client"
import { StoredItemMapped } from "@/services/supabase/types"

import { AVATAR_BUCKET, BASE_URL } from "./utils"

async function detectMimeType (arrayBuffer: ArrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer)
  const fileType = await fileTypeFromBuffer(uint8Array)

  if (fileType) {
    console.log(`Detected: ${fileType.mime}, Extension: ${fileType.ext}`)

    return fileType
  } else {
    console.log("MIME type not detected")

    return null
  }
}

export function useStorage (bucketName: string = AVATAR_BUCKET) {
  const uploadFile = async (file: File) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(file.name, file)
    console.log("---uploadFile data", data)

    if (error) {
      console.error("Error uploading file:", error)
      throw error
    }

    return data.path
  }

  const getFileUrl = async (path: string) => {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path)
    console.log("---getFileUrl data", data)

    return data.publicUrl
  }

  const deleteFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([path])
    console.log("---deleteFile result:", { data, error })

    if (error) {
      console.error("Error deleting file:", error)
    }
  }

  const getFileSizeByUrl = async (path: string): Promise<number | null> => {
    try {
      const response = await fetch(`${BASE_URL}${bucketName}/${path}`, {
        method: "HEAD",
      })
      const length = response.headers.get("Content-Length")

      return length ? parseInt(length, 10) : null
    } catch (error) {
      console.error("Failed to fetch file size:", error)

      return null
    }
  }

  const uploadApiResultItem = async (item: ApiResultItem) => {
    if (item.type === "file") {
      const fileType = await detectMimeType(item.contentBuffer)

      if (fileType) {
        // remove extension from name
        const name =
          (item.name || "").replace(`.${fileType.ext}`, "") +
          `_${genId()}.${fileType.ext}`

        const buffer = item.contentBuffer
        const file = new File([buffer], name, { type: fileType.mime })
        const path = await uploadFile(file)

        return {
          name,
          file_url: path,
          mime_type: fileType.mime,
          type: "file", // fileType.mime.startsWith('image/') ? 'image' : 'file'
        } as StoredItemMapped
      } else {
        throw Error("Failed to detect mime type")
      }
    }

    return null
  }

  // TODO: move outside storage
  const saveApiResultItem = async (
    item: ApiResultItem,
    storedItemData: Partial<StoredItemMapped>
  ): Promise<StoredItemMapped | null> => {
    if (item.type === "file") {
      const fileItem = await uploadApiResultItem(item)

      if (fileItem) {
        return {
          ...fileItem,
          ...storedItemData,
        }
      }
    }

    // Text items store in DB, not in storage
    return {
      content_text: item.contentText,
      type: item.type,
      ...storedItemData,
    }
  }

  const saveApiResultItems = async (
    items: ApiResultItem[],
    storedItemData: Partial<StoredItemMapped>
  ) => {
    return Promise.all(items.map((item) => saveApiResultItem(item, storedItemData)))
  }

  return {
    uploadFile,
    getFileUrl,
    deleteFile,
    getFileSizeByUrl,
    uploadApiResultItem,
    saveApiResultItem,
    saveApiResultItems
  }
}
