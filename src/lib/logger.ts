type LogLevel = "info" | "warn" | "error" | "debug";

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function formatTime(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = formatTime();
  const color = COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET}`;

  if (meta && Object.keys(meta).length > 0) {
    console[level === "debug" ? "log" : level](`${prefix} ${timestamp} ${message}`, meta);
  } else {
    console[level === "debug" ? "log" : level](`${prefix} ${timestamp} ${message}`);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};

// --- API Error handler wrapper ---
import { NextResponse } from "next/server";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

type HandlerFn = (req: Request, context?: any) => Promise<Response | NextResponse>;

export function withErrorHandler(handler: HandlerFn): HandlerFn {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn(`API ${err.statusCode}: ${err.message}`, { details: err.details });
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.statusCode });
      }

      logger.error("Unhandled API error", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
      return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
    }
  };
}
