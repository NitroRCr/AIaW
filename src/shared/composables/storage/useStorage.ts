import { fileTypeFromBuffer } from "file-type"

import { ApiResultItem, StorageApiResultItem } from "@/shared/types"
import { genId } from "@/shared/utils/functions"

import { supabase } from "@/services/data/supabase/client"

import { BucketName } from "./types"
import { BASE_URL } from "./utils"

/**
 * Detects the MIME type and file extension from an ArrayBuffer containing file data
 *
 * @param arrayBuffer - The ArrayBuffer containing the raw file data to analyze
 * @returns Promise resolving to an object with MIME type and extension properties, or null if detection fails
 * @throws Error if the buffer is invalid or cannot be processed
 *
 * @example
 * ```typescript
 * const buffer = await file.arrayBuffer()
 * const fileType = await detectMimeType(buffer)
 * if (fileType) {
 *   console.log(`Type: ${fileType.mime}, Extension: ${fileType.ext}`)
 * }
 * ```
 */
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

/**
 * Composable hook for managing file storage operations with Supabase Storage
 *
 * Provides a comprehensive set of methods for file upload, download, deletion,
 * URL generation, and specialized handling of API result items. Supports multiple
 * storage buckets including files, avatars, and other media types.
 *
 * @returns {Object} Storage operations API containing:
 * - uploadAvatar: (file: File) => Promise<string>
 * - deleteAvatar: (path: string) => Promise<void>
 * - uploadFile: (file: File, bucket?: BucketName) => Promise<string>
 * - getFileUrl: (path: string, bucket?: BucketName) => Promise<string>
 * - deleteFile: (path: string, bucket?: BucketName) => Promise<void>
 * - getFileSizeByUrl: (path: string, bucket?: BucketName) => Promise<number|null>
 * - uploadApiResultItem: (item: ApiResultItem) => Promise<StoredItem|null>
 * - saveApiResultItem: (item: ApiResultItem, storedItemData: Partial<StoredItem>) => Promise<StoredItem|null>
 * - saveApiResultItems: (items: ApiResultItem[], storedItemData: Partial<StoredItem>) => Promise<Array<StoredItem|null>>
 *
 * @example {@lang typescript}
 * const { uploadFile, getFileUrl, deleteFile } = useStorage()
 *
 * // File lifecycle management
 * const handleFileUpload = async (file: File) => {
 *   try {
 *     const path = await uploadFile(file)
 *     const url = await getFileUrl(path)
 *     const size = await getFileSizeByUrl(path)
 *
 *     return { path, url, size }
 *   } catch (error) {
 *     console.error('File operation failed:', error)
 *     throw error
 *   }
 * }
 */
export function useStorage () {
  /**
   * Uploads a file to the specified Supabase storage bucket
   *
   * @param {File} file - The File object to upload
   * @param {BucketName} [bucketName=files] - Target storage bucket name
   * @returns {Promise<string>} Resolves to storage path of uploaded file
   * @throws {Error} When:
   * - File is invalid or empty
   * - Bucket does not exist
   * - Network request fails
   * - Supabase returns an upload error
   *
   * @example {@lang typescript}
   * const input = document.querySelector<HTMLInputElement>('input[type="file"]')
   * if (input?.files?.[0]) {
   *   try {
   *     const path = await uploadFile(input.files[0], 'documents')
   *   } catch (error) {
   *     // Handle upload error
   *   }
   * }
   */
  const uploadFile = async (file: File, bucketName: BucketName = 'files') => {
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

  /**
   * Uploads a file specifically to the avatar images bucket
   *
   * @param file - The File object containing the avatar image to upload
   * @returns Promise resolving to the storage path of the uploaded avatar
   * @throws Error if the upload operation fails
   *
   * @example
   * ```typescript
   * const avatarFile = document.querySelector('#avatar-input').files[0]
   * const path = await uploadAvatar(avatarFile)
   * ```
   */
  const uploadAvatar = async (file: File) => {
    return uploadFile(file, 'avatar.images')
  }

  /**
   * Deletes an avatar file from the avatar images bucket
   *
   * @param path - The storage path of the avatar file to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if deletion fails or file doesn't exist
   *
   * @example
   * ```typescript
   * await deleteAvatar('user123/avatar_abc123.jpg')
   * ```
   */
  const deleteAvatar = async (path: string) => {
    return deleteFile(path, 'avatar.images')
  }

  /**
   * Generates a public URL for accessing a file in the storage bucket
   *
   * @param {string} path - Storage path within bucket
   * @param {BucketName} [bucketName=files] - Storage bucket name
   * @returns {Promise<string>} Publicly accessible URL for the file
   * @throws {TypeError} If path is not a string
   *
   * @example {@lang typescript}
   * // Get URL for a PDF document
   * const pdfUrl = await getFileUrl('reports/Q3-report.pdf')
   *
   * // Get URL from different bucket
   * const avatarUrl = await getFileUrl('users/123/avatar.jpg', 'avatar.images')
   */
  const getFileUrl = async (path: string, bucketName: BucketName = 'files') => {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path)
    console.log("---getFileUrl data", data)

    return data.publicUrl
  }

  /**
   * Permanently deletes a file from the specified storage bucket
   *
   * @param {string} path - Storage path to delete
   * @param {BucketName} [bucketName=files] - Storage bucket name
   * @returns {Promise<void>} Resolves when deletion completes
   * @throws {Error} When:
   * - Path does not exist
   * - Insufficient permissions
   * - Network request fails
   *
   * @example {@lang typescript}
   * // Delete a temporary file
   * await deleteFile('temp/upload_123.txt')
   *   .catch(error => console.error('Deletion failed:', error))
   */
  const deleteFile = async (path: string, bucketName: BucketName = 'files') => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([path])
    console.log("---deleteFile result:", { data, error })

    if (error) {
      console.error("Error deleting file:", error)
    }
  }

  /**
   * Retrieves the file size in bytes by making a HEAD request to the file URL
   *
   * @param path - The storage path of the file to check
   * @param bucketName - The storage bucket name (defaults to 'files')
   * @returns Promise resolving to the file size in bytes, or null if size cannot be determined
   *
   * @example
   * ```typescript
   * const size = await getFileSizeByUrl('documents/large-file.pdf', 'files')
   * if (size) {
   *   console.log(`File size: ${size} bytes`)
   * }
   * ```
   */
  const getFileSizeByUrl = async (path: string, bucketName: BucketName = 'files'): Promise<number | null> => {
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

  /**
   * Uploads an API result item that contains file data to storage
   *
   * Processes the file buffer, detects MIME type, generates a unique filename,
   * and uploads to the default files bucket.
   *
   * @param {ApiResultItem} item - API result item with file data
   * @returns {Promise<StoredItem|null>} File metadata with storage URL
   * @throws {TypeError} If item.contentBuffer is missing for file type
   * @throws {Error} When:
   * - MIME type detection fails
   * - File upload fails
   *
   * @example {@lang typescript}
   * const processFileResult = async (result: ApiResultItem) => {
   *   if (result.type === 'file') {
   *     const storedItem = await uploadApiResultItem(result)
   *     return storedItem?.fileUrl
   *   }
   *   return null
   * }
   */
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
          fileUrl: path,
          mimeType: fileType.mime,
          type: fileType.mime.startsWith("image/") ? "image" : "file"
        } as StorageApiResultItem
      } else {
        throw Error("Failed to detect mime type")
      }
    }

    return null
  }

  return {
    uploadAvatar,
    deleteAvatar,
    uploadFile,
    getFileUrl,
    deleteFile,
    getFileSizeByUrl,
    uploadApiResultItem,
  }
}
