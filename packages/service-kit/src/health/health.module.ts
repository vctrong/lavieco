import { Controller, Get, HttpCode, Module, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Connection } from "mongoose";

import { PublicEndpoint } from "../auth/access.decorators";

/** Liveness and readiness probes used by Docker/compose health checks (docs/02 §11). */
@ApiExcludeController()
@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get("live")
  @PublicEndpoint()
  @HttpCode(200)
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @PublicEndpoint()
  async ready() {
    const db = this.connection.db;
    if (this.connection.readyState !== 1 || !db) throw new ServiceUnavailableException();
    await db.admin().ping();
    return { status: "ok" };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
