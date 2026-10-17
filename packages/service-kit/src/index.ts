export {
  ACCESS_RULE,
  AllowServices,
  CurrentPrincipal,
  PublicEndpoint,
  RequireMember,
  RequirePermission,
  RequireStaff,
  type AccessRule,
  type RequestWithPrincipal,
} from "./auth/access.decorators";
export { AccessGuard, TOKEN_VERIFIER } from "./auth/access.guard";
export { AuthModule, parseTrustedServiceKeys } from "./auth/auth.module";
export type {
  MemberPrincipal,
  Principal,
  ServicePrincipal,
  StaffPrincipal,
} from "./auth/principal";
export { TokenVerifier, type TokenVerifierOptions } from "./auth/token-verifier";
export { buildOpenApiDocument, configureServiceApp } from "./bootstrap/configure-app";
export { SERVICE_CONFIG, ServiceConfigModule } from "./config/config.module";
export {
  ConfigError,
  baseServiceEnvSchema,
  databaseIsolationIssue,
  loadConfig,
  type BaseServiceEnv,
} from "./config/load-config";
export { ProblemDetailsFilter } from "./errors/problem-details.filter";
export { HealthController, HealthModule } from "./health/health.module";
export { LOGGER, LoggingModule, NestLoggerAdapter } from "./logging/logging.module";
export {
  MongoModule,
  MongoUnitOfWork,
  UNIT_OF_WORK,
  sessionOf,
  type MongoModuleOptions,
} from "./mongo/mongo.module";
export {
  EMAIL_SENDER,
  NotifyModule,
  SmtpEmailSender,
  mailEnvSchema,
  type MailEnv,
} from "./notify/notify.module";
export { OUTBOX_MODEL, OUTBOX_RETENTION_DAYS, outboxSchema } from "./outbox/outbox.model";
export { OUTBOX_PORT, OutboxModule } from "./outbox/outbox.module";
export {
  OutboxWorker,
  OutboxWriter,
  backoffMs,
  type OutboxHandler,
  type OutboxOptions,
} from "./outbox/outbox.service";
export {
  REQUEST_ID_HEADER,
  currentRequestId,
  requestIdMiddleware,
} from "./request-context/request-context";
export {
  ApiZodResponse,
  RequestValidationError,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  toOpenApiSchema,
} from "./validation/zod";
export type * from "./ports";
