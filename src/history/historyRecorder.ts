import type { HistoryEntry, HistoryFilter } from "./types.js";
import { randomUUID } from "node:crypto";

/**
 * In-memory request history recorder.
 */
export class HistoryRecorder {
     private entries: HistoryEntry[] = [];
     private readonly maxEntries: number;

     /**
      * Create a new history recorder.
      * @param maxEntries Maximum number of entries to keep (default 1000).
      */
     constructor(maxEntries = 1000) {
          this.maxEntries = maxEntries;
     }

     /**
      * Record a new request.
      */
     record(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
          const fullEntry: HistoryEntry = {
               id: randomUUID(),
               timestamp: new Date().toISOString(),
               ...entry
          };

          this.entries.push(fullEntry);

          // Keep only the most recent entries
          if (this.entries.length > this.maxEntries) {
               this.entries.shift();
          }

          return fullEntry;
     }

     /**
      * Get all history entries, optionally filtered.
      */
     query(filter?: HistoryFilter): HistoryEntry[] {
          let results = this.entries;

          if (filter?.endpoint) {
               results = results.filter((e) => e.path === filter.endpoint);
          }

          if (filter?.method) {
               results = results.filter((e) => e.method.toUpperCase() === filter.method?.toUpperCase());
          }

          if (filter?.statusCode !== undefined) {
               results = results.filter((e) => e.statusCode === filter.statusCode);
          }

          if (filter?.limit && filter.limit > 0) {
               results = results.slice(-filter.limit);
          }

          return results;
     }

     /**
      * Clear all history entries.
      */
     clear(): void {
          this.entries = [];
     }

     /**
      * Get the total number of recorded entries.
      */
     count(): number {
          return this.entries.length;
     }
}
