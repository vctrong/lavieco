import { type DynamicModule, Global, Injectable, Module } from "@nestjs/common";
import { InjectConnection, MongooseModule } from "@nestjs/mongoose";
import type { ClientSession, Connection } from "mongoose";

import type { TxContext, UnitOfWork } from "../ports";

export const UNIT_OF_WORK = Symbol("UNIT_OF_WORK");

/** Unwraps the opaque transaction handed to repositories by a use case. */
export function sessionOf(tx: TxContext | undefined): ClientSession | undefined {
  return tx as unknown as ClientSession | undefined;
}

/**
 * Runs work in one MongoDB transaction of this service's database (replica set
 * required, docs/02 §8.1). The driver retries transient transaction errors.
 */
@Injectable()
export class MongoUnitOfWork implements UnitOfWork {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run<T>(work: (tx: TxContext) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session as unknown as TxContext);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }
}

export type MongoModuleOptions = {
  uri: string;
  dbName: string;
  /** Off in production: indexes are created by migrations (docs/03 §10.2). */
  autoIndex: boolean;
  /**
   * Development only: keep retrying until the database answers instead of giving up
   * (and crashing) after the driver's default ~10 attempts. `node --watch` does not
   * restart a crashed process, so a service started before `npm run dev:infra` would
   * otherwise stay down. Production and tests keep the default and fail fast.
   */
  waitForDatabase?: boolean;
};

/** Pause between two connection attempts while waiting for the database. */
const WAIT_RETRY_DELAY_MS = 3_000;

@Global()
@Module({})
export class MongoModule {
  static forRoot({
    uri,
    dbName,
    autoIndex,
    waitForDatabase = false,
  }: MongoModuleOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [
        MongooseModule.forRoot(uri, {
          dbName,
          autoIndex,
          autoCreate: autoIndex,
          serverSelectionTimeoutMS: 5_000,
          ...(waitForDatabase
            ? { retryAttempts: Number.POSITIVE_INFINITY, retryDelay: WAIT_RETRY_DELAY_MS }
            : {}),
        }),
      ],
      providers: [{ provide: UNIT_OF_WORK, useClass: MongoUnitOfWork }],
      exports: [UNIT_OF_WORK],
    };
  }
}
