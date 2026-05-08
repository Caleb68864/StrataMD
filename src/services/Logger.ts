export type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel?: LogLevel) {
    this.minLevel = minLevel ?? (process.env.NODE_ENV === "production" ? "warn" : "debug");
  }

  debug(message: string, ...meta: unknown[]): void {
    this.write("debug", message, meta);
  }

  info(message: string, ...meta: unknown[]): void {
    this.write("info", message, meta);
  }

  warn(message: string, ...meta: unknown[]): void {
    this.write("warn", message, meta);
  }

  error(message: string, ...meta: unknown[]): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta: unknown[]): void {
    if (levelPriority[level] < levelPriority[this.minLevel]) return;
    console[level](`[StrataMD] ${message}`, ...meta);
  }
}
