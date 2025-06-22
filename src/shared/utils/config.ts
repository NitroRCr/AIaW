export const MaxMessageFileSizeMB = parseFloat(
  process.env.MAX_MESSAGE_FILE_SIZE_MB || "20"
)
export const DocParseBaseURL = process.env.DOC_PARSE_BASE_URL || "/doc-parse/parse"
export const CorsFetchBaseURL = process.env.CORS_FETCH_BASE_URL || "/cors/proxy"
export const CyberLiteLLMBaseURL = process.env.CYBER_LITELLM_BASE_URL || "/litellm/v1"
export const SearxngBaseURL = process.env.SEARXNG_BASE_URL || "/searxng"
