import { type DynamicModule, Global, Module } from "@nestjs/common";

/** Injection token of the parsed configuration object. */
export const SERVICE_CONFIG = Symbol("SERVICE_CONFIG");

/** Makes the configuration parsed by `loadConfig` injectable everywhere. */
@Global()
@Module({})
export class ServiceConfigModule {
  static forRoot<TConfig extends object>(config: TConfig): DynamicModule {
    return {
      module: ServiceConfigModule,
      providers: [{ provide: SERVICE_CONFIG, useValue: Object.freeze({ ...config }) }],
      exports: [SERVICE_CONFIG],
    };
  }
}
