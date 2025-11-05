import { FastifyInstance } from "fastify";

import { registerHealthRoutes } from "./health";
import { registerTicketRoutes } from "./v1/tickets";

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);

  app.register(
    async (v1) => {
      await registerTicketRoutes(v1);
    },
    { prefix: "/v1" }
  );
}
