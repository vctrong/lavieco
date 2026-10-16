import pino, { type DestinationStream, type Logger as PinoLogger } from "pino";

import { redact } from "./redaction";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type LogFields = Record<string, unknown>;

/** The logging surface used everywhere. Fields are redacted before they are written. */
export interface Logger {
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

export type CreateLoggerOptions = {
  /** Component name, e.g. `identity-service` or `web`. */
  service: string;
  level?: LogLevel;
  /** Test hook: write somewhere else than stdout. */
  destination?: DestinationStream;
};

class RedactingLogger implements Logger {
  constructor(private readonly inner: PinoLogger) {}

  error(message: string, fields?: LogFields) {
    this.inner.error(this.clean(fields), message);
  }
  warn(message: string, fields?: LogFields) {
    this.inner.warn(this.clean(fields), message);
  }
  info(message: string, fields?: LogFields) {
    this.inner.info(this.clean(fields), message);
  }
  debug(message: string, fields?: LogFields) {
    this.inner.debug(this.clean(fields), message);
  }
  child(bindings: LogFields): Logger {
    return new RedactingLogger(this.inner.child(this.clean(bindings)));
  }

  private clean(fields: LogFields | undefined): LogFields {
    return fields ? (redact(fields) as LogFields) : {};
  }
}

/**
 * JSON logger with personal data masked (S7). Messages are fixed English strings;
 * anything variable goes into `fields`, which pass through `redact`.
 */
export function createLogger({
  service,
  level = "info",
  destination,
}: CreateLoggerOptions): Logger {
  const base = pino(
    {
      level,
      base: { service },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
    },
    destination,
  );
  return new RedactingLogger(base);
}
