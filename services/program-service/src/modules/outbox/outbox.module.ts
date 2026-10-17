import { type DynamicModule, Module } from "@nestjs/common";

import { ProgramOutboxHandlers, REVALIDATE_FETCH } from "./outbox-handlers";

/** Thin module: only registers handlers; reading/locking/retrying is in service-kit. */
@Module({})
export class ProgramOutboxModule {
  /** `fetchImpl` lets tests capture the revalidation calls made to `web`. */
  static forRoot(fetchImpl: typeof fetch = fetch): DynamicModule {
    return {
      module: ProgramOutboxModule,
      providers: [{ provide: REVALIDATE_FETCH, useValue: fetchImpl }, ProgramOutboxHandlers],
    };
  }
}
