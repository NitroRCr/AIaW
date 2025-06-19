import { ref } from 'vue'

export function useDialogFileHandling() {
  const pendingFiles = ref<File[]>([])

  function onInputFiles(event: Event) {
    const target = event.target as HTMLInputElement
    const files = Array.from(target.files || [])

    // Add new files to pending files
    pendingFiles.value.push(...files)

    // Clear the input value so the same file can be selected again
    target.value = ''
  }

  function removeFile(index: number) {
    pendingFiles.value.splice(index, 1)
  }

  function clearAllFiles() {
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

  return {
    pendingFiles,
    onInputFiles,
    removeFile,
    clearAllFiles,
    getFileIcon,
    formatFileSize
  }
}
