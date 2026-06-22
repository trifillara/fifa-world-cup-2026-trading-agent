/**
 * Minimal console logger.
 *
 * Replaces the previously-used `sleek-pretty` package, which shipped a broken
 * build (missing `dist/logger.js`) and crashed the app on startup. Line
 * formatting (colors, timestamps, topics) is handled by `terminal.ts`, so this
 * logger just forwards already-formatted strings to the console.
 */
export interface Logger {
  trace(message?: unknown, ...args: unknown[]): void;
  debug(message?: unknown, ...args: unknown[]): void;
  info(message?: unknown, ...args: unknown[]): void;
  warn(message?: unknown, ...args: unknown[]): void;
  error(message?: unknown, ...args: unknown[]): void;
  fatal(message?: unknown, ...args: unknown[]): void;
}

export const logger: Logger = {
  trace: (message, ...args) => console.log(message, ...args),
  debug: (message, ...args) => console.log(message, ...args),
  info: (message, ...args) => console.log(message, ...args),
  warn: (message, ...args) => console.warn(message, ...args),
  error: (message, ...args) => console.error(message, ...args),
  fatal: (message, ...args) => console.error(message, ...args),
};

export default logger;
