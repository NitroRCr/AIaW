import { ref, onUnmounted } from 'vue'

interface FileWithPreview extends File {
  previewUrl?: string
  isProcessing?: boolean
  hasError?: boolean
}

// Constants for file validation
const MAX_PREVIEW_FILE_SIZE_MB = 10 // Limit preview generation to 10MB
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const

export function useDialogFileHandling() {
  const pendingFiles = ref<FileWithPreview[]>([])

  const isImageFile = (file: File): boolean => {
    return SUPPORTED_IMAGE_TYPES.includes(file.type as any) || file.type.startsWith('image/')
  }

  const isValidForPreview = (file: File): boolean => {
    const sizeInMB = file.size / (1024 * 1024)

    return isImageFile(file) && sizeInMB <= MAX_PREVIEW_FILE_SIZE_MB
  }

  const createPreviewUrl = async (file: File): Promise<string | undefined> => {
    if (!isValidForPreview(file)) {
      return undefined
    }

    try {
      const url = URL.createObjectURL(file)

      return url
    } catch (error) {
      console.error('Failed to create preview URL for file:', file.name, error)

      return undefined
    }
  }

  const cleanupPreviewUrl = (file: FileWithPreview) => {
    if (file.previewUrl) {
      try {
        URL.revokeObjectURL(file.previewUrl)
      } catch (error) {
        console.warn('Failed to revoke object URL:', error)
      }
      file.previewUrl = undefined
    }
  }

  async function onInputFiles(event: Event) {
    const target = event.target as HTMLInputElement
    const files = Array.from(target.files || [])

    // Process files with preview URLs for images
    const filesWithPreviews = await Promise.all(
      files.map(async (file) => {
        const fileWithPreview = file as FileWithPreview

        if (isValidForPreview(file)) {
          fileWithPreview.isProcessing = true
          try {
            fileWithPreview.previewUrl = await createPreviewUrl(file)
            fileWithPreview.hasError = !fileWithPreview.previewUrl
          } catch (error) {
            console.error('Error processing file preview:', file.name, error)
            fileWithPreview.hasError = true
          } finally {
            fileWithPreview.isProcessing = false
          }
        }

        return fileWithPreview
      })
    )

    pendingFiles.value.push(...filesWithPreviews)

    // Clear the input value so the same file can be selected again
    target.value = ''
  }

  function removeFile(index: number) {
    if (index < 0 || index >= pendingFiles.value.length) {
      console.warn('Invalid file index for removal:', index)

      return
    }

    const file = pendingFiles.value[index]
    cleanupPreviewUrl(file)
    pendingFiles.value.splice(index, 1)
  }

  function clearAllFiles() {
    // Clean up all preview URLs
    pendingFiles.value.forEach(file => {
      cleanupPreviewUrl(file)
    })
    pendingFiles.value = []
  }

  function getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) {
      return 'sym_o_image'
    } else if (file.type.startsWith('video/')) {
      return 'sym_o_videocam'
    } else if (file.type.startsWith('audio/')) {
      return 'sym_o_audiotrack'
    } else if (file.type.includes('pdf')) {
      return 'sym_o_picture_as_pdf'
    } else if (file.type.includes('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return 'sym_o_description'
    } else if (file.type.includes('zip') || file.type.includes('archive')) {
      return 'sym_o_archive'
    } else {
      return 'sym_o_draft'
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  function getFileSizeWarning(file: File): string | null {
    const sizeInMB = file.size / (1024 * 1024)

    if (isImageFile(file) && sizeInMB > MAX_PREVIEW_FILE_SIZE_MB) {
      return `Image too large for preview (${formatFileSize(file.size)}). Maximum size: ${MAX_PREVIEW_FILE_SIZE_MB}MB`
    }

    return null
  }

  // Cleanup URLs when component is unmounted
  onUnmounted(() => {
    pendingFiles.value.forEach(file => {
      cleanupPreviewUrl(file)
    })
  })

  return {
    pendingFiles,
    onInputFiles,
    removeFile,
    clearAllFiles,
    getFileIcon,
    formatFileSize,
    getFileSizeWarning,
    isImageFile,
    isValidForPreview,
    MAX_PREVIEW_FILE_SIZE_MB
  }
}
