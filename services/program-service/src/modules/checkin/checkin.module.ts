import { type DynamicModule, Module } from "@nestjs/common";

import {
  ORDER_REPOSITORY,
  TICKET_REPOSITORY,
  type OrderRepository,
  type TicketRepository,
} from "../orders";
import { CheckinsController } from "./api/checkins.controller";
import { CheckinService } from "./application/checkin-service";
import { CHECKIN_SERVICE } from "./checkin.tokens";

@Module({})
export class CheckinModule {
  /** `orders` is the app's orders module instance (dynamic, shared). */
  static forRoot(orders: DynamicModule): DynamicModule {
    return {
      module: CheckinModule,
      imports: [orders],
      controllers: [CheckinsController],
      providers: [
        {
          provide: CHECKIN_SERVICE,
          useFactory: (tickets: TicketRepository, orderRepository: OrderRepository) =>
            new CheckinService(tickets, orderRepository),
          inject: [TICKET_REPOSITORY, ORDER_REPOSITORY],
        },
      ],
    };
  }
}
