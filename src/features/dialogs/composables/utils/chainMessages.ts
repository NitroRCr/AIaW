import { CoreMessage } from "ai"

import { getFileUrl } from "@/shared/composables/storage/utils"
import { genId, mimeTypeMatch } from "@/shared/utils"

import { DialogMessageNested } from "@/services/data/types/dialogMessage"
import { MessageContentNested } from "@/services/data/types/messageContents"
import { StoredItem } from "@/services/data/types/storedItem"

import { storedItemResultContent } from "../../utils/dialogMessageUtils"

import { TreeListItem } from "./dialogTreeUtils"

/**
   * Gets relevant dialog items based on context window and filters out inputing messages
   * @returns Flattened array of message contents
   */
export function getRelevantDialogItems(dialogItems: TreeListItem<DialogMessageNested>[], contextNum: number = 0): MessageContentNested[] {
  return dialogItems
    .slice(-contextNum)
    .filter((item) => item.message.status !== "inputing")
    .map((item) => item.message.messageContents as MessageContentNested[])
    .flat()
}

/**
   * Builds a list of messages for the LLM chain from dialog history
   * @returns Array of CoreMessages for the LLM
   */
function getChainMessages(dialogItems: TreeListItem<DialogMessageNested>[], mimeTypes: string[], contextNum:number = 0): CoreMessage[] {
  const messages = getRelevantDialogItems(dialogItems, contextNum)
  let result: CoreMessage[] = []

  for (const content of messages) {
    if (content.type === "user-message") {
      result.push(processUserMessage(content, mimeTypes))
    } else if (content.type === "assistant-message") {
      result.push(processAssistantMessage(content))
    } else if (content.type === "assistant-tool") {
      result = result.concat(processAssistantTool(content))
    }
  }
  console.log("---getChainMessages", result)

  return result
}

/**
   * Processes a user message
   * @param content The message content
   * @returns CoreMessage for the user message
   */
function processUserMessage(content: MessageContentNested, mimeTypes: string[]): CoreMessage {
  return {
    role: "user",
    content: [
      { type: "text", text: content.text },
      ...processStoredItems(content.storedItems, mimeTypes),
    ],
  }
}

/**
   * Processes stored items from a message
   * @param storedItems Array of stored items
   * @returns Array of processed items
   */
function processStoredItems(storedItems: StoredItem[], mimeTypes: string[]) {
  return storedItems.map((item) => {
    if (item.contentText != null) {
      return processTextItem(item)
    } else {
      return processNonTextItem(item, mimeTypes)
    }
  }).filter(Boolean) // Remove nulls
}

/**
   * Processes an assistant message
   * @param content The message content
   * @returns CoreMessage for the assistant message
   */
function processAssistantMessage(content: MessageContentNested): CoreMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text: content.text }],
  }
}

/**
   * Processes an assistant tool call and its result
   * @param content The tool call content
   * @returns Array of CoreMessages for the tool call and result
   */
function processAssistantTool(content: MessageContentNested): CoreMessage[] {
  if (content.status !== "completed") return []

  const { name, args, result, pluginId } = content
  const id = genId()

  // Create tool call message
  const toolCallMessage: CoreMessage = {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolName: `${pluginId}-${name}`,
        toolCallId: id,
        args,
      },
    ],
  }

  // Create tool result message
  const resultContent = result.map((i) => storedItemResultContent(i))
  const toolResultMessage: CoreMessage = {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolName: `${pluginId}-${name}`,
        toolCallId: id,
        result: resultContent,
      },
    ],
  }

  return [toolCallMessage, toolResultMessage]
}

/**
   * Processes text-based stored items (file, quote, or plain text)
   * @param item The stored item to process
   * @returns Processed text item or null
   */
function processTextItem(item: StoredItem) {
  if (item.type === "file") {
    return {
      type: "text" as const,
      text: `<file_content filename="${item.name}">\n${item.contentText}\n</file_content>`,
    }
  } else if (item.type === "quote") {
    return {
      type: "text" as const,
      text: `<quote name="${item.name}">${item.contentText}</quote>`,
    }
  } else {
    return { type: "text" as const, text: item.contentText }
  }
}

/**
   * Processes non-text stored items (images, files)
   * @param item The stored item to process
   * @returns Processed media item or null if not supported
   */
function processNonTextItem(item: StoredItem, mimeTypes: string[]) {
  if (!mimeTypeMatch(item.mimeType, mimeTypes)) {
    return null
  } else if (item.mimeType.startsWith("image/")) {
    return {
      type: "image" as const,
      image: getFileUrl(item.fileUrl),
      mimeType: item.mimeType,
    }
  } else {
    return {
      type: "file" as const,
      mimeType: item.mimeType,
      data: getFileUrl(item.fileUrl),
    }
  }
}

export { getChainMessages }
