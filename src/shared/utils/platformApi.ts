import { Clipboard } from "@capacitor/clipboard"
import { Capacitor } from "@capacitor/core"
import { Directory, Filesystem } from "@capacitor/filesystem"
import { readText } from "@tauri-apps/plugin-clipboard-manager"
import { platform } from "@tauri-apps/plugin-os"
import { ExportFile } from "capacitor-export-file"
import { fetch as capFetch } from "capacitor-stream-fetch"
import { exportFile as webExportFile } from "quasar"

import { blobToBase64 } from "@/shared/utils/functions"
import { fetch as tauriFetch } from "@/shared/utils/tauriStream"
export const IsTauri = "__TAURI_INTERNALS__" in window
export const IsCapacitor = Capacitor.isNativePlatform()
export const IsWeb = !IsTauri && !IsCapacitor
export const TauriPlatform = IsTauri ? platform() : undefined

export const fetch = IsTauri
  ? tauriFetch
  : IsCapacitor
    ? capFetch
    : window.fetch.bind(window)

export async function clipboardReadText (): Promise<string> {
  if (IsTauri) {
    return await readText()
  } else if (IsCapacitor) {
    return (await Clipboard.read()).value
  } else {
    return navigator.clipboard.readText()
  }
}

export const PublicOrigin =
  IsTauri || IsCapacitor ? "https://aiaw.app" : location.origin

export async function exportFile (filename, data: Blob | string | ArrayBuffer) {
  if (!IsCapacitor) return webExportFile(filename, data)

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: (await blobToBase64(new Blob([data]))).replace(/^data:.*,/, ""),
    directory: Directory.Cache,
  })
  await ExportFile.exportFile({
    uri,
    filename,
  })
  await Filesystem.deleteFile({
    path: filename,
    directory: Directory.Cache,
  })
}
