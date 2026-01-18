/**
 * Logger configuration options.
 */
export interface LoggerOptions {
     /**
      * Enable/disable logging.
      */
     enabled: boolean;

     /**
      * Log format: 'pretty' for colored console output, 'json' for structured logs.
      */
     format: "pretty" | "json";

     /**
      * Log level: 'trace', 'debug', 'info', 'warn', 'error', 'fatal'.
      */
     level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
}

/**
 * Request log entry structure.
 */
export interface RequestLogEntry {
     method: string;
     url: string;
     statusCode: number;
     responseTime: number;
     timestamp: string;
}
