import { Hct, hexFromArgb } from "@material/material-color-utilities"
import { Platform } from "quasar"

import { Avatar, PlatformEnabled } from "@/shared/types"

import { Artifact } from "@/services/data/types/artifact"

/**
 * Generates a random hexadecimal hash string of specified length
 *
 * Uses the Web Crypto API to generate cryptographically secure random values
 * and converts them to a hexadecimal string.
 *
 * @param digits - The number of hexadecimal digits to generate (default: 64)
 * @returns A random hexadecimal string of the specified length
 * @example
 * const hash = randomHash(32); // e.g. "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
 */
function randomHash (digits = 64) {
  const array = new Uint8Array(digits / 8)
  crypto.getRandomValues(array)

  return Array.from(array)
    .map((i) => i.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Escapes special characters in a string for use in a regular expression
 *
 * Adds backslashes before characters that have special meaning in regex patterns
 * to ensure they're treated as literal characters.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in a RegExp constructor
 * @example
 * const pattern = new RegExp(escapeRegex("Hello (world)")); // Creates regex that matches "Hello (world)" literally
 */
function escapeRegex (str: string) {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")
}

/**
 * Escapes HTML special characters in a string to prevent XSS attacks
 *
 * Replaces characters that have special meaning in HTML with their corresponding
 * HTML entities to ensure they're displayed as text, not interpreted as HTML.
 *
 * @param str - The string to escape
 * @returns The HTML-escaped string
 * @example
 * const safeHtml = escapeHtml("<script>alert('XSS')</script>");
 * // Returns "&lt;script&gt;alert(&apos;XSS&apos;)&lt;/script&gt;"
 */
function escapeHtml (str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Creates a default text-based avatar with a random color hue
 *
 * Uses the provided text and assigns a random hue value (0-359)
 * for the avatar's background color.
 *
 * @param text - The text to display in the avatar
 * @returns A text-type Avatar object with the provided text and random hue
 * @example
 * const avatar = defaultAvatar("JD"); // Returns { type: "text", text: "JD", hue: 243 }
 */
function defaultAvatar (text: string): Avatar {
  return {
    type: "text",
    text,
    hue: Math.floor(Math.random() * 360),
  }
}

/**
 * Creates a text avatar using the initials from the input text
 *
 * Extracts the first letter of each word, joins them together,
 * converts to uppercase, and assigns a random hue for the background color.
 *
 * @param text - The input text to extract initials from (e.g., "John Doe")
 * @returns A text-type Avatar object with the extracted initials and random hue
 * @example
 * const avatar = defaultTextAvatar("John Doe"); // Returns { type: "text", text: "JD", hue: 127 }
 * const avatar2 = defaultTextAvatar("Alice Bob Charlie"); // Returns { type: "text", text: "ABC", hue: 42 }
 */
function defaultTextAvatar (text: string): Avatar {
  return {
    type: "text",
    text: (text || "💩")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase(),
    hue: Math.floor(Math.random() * 360),
  }
}

/**
 * Extracts a unique identifier string from an Avatar object
 *
 * Returns a different property based on the avatar type:
 * - image: returns the imageId
 * - text: returns the text content
 * - icon: returns the icon name
 * - url: returns the URL
 * - svg: returns the name
 *
 * @param avatar - The Avatar object to extract a key from
 * @returns A string that uniquely identifies the avatar content
 * @example
 * const key = avatarKey({ type: "text", text: "AB", hue: 120 }); // Returns "AB"
 * const key2 = avatarKey({ type: "icon", icon: "person", color: "blue" }); // Returns "person"
 */
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

/**
 * Converts HCT (Hue, Chroma, Tone) color values to a hexadecimal color string
 *
 * Uses Material Color Utilities to transform HCT color space values
 * into a standard hexadecimal color code.
 *
 * @param h - Hue value (0-360)
 * @param c - Chroma/saturation value
 * @param t - Tone/lightness value
 * @returns Hexadecimal color string (e.g., "#ff00ff")
 * @example
 * const hexColor = hctToHex(340, 80, 70); // Returns something like "#f5407a"
 */
function hctToHex (h: number, c: number, t: number): string {
  return hexFromArgb(Hct.from(h, c, t).toInt())
}

let count = crypto.getRandomValues(new Uint32Array(1))[0]

/**
 * Generates a unique, time-based ID string with the following components:
 * - 9 characters from the current timestamp (base 32)
 * - 6 characters from an incrementing counter (base 32)
 * - 3 characters from a random value (base 32)
 *
 * The resulting ID has these properties:
 * - Time-sortable: IDs created later will sort after earlier ones
 * - Unique: Uses combination of time, counter and randomness to avoid collisions
 * - Compact: Uses base 32 encoding for efficiency
 * - Readable: Uses only alphanumeric characters
 *
 * @returns A unique 18-character string ID
 * @example
 * const id = genId(); // e.g. "1lj82ib9i08n0o9he"
 */
function genId(): string {
  const timeHash = Date.now().toString(32).padStart(9, "0")
  const countHash = (count++ % 0x20000000).toString(32).padStart(6, "0")
  const randomHash = (crypto.getRandomValues(new Uint16Array(1))[0] % 0x8000)
    .toString(32)
    .padStart(3, "0")

  return timeHash + countHash + randomHash
}

/**
 * Extracts the timestamp from an ID generated by genId()
 *
 * @param id - The ID string created by genId()
 * @returns The numeric timestamp (milliseconds since epoch) from which the ID was created
 * @example
 * const timestamp = idTimestamp("1lj82ib9i08n0o9he"); // Returns the creation timestamp
 */
function idTimestamp(id: string): number {
  return parseInt(id.slice(0, 9), 32)
}

/**
 * Converts an ID generated by genId() into a localized date string
 *
 * @param id - The ID string created by genId()
 * @returns A localized string representation of the date when the ID was created
 * @example
 * const dateStr = idDateString("1lj82ib9i08n0o9he"); // e.g. "6/14/2025, 8:42:15 AM"
 */
function idDateString(id: string): string {
  return new Date(idTimestamp(id)).toLocaleString()
}

/**
 * Compares two values for deep equality by serializing them to JSON strings
 *
 * This function handles complex objects and arrays, but note some limitations:
 * - Does not handle circular references
 * - Functions and undefined values are not reliably compared
 * - Objects with different property orders but same content will be equal
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if values are deeply equal, false otherwise
 * @example
 * JSONEqual({a: 1, b: [2]}, {a: 1, b: [2]}); // true
 * JSONEqual({a: 1, b: 2}, {a: 1, b: 3}); // false
 */
function JSONEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Checks if a MIME type matches any in a list of allowed MIME types
 *
 * Supports wildcard patterns in the allowed MIME types:
 * - "*" matches any MIME type
 * - "image/*" matches any image type
 * - Exact matches like "image/jpeg" match only that specific type
 *
 * @param mimeType - The MIME type to check
 * @param mimeTypes - Array of allowed MIME type patterns
 * @returns True if the MIME type matches any allowed pattern, false otherwise
 * @example
 * mimeTypeMatch("image/jpeg", ["image/*"]); // true
 * mimeTypeMatch("application/pdf", ["image/*"]); // false
 * mimeTypeMatch("image/png", ["image/jpeg", "image/png"]); // true
 * mimeTypeMatch("text/plain", ["*"]); // true
 */
function mimeTypeMatch(mimeType: string, mimeTypes: string[]): boolean {
  return mimeTypes.some((t) => {
    if (t === "*" || t === mimeType) return true

    const [type, subtype] = t.split("/")

    if (!mimeType.startsWith(type + "/")) return false

    return subtype === "*"
  })
}

/**
 * Determines if a file is likely to be a text file by examining its content
 *
 * This function uses two criteria:
 * 1. File size must be less than 4MB
 * 2. File must only contain printable characters or specific control characters
 *    (tab, line feed, carriage return, form feed, vertical tab)
 *
 * @param file - The file blob to analyze
 * @returns Promise resolving to true if the file appears to be text, false otherwise
 * @example
 * const isText = await isTextFile(fileBlob);
 * if (isText) {
 *   // Handle as text file
 * } else {
 *   // Handle as binary file
 * }
 */
async function isTextFile(file: Blob): Promise<boolean> {
  // Reject files larger than 4MB
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

/**
 * Wraps code text in markdown code block delimiters
 *
 * Formats code for markdown display by surrounding it with backticks
 * and optionally specifying the language for syntax highlighting.
 *
 * @param code - The code text to wrap
 * @param lang - The language identifier for syntax highlighting (default: "")
 * @param backticks - The number of backticks to use for the code block (default: 3)
 * @returns Markdown-formatted code block
 * @example
 * // Returns "```javascript\nconst x = 42;\n```"
 * const markdown = wrapCode("const x = 42;", "javascript");
 */
function wrapCode (code: string, lang = "", backticks = 3) {
  const mark = "`".repeat(backticks)

  return `${mark}${lang}\n${code}\n${mark}`
}

/**
 * Formats text as a markdown blockquote
 *
 * Adds "> " at the beginning of each line to create a markdown blockquote.
 *
 * @param text - The text to format as a blockquote
 * @returns Markdown-formatted blockquote text
 * @example
 * // Returns "> This is\n> a quote"
 * const quote = wrapQuote("This is\na quote");
 */
function wrapQuote (text: string) {
  return "> " + text.replace(/\n/g, "\n> ")
}

/**
 * Parses a time string in format "hh:mm:ss" or "mm:ss" into total seconds
 *
 * Converts time segments separated by colons into a total number of seconds.
 * For example, "01:30" becomes 90 seconds, and "01:00:00" becomes 3600 seconds.
 *
 * @param seconds - Time string in format "hh:mm:ss" or "mm:ss"
 * @returns Total number of seconds
 * @example
 * parseSeconds("01:30"); // Returns 90
 * parseSeconds("01:00:00"); // Returns 3600
 */
function parseSeconds (seconds: string) {
  return seconds.split(":").reduce((acc, cur) => acc * 60 + Number(cur), 0)
}

/**
 * Performs a case-insensitive check for a substring within a string
 *
 * Converts both strings to lowercase before checking if one contains the other.
 *
 * @param a - The string to search within
 * @param b - The substring to search for
 * @returns True if string a contains string b (case-insensitive), false otherwise
 * @example
 * caselessIncludes("Hello World", "world"); // Returns true
 * caselessIncludes("Hello World", "universe"); // Returns false
 */
function caselessIncludes (a: string, b: string) {
  return a.toLowerCase().includes(b.toLowerCase())
}

/**
 * Regular expression to match CJK (Chinese, Japanese, Korean) characters
 *
 * Used to detect characters that typically require double-width display space
 * in monospace fonts.
 */
const cjkReg = /[\u4e00-\u9fa5\u0800-\u4e00\uac00-\ud7ff]/

/**
 * Calculates the display width of text, accounting for CJK characters
 *
 * CJK characters typically take up twice the width of Latin characters
 * in monospace fonts. This function counts CJK characters as 2 units
 * and other characters as 1 unit.
 *
 * @param text - The text to measure
 * @returns The display width of the text
 * @example
 * displayLength("Hello"); // Returns 5
 */
function displayLength (text: string) {
  let length = 0
  for (const i of text) {
    length += cjkReg.test(i) ? 2 : 1
  }

  return length
}

/**
 * Extracts the beginning of text up to a specified display length
 *
 * Similar to a substring function, but accounts for CJK characters taking
 * up twice the width of Latin characters. Adds an ellipsis if the text is truncated.
 *
 * @param text - The input text
 * @param length - The maximum display length (default: 10)
 * @returns The beginning of the text, truncated to the specified length with an ellipsis if needed
 * @example
 * textBeginning("Hello world", 5); // Returns "Hello…"
 */
function textBeginning (text: string, length = 10) {
  let res = ""
  for (const i of text) {
    res += i
    length -= cjkReg.test(i) ? 2 : 1

    if (length <= 0) return res + "…"
  }

  return res
}

/**
 * Parses a page range string into an array of zero-indexed page numbers
 *
 * Accepts a comma-separated list of page ranges, where each range can be
 * a single page or a start-end range. The resulting array contains all specified
 * page numbers, converted to zero-indexed values (subtracting 1 from each page number).
 *
 * @param range - Page range string (e.g., "1-3,5,7-9")
 * @returns Array of zero-indexed page numbers
 * @example
 * parsePageRange("1-3"); // Returns [0, 1, 2]
 * parsePageRange("1,3,5"); // Returns [0, 2, 4]
 * parsePageRange("1-2,5-6"); // Returns [0, 1, 4, 5]
 */
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

/**
 * Creates a style object for a page with full height minus an offset
 *
 * Useful for creating scrollable containers that take up the remaining
 * vertical space on a page after accounting for headers or other fixed elements.
 *
 * @param offset - The offset in pixels to subtract from the total height
 * @param height - The total available height in pixels
 * @returns A style object with height and overflow properties
 * @example
 * // Returns { height: "500px", overflowY: "auto" }
 * const style = pageFhStyle(100, 600);
 */
const pageFhStyle = (offset: number, height: number) => ({
  height: `${height - offset}px`,
  overflowY: "auto",
})

/**
 * Checks if two numbers are approximately equal within a specified epsilon
 *
 * Useful for floating-point comparisons where exact equality might fail
 * due to precision errors.
 *
 * @param a - First number to compare
 * @param b - Second number to compare
 * @param eps - Epsilon value (maximum allowed difference, default: 1e-6)
 * @returns True if the absolute difference between a and b is less than epsilon
 * @example
 * almostEqual(0.1 + 0.2, 0.3); // Returns true
 * almostEqual(1.0, 1.001, 0.01); // Returns true
 * almostEqual(1.0, 1.1, 0.01); // Returns false
 */
function almostEqual (a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) < eps
}

/**
 * Determines if a feature should be enabled based on platform settings
 *
 * Used for conditional feature enabling based on the current platform:
 * - "always": Enabled on all platforms
 * - "desktop-only": Enabled only on desktop platforms
 * - "mobile-only": Enabled only on mobile platforms
 *
 * @param platform - The platform availability setting for the feature
 * @returns True if the feature should be enabled on the current platform
 * @example
 * // On desktop
 * isPlatformEnabled("always"); // Returns true
 * isPlatformEnabled("desktop-only"); // Returns true
 * isPlatformEnabled("mobile-only"); // Returns false
 */
function isPlatformEnabled (platform: PlatformEnabled) {
  if (platform === "always") return true

  if (platform === "desktop-only") return Platform.is.desktop

  if (platform === "mobile-only") return Platform.is.mobile

  return false
}

/**
 * Extracts the file extension from a filename
 *
 * Parses the filename to find the extension (characters after the last dot).
 * Returns undefined if no extension is found.
 *
 * @param filename - The filename to extract the extension from
 * @returns The file extension without the dot, or undefined if no extension found
 * @example
 * getFileExt("document.pdf"); // Returns "pdf"
 * getFileExt("image.large.jpg"); // Returns "jpg"
 * getFileExt("README"); // Returns undefined
 */
function getFileExt (filename: string) {
  return filename.match(/\.(\w+)$/)?.[1]
}

function getFileName (filename: string) {
  return filename.split(".").slice(0, -1).join(".")
}

/**
 * Creates a partial artifact update that saves the current temporary changes
 * as a new version in the artifact's version history
 *
 * This function:
 * 1. Takes all versions up to the current index
 * 2. Adds a new version with the current temporary content
 * 3. Increments the current version index
 *
 * @param artifact - The artifact object with pending changes
 * @returns A partial artifact object with updated versions and index
 * @example
 * const updatedArtifact = {
 *   ...artifact,
 *   ...saveArtifactChanges(artifact)
 * };
 */
function saveArtifactChanges(
  artifact: Artifact
): Partial<Artifact> {
  return {
    versions: [
      ...artifact.versions.slice(0, artifact.currIndex + 1),
      {
        date: new Date().toISOString(),
        text: artifact.tmp,
      },
    ],
    currIndex: artifact.currIndex + 1,
  }
}

/**
 * Creates a partial artifact update that restores the temporary content
 * to match the current version in the artifact's history
 *
 * This is essentially a "revert unsaved changes" operation that
 * discards any edits in the temporary buffer.
 *
 * @param artifact - The artifact object to restore
 * @returns A partial artifact object with the tmp field reset to the current version
 * @example
 * const restoredArtifact = {
 *   ...artifact,
 *   ...restoreArtifactChanges(artifact)
 * };
 */
function restoreArtifactChanges(
  artifact: Artifact
): Partial<Artifact> {
  return {
    tmp: artifact.versions[artifact.currIndex].text,
  }
}

/**
 * Converts a Blob to a base64-encoded data URL
 *
 * Uses FileReader to read the blob as a data URL, which produces a string
 * in the format: `data:[<mediatype>][;base64],<data>`
 *
 * @param blob - The Blob to convert to base64
 * @returns Promise resolving to the base64 data URL string
 * @example
 * const imageBlob = await fetch('https://example.com/image.jpg').then(r => r.blob());
 * const base64String = await blobToBase64(imageBlob);
 * // base64String contains: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA..."
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Checks if an artifact has unsaved changes
 *
 * Compares the temporary content buffer with the current version
 * to determine if there are pending changes.
 *
 * @param artifact - The artifact to check for unsaved changes
 * @returns True if the temporary content differs from the current version, false otherwise
 * @example
 * if (artifactUnsaved(artifact)) {
 *   // Prompt user to save changes
 * }
 */
function artifactUnsaved(artifact: Artifact): boolean {
  return artifact.tmp !== artifact.versions[artifact.currIndex].text
}

/**
 * Converts a base64 string to an ArrayBuffer
 *
 * Handles both raw base64 strings and data URLs (format: data:mediatype;base64,base64data).
 * If a data URL is provided, it extracts just the base64 data portion.
 *
 * @param base64 - The base64 string or data URL to convert
 * @returns ArrayBuffer containing the decoded binary data
 * @example
 * // Convert a data URL
 * const buffer = base64ToArrayBuffer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...');
 *
 * // Convert raw base64
 * const buffer = base64ToArrayBuffer('iVBORw0KGgoAAAANSUhEUgAA...');
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Handle data URLs by extracting just the base64 data portion
  const base64WithoutPrefix = base64.split(",").pop() || base64
  const binaryString = atob(base64WithoutPrefix)

  // Convert binary string to Uint8Array
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

/**
 * Recursively removes all properties with undefined values from an object
 *
 * This function modifies the object in place, removing any properties that
 * have undefined values. It recursively processes all nested objects.
 *
 * @param obj - The object to clean up
 * @example
 * const data = {
 *   name: "Test",
 *   age: undefined,
 *   details: {
 *     address: undefined,
 *     phone: "123-456-7890"
 *   }
 * };
 * removeUndefinedProps(data);
 * // data is now: { name: "Test", details: { phone: "123-456-7890" } }
 */
function removeUndefinedProps(obj: Record<string, any>): void {
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
/**
 * A fast 53-bit hash function for strings
 *
 * cyrb53 (c) 2018 bryc (github.com/bryc)
 * License: Public domain (or MIT if needed). Attribution appreciated.
 *
 * Features:
 * - Fast, non-cryptographic hash function
 * - Good distribution and avalanche properties
 * - 53-bit output that can be represented as an integer in JavaScript
 *
 * @param str - The string to hash
 * @param seed - Optional seed value (default: 0)
 * @returns A 53-bit hash as a number
 * @example
 * cyrb53("Hello world"); // Returns a consistent numeric hash
 * cyrb53("Hello world", 123); // Returns a different hash with the seed value
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

/**
 * Converts a string to a hexadecimal hash
 *
 * Uses the cyrb53 hash function and converts the result to a hexadecimal string.
 *
 * @param str - The string to hash
 * @param seed - Optional seed value (default: 0)
 * @returns A hexadecimal string representation of the hash
 * @example
 * hash53("Hello world"); // Returns something like "af0f34e1c064"
 */
function hash53 (str: string, seed = 0) {
  return cyrb53(str, seed).toString(16)
}

/**
 * Removes duplicate values from an array
 *
 * Uses a Set to filter out duplicate values and returns a new array with
 * only unique values. For object arrays, this only removes references to the
 * exact same object, not objects with the same content.
 *
 * @param arr - The input array that may contain duplicates
 * @returns A new array containing only unique values
 * @example
 * removeDuplicates([1, 2, 2, 3, 3, 3]); // Returns [1, 2, 3]
 * removeDuplicates(['a', 'b', 'a', 'c']); // Returns ['a', 'b', 'c']
 */
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
  getFileName
}
