import { type DynamicModule, Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { OUTBOX_MODEL, outboxSchema } from "./outbox.model";
import { OUTBOX_OPTIONS, OutboxWorker, OutboxWriter, type OutboxOptions } from "./outbox.service";

export const OUTBOX_PORT = Symbol("OUTBOX_PORT");

const DEFAULTS: OutboxOptions = {
  runWorker: true,
  pollIntervalMs: 1_000,
  leaseMs: 60_000,
  maxAttempts: 8,
};

/**
 * Outbox reading/locking/retrying lives here once; services only register handlers
 * (docs/04 §6.5). Requires `MongoModule`.
 */
@Global()
@Module({})
export class OutboxModule {
  static forRoot(options: Partial<OutboxOptions> = {}): DynamicModule {
    return {
      module: OutboxModule,
      imports: [MongooseModule.forFeature([{ name: OUTBOX_MODEL, schema: outboxSchema }])],
      providers: [
        { provide: OUTBOX_OPTIONS, useValue: { ...DEFAULTS, ...options } },
        OutboxWriter,
        OutboxWorker,
        { provide: OUTBOX_PORT, useExisting: OutboxWriter },
      ],
      exports: [OUTBOX_PORT, OutboxWorker],
    };
  }
}
