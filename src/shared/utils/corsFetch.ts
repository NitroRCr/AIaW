import { CorsFetchBaseURL } from "./config"
import { fetch, IsCapacitor, IsTauri } from "./platformApi"

/**
 * Fetch options for cross-origin requests
 */
interface CorsFetchOptions {
  /** HTTP method for the request */
  method?: string;
  /** HTTP headers to include with the request */
  headers?: Record<string, string>;
  /** Request body data */
  body?: any;
}

/**
 * Performs a cross-origin fetch request using appropriate platform-specific methods
 *
 * @param url - The URL to fetch from
 * @param options - Fetch request options
 * @returns Promise resolving to fetch response
 * @throws Error if cross-origin fetching is not supported in current deployment
 */
export async function corsFetch(
  url: string,
  options?: CorsFetchOptions
): Promise<Response> {
  const { method = "GET", headers = {}, body } = options || {}

  if (IsCapacitor || IsTauri) return fetch(url, { method, headers, body })

  if (!CorsFetchBaseURL) throw new Error("CORS fetch base URL is not set")

  const response = await fetch(`${CorsFetchBaseURL}/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method,
      url,
      headers,
      body,
    }),
  })

  return response
}
