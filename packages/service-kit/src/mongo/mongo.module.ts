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
};

@Global()
@Module({})
export class MongoModule {
  static forRoot({ uri, dbName, autoIndex }: MongoModuleOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [
        MongooseModule.forRoot(uri, {
          dbName,
          autoIndex,
          autoCreate: autoIndex,
          serverSelectionTimeoutMS: 5_000,
        }),
      ],
      providers: [{ provide: UNIT_OF_WORK, useClass: MongoUnitOfWork }],
      exports: [UNIT_OF_WORK],
    };
  }
}
