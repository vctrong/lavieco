import { type DynamicModule, Module } from "@nestjs/common";

import { ContentOutboxHandlers } from "./outbox-handlers";

/** Thin module: only registers handlers; reading/locking/retrying is in service-kit. */
@Module({})
export class ContentOutboxModule {
  /** `media` is the same configured module the app imports (Nest keeps one instance). */
  static forRoot(media: DynamicModule): DynamicModule {
    return { module: ContentOutboxModule, imports: [media], providers: [ContentOutboxHandlers] };
  }
}
