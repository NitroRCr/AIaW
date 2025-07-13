import {
  Array as TArray,
  Object,
  String,
  Unsafe,
  Optional,
  Number,
} from "@sinclair/typebox"

import { Plugin, PluginData } from "@/shared/types"
import { SearxngBaseURL } from "@/shared/utils/config"
import { fetch } from "@/shared/utils/platformApi"

import { i18n } from "@/boot/i18n"

const { t } = i18n.global

const JinaReaderURL = "https://r.jina.ai"

const prompt = `<role>
You are an AI assistant equipped with tools to access external and up-to-date information from the internet. Your primary goal is to provide accurate, comprehensive, and well-cited answers to user queries. You have access to the following tools:
- \`aiaw-web-search\`: Performs web searches using SearXNG. Can execute multiple queries simultaneously.
- \`aiaw-web-crawl\`: Fetches the full content of specific webpage URLs.
</role>

<tools_guide>
<tool name="aiaw-web-search">
  <description>Use this tool to search the web for information when the answer is not known, requires current data, or involves topics where external validation is beneficial.</description>
  <usage_guidelines>
    - **Decomposition:** Break down complex user questions into 1-3 specific search queries. Consider searching in both the user's language and English for broader coverage.
    - **Engine Selection:** Use default search engines unless the query relates to specific domains. For specialized content, you can suggest using one or more of the following engines:
      \`google\`, \`bing\`, \`duckduckgo\`, \`npm\`, \`pypi\`, \`github\`, \`arxiv\`, \`google_scholar\`, \`z-library\`, \`reddit\`, \`imdb\`, \`brave\`, \`wikipedia\`, \`pinterest\`, \`unsplash\`, \`vimeo\`, \`youtube\`.
      Example: For academic papers, suggest \`arxiv\` and \`google_scholar\`.
  </usage_guidelines>
</tool>
<tool name="aiaw-web-crawl">
  <description>Use this tool to retrieve the full content of a specific webpage.</description>
  <usage_guidelines>
    - Use this *primarily* when a user explicitly provides a URL in their query.
    - Use this *secondarily* after a web search, if a specific search result link seems highly relevant and likely contains detailed information not fully captured in the search snippet, but the snippet itself is insufficient.
    - Avoid crawling generic homepages or search result pages unless absolutely necessary and justified. Focus on pages likely to contain specific answers.
  </usage_guidelines>
</tool>
</tools_guide>

<decision_logic>
Follow this process to determine when and how to use the tools:

1.  **Analyze User Query:** Understand the user's intent and the nature of the information requested.
2.  **Check Internal Knowledge:** If the answer is well-established, common knowledge, and not time-sensitive (e.g., "What is the capital of France?"), answer directly without using tools.
3.  **Check for Explicit Instructions:**
    *   If the user explicitly asks you to search for something (e.g., "Search for recent news on AI"), prioritize using \`aiaw-web-search\`.
    *   If the user provides a URL and asks you to summarize, analyze, or extract information from it (e.g., "What does this page say? https://example.com"), prioritize using \`aiaw-web-crawl\` on that URL.
4.  **Check for Provided URLs:** If the user includes a URL in their query *without* explicitly asking to crawl it, but the context implies referencing it is necessary to answer the question, use \`aiaw-web-crawl\` first to understand the content of the URL before deciding on further actions (like searching).
5.  **Assess Need for External Information:** If the query requires current information (news, recent events, stock prices), specific facts not readily known, or information where multiple sources are needed for validation, proceed to use \`aiaw-web-search\`.
    *   Formulate 1-3 targeted search queries based on the user's question. Consider language variations (user language + English).
    *   Specify relevant search engines if applicable (see \`<tool name="aiaw-web-search">\` guidelines).
6.  **Evaluate Search Results:**
    *   If the search results provide sufficient information to answer the query accurately and comprehensively, synthesize the answer based on these results. **Always cite your sources.**
    *   If the search results are insufficient or lack credibility, BUT one or more specific links look promising and likely contain the required detailed information, use \`aiaw-web-crawl\` to fetch the content of those specific pages (usually 1-2 most promising links). Then, synthesize the answer based on the crawled content. **Always cite your sources.**
    *   If the search results are poor and no specific links seem promising, consider refining your search queries (e.g., different keywords, different engines) and perform another search using \`aiaw-web-search\`.
7.  **Handle Insufficient Information:** If after searching, crawling promising links, and potentially re-searching, you still cannot find a reliable answer, inform the user that you were unable to find the specific information requested through the available tools.
</decision_logic>

<response_format>
- **Language:** Respond in the **same language** as the user's query.
- **Citations:** **Crucially, always cite the sources** you used (from search results or crawled pages) to formulate your answer. Use Markdown footnote style for citations. Place the citation marker \`[^N]\` immediately after the information it supports, and list the full reference at the end of your response or paragraph. The reference should include the URL and ideally the title of the source page.

<citation_examples>
<example lang="en">
According to recent studies, global temperatures have risen by 1.1°C since pre-industrial times.[^1]

[^1]: [Climate Report in 2023](https://example.org/climate-report-2023)
</citation_examples>
</response_format>

<meta_info>
Current time: {{ _currentTime }}
</meta_info>
`

async function search ({ q, engines, timeRange }, settings) {
  const url = new URL(settings.searxngURL || SearxngBaseURL, location.origin)
  url.searchParams.set("format", "json")
  url.searchParams.set("q", q)
  settings.defaultEngines &&
    url.searchParams.set("engines", settings.defaultEngines)
  engines && url.searchParams.set("engines", engines)
  timeRange && url.searchParams.set("time_range", timeRange)
  const response = await fetch(url)

  if (response.status === 502) {
    throw new Error(t("webSearchPlugin.configureSearxngMessage"))
  }

  if (!response.ok) {
    throw new Error(`Failed to search: ${response.statusText}`)
  }

  const { query, results } = await response.json()

  return {
    query,
    results: results
      .map(({ title, url, content, publishedDate, thumbnail, engine }) => ({
        title,
        url,
        content,
        publishedDate,
        thumbnail,
        engine,
      }))
      .slice(0, settings.resultsLimit),
  }
}

async function crawl (url, settings) {
  const response = await fetch(new URL(`/${url}`, JinaReaderURL), {
    headers: settings.jinaApiKey
      ? {
          Authorization: `Bearer ${settings.jinaApiKey}`,
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error(`Failed to crawl: ${response.statusText}`)
  }

  return await response.text()
}

const pluginId = "aiaw-web"

const plugin: Plugin = {
  id: pluginId,
  type: "builtin",
  title: t("webSearchPlugin.title"),
  description: t("webSearchPlugin.description"),
  available: true,
  prompt,
  apis: [
    {
      type: "tool",
      name: "search",
      description: t("webSearchPlugin.toolSearchCaption"),
      prompt: "Use the search engine to search the web",
      parameters: Object({
        searches: TArray(
          Object({
            q: String({ description: "The search query" }),
            engines: Optional(
              String({
                description:
                  "Comma separated list, specifies the active search engines",
              })
            ),
            timeRange: Optional(
              Unsafe({
                type: "string",
                description:
                  "The time range for the search, unlimited by default",
                enum: ["day", "month", "year"],
              })
            ),
          })
        ),
      }),
      async execute ({ searches }, settings) {
        const res = await Promise.all(searches.map((s) => search(s, settings)))

        return [
          {
            type: "text",
            contentText: JSON.stringify(res, null, 2),
          },
        ]
      },
    },
    {
      type: "tool",
      name: "crawl",
      description: t("webSearchPlugin.toolCrawlCaption"),
      prompt: "Get the content of web pages",
      parameters: Object({
        urls: TArray(String(), { description: "The URLs to crawl" }),
      }),
      async execute ({ urls }, settings) {
        const res = await Promise.all(urls.map((url) => crawl(url, settings)))

        return [
          {
            type: "text",
            contentText: JSON.stringify(res, null, 2),
          },
        ]
      },
    },
  ],
  fileparsers: [],
  settings: Object({
    searxngURL: Optional(
      String({
        title: "SearXNG URL",
        description: t("webSearchPlugin.searxngURLCaption"),
      })
    ),
    jinaApiKey: Optional(
      String({
        title: "Jina API Key",
        description: t("webSearchPlugin.jinaApiKeyCaption"),
        format: "password",
      })
    ),
    defaultEngines: Optional(
      String({
        title: t("webSearchPlugin.defaultEngines"),
        description: t("webSearchPlugin.defaultEnginesCaption"),
      })
    ),
    resultsLimit: Number({
      title: t("webSearchPlugin.resultsLimit"),
      description: t("webSearchPlugin.resultsLimitCaption"),
    }),
  }),
}

const defaultData: PluginData = {
  settings: {
    resultsLimit: 15,
  },
  avatar: { type: "icon", icon: "sym_o_travel_explore", hue: 225 },
  fileparsers: {},
}

export default {
  pluginId,
  plugin,
  defaultData,
}
