import { Hct, hexFromArgb } from "@material/material-color-utilities"
import { Platform } from "quasar"

import { Avatar, PlatformEnabled } from "@/shared/utils/types"

import { ArtifactMapped } from "@/services/supabase/types"

function randomHash (digits = 64) {
  const array = new Uint8Array(digits / 8)
  crypto.getRandomValues(array)

  return Array.from(array)
    .map((i) => i.toString(16).padStart(2, "0"))
    .join("")
}

function escapeRegex (str: string) {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")
}

function escapeHtml (str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function defaultAvatar (text: string): Avatar {
  return {
    type: "text",
    text,
    hue: Math.floor(Math.random() * 360),
  }
}

function defaultTextAvatar (text: string): Avatar {
  return {
    type: "text",
    text: text
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase(),
    hue: Math.floor(Math.random() * 360),
  }
}

function avatarKey (avatar: Avatar) {
  switch (avatar.type) {
    case "image":
      return avatar.imageId
    case "text":
      return avatar.text
    case "icon":
      return avatar.icon
    case "url":
      return avatar.url
    case "svg":
      return avatar.name
  }
}

function hctToHex (h: number, c: number, t: number): string {
  return hexFromArgb(Hct.from(h, c, t).toInt())
}

let count = crypto.getRandomValues(new Uint32Array(1))[0]

function genId () {
  const timeHash = Date.now().toString(32).padStart(9, "0")
  const countHash = (count++ % 0x20000000).toString(32).padStart(6, "0")
  const randomHash = (crypto.getRandomValues(new Uint16Array(1))[0] % 0x8000)
    .toString(32)
    .padStart(3, "0")

  return timeHash + countHash + randomHash
}

function idTimestamp (id: string) {
  return parseInt(id.slice(0, 9), 32)
}

function idDateString (id: string) {
  return new Date(idTimestamp(id)).toLocaleString()
}

function JSONEqual (a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function mimeTypeMatch (mimeType: string, mimeTypes: string[]) {
  return mimeTypes.some((t) => {
    if (t === "*" || t === mimeType) return true

    const [type, subtype] = t.split("/")

    if (!mimeType.startsWith(type + "/")) return false

    return subtype === "*"
  })
}

async function isTextFile (file: Blob) {
  if (file.size > 4 * 1024 * 1024) return false

  const array = new Uint8Array(await file.arrayBuffer())
  for (const byte of array) {
    // Allowed control characters:
    // 9  - Tab
    // 10 - Line feed (LF)
    // 13 - Carriage return (CR)
    // 12 - Form feed (FF)
    // 11 - Vertical tab (VT)
    if (byte < 32 && ![9, 10, 13, 12, 11].includes(byte)) {
      return false
    }
  }

  return true
}

function wrapCode (code: string, lang = "", backticks = 3) {
  const mark = "`".repeat(backticks)

  return `${mark}${lang}\n${code}\n${mark}`
}

function wrapQuote (text: string) {
  return "> " + text.replace(/\n/g, "\n> ")
}

function parseSeconds (seconds: string) {
  return seconds.split(":").reduce((acc, cur) => acc * 60 + Number(cur), 0)
}

function caselessIncludes (a: string, b: string) {
  return a.toLowerCase().includes(b.toLowerCase())
}

const cjkReg = /[\u4e00-\u9fa5\u0800-\u4e00\uac00-\ud7ff]/

function displayLength (text: string) {
  let length = 0
  for (const i of text) {
    length += cjkReg.test(i) ? 2 : 1
  }

  return length
}

function textBeginning (text: string, length = 10) {
  let res = ""
  for (const i of text) {
    res += i
    length -= cjkReg.test(i) ? 2 : 1

    if (length <= 0) return res + "…"
  }

  return res
}

function parsePageRange (range: string) {
  return range
    .split(",")
    .map((r) => {
      const [start, end] = r.split("-").map(Number)
      const pages = []
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      return pages
    })
    .flat()
    .map((p) => p - 1)
}

const pageFhStyle = (offset: number, height: number) => ({
  height: `${height - offset}px`,
  overflowY: "auto",
})

function almostEqual (a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) < eps
}

function isPlatformEnabled (platform: PlatformEnabled) {
  if (platform === "always") return true

  if (platform === "desktop-only") return Platform.is.desktop

  if (platform === "mobile-only") return Platform.is.mobile

  return false
}

function getFileExt (filename: string) {
  return filename.match(/\.(\w+)$/)?.[1]
}

function saveArtifactChanges (
  artifact: ArtifactMapped
): Partial<ArtifactMapped> {
  return {
    versions: [
      ...artifact.versions.slice(0, artifact.curr_index + 1),
      {
        date: new Date().toISOString(),
        text: artifact.tmp,
      },
    ],
    curr_index: artifact.curr_index + 1,
  }
}

function restoreArtifactChanges (
  artifact: ArtifactMapped
): Partial<ArtifactMapped> {
  return {
    tmp: artifact.versions[artifact.curr_index].text,
  }
}

function blobToBase64 (blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function artifactUnsaved (artifact: ArtifactMapped) {
  return artifact.tmp !== artifact.versions[artifact.curr_index].text
}

function base64ToArrayBuffer (base64: string): ArrayBuffer {
  const base64WithoutPrefix = base64.split(",").pop() || base64
  const binaryString = atob(base64WithoutPrefix)

  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

function removeUndefinedProps (obj) {
  if (typeof obj !== "object" || obj === null) return

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        removeUndefinedProps(obj[key])
      }

      if (obj[key] === undefined) delete obj[key]
    }
  }
}

/*
    cyrb53 (c) 2018 bryc (github.com/bryc)
    License: Public domain (or MIT if needed). Attribution appreciated.
    A fast and simple 53-bit string hash function with decent collision resistance.
    Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
*/
function cyrb53 (str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

function hash53 (str: string, seed = 0) {
  return cyrb53(str, seed).toString(16)
}

function removeDuplicates (arr: any[]) {
  return Array.from(new Set(arr))
}

export {
  randomHash,
  escapeRegex,
  escapeHtml,
  defaultAvatar,
  hctToHex,
  genId,
  idTimestamp,
  idDateString,
  JSONEqual,
  mimeTypeMatch,
  isTextFile,
  wrapCode,
  wrapQuote,
  parseSeconds,
  caselessIncludes,
  displayLength,
  parsePageRange,
  pageFhStyle,
  almostEqual,
  isPlatformEnabled,
  textBeginning,
  getFileExt,
  saveArtifactChanges,
  restoreArtifactChanges,
  blobToBase64,
  base64ToArrayBuffer,
  artifactUnsaved,
  removeUndefinedProps,
  cyrb53,
  hash53,
  removeDuplicates,
  defaultTextAvatar,
  avatarKey,
}
