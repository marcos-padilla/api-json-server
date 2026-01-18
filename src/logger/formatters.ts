import chalk from "chalk";

/**
 * Format HTTP status code with color based on status range.
 */
export function formatStatusCode(statusCode: number): string {
     if (statusCode >= 500) {
          return chalk.red(statusCode.toString());
     }
     if (statusCode >= 400) {
          return chalk.yellow(statusCode.toString());
     }
     if (statusCode >= 300) {
          return chalk.cyan(statusCode.toString());
     }
     if (statusCode >= 200) {
          return chalk.green(statusCode.toString());
     }
     return chalk.white(statusCode.toString());
}

/**
 * Format HTTP method with color.
 */
export function formatMethod(method: string): string {
     const colors: Record<string, (str: string) => string> = {
          GET: chalk.green,
          POST: chalk.blue,
          PUT: chalk.yellow,
          PATCH: chalk.magenta,
          DELETE: chalk.red,
          HEAD: chalk.gray,
          OPTIONS: chalk.cyan
     };
     const formatter = colors[method.toUpperCase()] || chalk.white;
     return formatter(method.toUpperCase().padEnd(7));
}

/**
 * Format response time with color based on duration.
 */
export function formatResponseTime(ms: number): string {
     const formatted = `${ms.toFixed(2)}ms`;
     if (ms > 1000) return chalk.red(formatted);
     if (ms > 500) return chalk.yellow(formatted);
     if (ms > 100) return chalk.cyan(formatted);
     return chalk.green(formatted);
}

/**
 * Format timestamp in readable format.
 */
export function formatTimestamp(date: Date): string {
     const hours = date.getHours().toString().padStart(2, "0");
     const minutes = date.getMinutes().toString().padStart(2, "0");
     const seconds = date.getSeconds().toString().padStart(2, "0");
     return chalk.gray(`[${hours}:${minutes}:${seconds}]`);
}

/**
 * Format a log level with appropriate color.
 */
export function formatLogLevel(level: string): string {
     const colors: Record<string, (str: string) => string> = {
          trace: chalk.gray,
          debug: chalk.cyan,
          info: chalk.blue,
          warn: chalk.yellow,
          error: chalk.red,
          fatal: chalk.bgRed.white
     };
     const formatter = colors[level.toLowerCase()] || chalk.white;
     return formatter(level.toUpperCase().padEnd(5));
}
