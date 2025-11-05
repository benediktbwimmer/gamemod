import fp from "fastify-plugin";
import { Pool } from "pg";

import { env } from "../env";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
  }
}

export default fp(async (fastify) => {
  if (!env.DATABASE_URL) {
    fastify.log.error("DATABASE_URL must be configured for database access.");
    throw fastify.httpErrors.internalServerError("Database configuration missing");
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    ssl:
      env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined
  });

  fastify.decorate("db", pool);

  fastify.addHook("onClose", async (instance) => {
    await instance.db.end();
  });
});
