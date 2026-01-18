/**
 * Request history entry structure.
 */
export interface HistoryEntry {
     id: string;
     timestamp: string;
     method: string;
     url: string;
     path: string;
     query: Record<string, unknown>;
     headers: Record<string, string | string[] | undefined>;
     body: unknown;
     statusCode?: number;
     responseTime?: number;
}

/**
 * Filter options for querying history.
 */
export interface HistoryFilter {
     endpoint?: string;
     method?: string;
     statusCode?: number;
     limit?: number;
}
