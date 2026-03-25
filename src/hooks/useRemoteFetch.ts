import { useState, useCallback } from "react";

export interface FetchResult {
  content: string;
  error: string | null;
}

export interface UseRemoteFetchReturn {
  fetchUrl: (url: string) => Promise<FetchResult>;
  isFetching: boolean;
}

/**
 * Fetches a remote markdown URL via plain HTTP GET.
 * Validates that the response is text content.
 * Fetched content is read-only (save disabled).
 * No disk caching.
 */
export function useRemoteFetch(): UseRemoteFetchReturn {
  const [isFetching, setIsFetching] = useState(false);

  const fetchUrl = useCallback(async (url: string): Promise<FetchResult> => {
    setIsFetching(true);
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          content: "",
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type") ?? "";
      const isText =
        contentType.includes("text/") ||
        contentType.includes("application/json") ||
        contentType.includes("application/xml") ||
        contentType === "";

      if (!isText) {
        return {
          content: "",
          error: `Invalid content type: "${contentType}". Expected text content.`,
        };
      }

      const content = await response.text();
      return { content, error: null };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network request failed";
      return { content: "", error: message };
    } finally {
      setIsFetching(false);
    }
  }, []);

  return { fetchUrl, isFetching };
}
