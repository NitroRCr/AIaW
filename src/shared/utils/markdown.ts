export function isMarkdown(text: string) {
  const markdownPatterns = [
    /^#{1,6} /, // headings
    /\*\*.*\*\*/, // bold
    /\*.*\*/, // italic
    /!\[.*\]\(.*\)/, // images
    /\[.*\]\(.*\)/, // links
    /^> /, // blockquote
    /^(\*|-|\+) /, // unordered list
    /^\d+\. /, // ordered list
    /`{1,3}[^`]+`{1,3}/, // inline code or code block
  ]

  return markdownPatterns.some((pattern) => pattern.test(text))
}
