import { type DynamicModule, Global, type LoggerService, Module } from "@nestjs/common";

import { createLogger, type LogLevel, type Logger } from "@lavieco/observability";

/** Injection token of the service logger (`@lavieco/observability`, S7). */
export const LOGGER = Symbol("LOGGER");

/** Routes Nest's own messages (start-up, routing) through the redacting logger. */
export class NestLoggerAdapter implements LoggerService {
  constructor(private readonly logger: Logger) {}
  log(message: unknown, context?: string) {
    this.logger.info(String(message), { context });
  }
  error(message: unknown, trace?: string, context?: string) {
    this.logger.error(String(message), { context, trace });
  }
  warn(message: unknown, context?: string) {
    this.logger.warn(String(message), { context });
  }
  debug(message: unknown, context?: string) {
    this.logger.debug(String(message), { context });
  }
  verbose(message: unknown, context?: string) {
    this.logger.debug(String(message), { context });
  }
}

@Global()
@Module({})
export class LoggingModule {
  static forRoot(options: { service: string; level?: LogLevel; logger?: Logger }): DynamicModule {
    const logger =
      options.logger ?? createLogger({ service: options.service, level: options.level });
    return {
      module: LoggingModule,
      providers: [{ provide: LOGGER, useValue: logger }],
      exports: [LOGGER],
    };
  }
}
