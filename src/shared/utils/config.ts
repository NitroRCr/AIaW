export const MaxMessageFileSizeMB = parseFloat(
  process.env.MAX_MESSAGE_FILE_SIZE_MB || "20"
)

const addBaseURL = (baseURL: string) => {
  if (!baseURL.startsWith("http")) {
    return new URL(baseURL, window.location.origin).href
  }

  return baseURL
}
export const DocParseBaseURL = addBaseURL(process.env.DOC_PARSE_BASE_URL || "/doc-parse/parse")
export const CorsFetchBaseURL = addBaseURL(process.env.CORS_FETCH_BASE_URL || "/cors/proxy")
export const CyberLiteLLMBaseURL = addBaseURL(process.env.CYBER_LITELLM_BASE_URL || "/litellm/v1")
export const SearxngBaseURL = addBaseURL(process.env.SEARXNG_BASE_URL || "/searxng")
