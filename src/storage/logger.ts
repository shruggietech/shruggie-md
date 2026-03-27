import type { StorageAdapter, LogLevel } from "./types";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

export class Logger {
  private storage: StorageAdapter | null;
  private verbosity: LogLevel;

  constructor(storage: StorageAdapter | null, verbosity: LogLevel = "warning") {
    this.storage = storage;
    this.verbosity = verbosity;
  }

  setVerbosity(level: LogLevel) {
    this.verbosity = level;
  }

  setStorage(storage: StorageAdapter) {
    this.storage = storage;
  }

  async debug(source: string, message: string, metadata?: unknown): Promise<void> {
    await this.log("debug", source, message, metadata);
  }

  async info(source: string, message: string, metadata?: unknown): Promise<void> {
    await this.log("info", source, message, metadata);
  }

  async warning(source: string, message: string, metadata?: unknown): Promise<void> {
    await this.log("warning", source, message, metadata);
  }

  async error(source: string, message: string, metadata?: unknown): Promise<void> {
    await this.log("error", source, message, metadata);
  }

  private async log(
    level: LogLevel,
    source: string,
    message: string,
    metadata?: unknown,
  ): Promise<void> {
    // Always write to console in development mode
    if (import.meta.env.DEV) {
      const consoleFn =
        level === "debug"
          ? console.debug
          : level === "info"
            ? console.info
            : level === "warning"
              ? console.warn
              : console.error;
      consoleFn(`[${level}] [${source}]`, message, metadata ?? "");
    }

    // Only persist if at or above verbosity threshold
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.verbosity]) return;

    if (!this.storage) return;

    try {
      await this.storage.appendLog({
        level,
        source,
        message,
        metadata: metadata != null ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Don't let logging failures crash the application
    }
  }
}

// ── Module-level singleton ────────────────────────────────────────────

let loggerInstance: Logger | null = null;

export function initLogger(
  storage: StorageAdapter,
  verbosity: LogLevel = "warning",
): Logger {
  loggerInstance = new Logger(storage, verbosity);
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    // Return a console-only logger before initialization
    loggerInstance = new Logger(null);
  }
  return loggerInstance;
}
