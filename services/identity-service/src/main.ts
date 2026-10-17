import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { createLogger } from "@lavieco/observability";
import { ConfigError, NestLoggerAdapter, configureServiceApp } from "@lavieco/service-kit";

import { AppModule } from "./app.module";
import { loadIdentityEnv } from "./config/env";

async function bootstrap() {
  const bootLogger = createLogger({ service: "identity-service" });
  let env;
  try {
    env = loadIdentityEnv();
  } catch (error) {
    if (error instanceof ConfigError) {
      bootLogger.error("invalid environment, refusing to start", { keys: error.invalidKeys });
      process.exit(1);
    }
    throw error;
  }

  const logger = createLogger({ service: "identity-service", level: env.LOG_LEVEL });
  const app = await NestFactory.create(AppModule.forRoot(env, { logger }), {
    bodyParser: false,
    logger: new NestLoggerAdapter(logger),
  });
  configureServiceApp(app, logger);
  // Private network only (docs/02 §3.3): compose never publishes this port.
  await app.listen(env.PORT);
  logger.info("identity-service listening", { port: env.PORT });
}

void bootstrap();
