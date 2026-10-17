import { type DynamicModule, Module } from "@nestjs/common";

import { ProgramOutboxHandlers, REVALIDATE_FETCH } from "./outbox-handlers";

/** Thin module: only registers handlers; reading/locking/retrying is in service-kit. */
@Module({})
export class ProgramOutboxModule {
  /** `fetchImpl` lets tests capture the revalidation calls made to `web`. */
  static forRoot(events: DynamicModule, fetchImpl: typeof fetch = fetch): DynamicModule {
    return {
      module: ProgramOutboxModule,
      // Same configured events module as the app's (Nest keeps a single instance).
      imports: [events],
      providers: [{ provide: REVALIDATE_FETCH, useValue: fetchImpl }, ProgramOutboxHandlers],
    };
  }
}
