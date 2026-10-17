import { z } from "zod";

import { objectIdSchema } from "./object-id";

/** Who did something; `name` is a snapshot taken when the action happened (docs/03 §1.2). */
export const actorRefSchema = z.object({
  userId: objectIdSchema,
  name: z.string(),
});

export type ActorRef = z.infer<typeof actorRefSchema>;
