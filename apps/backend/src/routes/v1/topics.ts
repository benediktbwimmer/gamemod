import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { env } from "../../env";

const createTopicSchema = z.object({
  name: z.string().min(1, "Topic name is required"),
  description: z.string().max(256).optional()
});

type TopicRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapTopic(row: TopicRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  } as const;
}

export async function registerTopicRoutes(app: FastifyInstance) {
  app.get("/topics", async () => {
    const { rows } = await app.db.query<TopicRow>(
      `SELECT id, name, description, created_at, updated_at
       FROM ticket_topics
       ORDER BY name ASC`
    );

    return { topics: rows.map(mapTopic) };
  });

  app.post("/topics", async (request, reply) => {
    if (!env.ADMIN_PASSWORD) {
      request.log.error(
        "ADMIN_PASSWORD must be configured to create topics via API"
      );
      throw app.httpErrors.internalServerError(
        "Topic administration is not configured"
      );
    }

    const adminKey =
      request.headers["x-admin-key"] ??
      request.headers["X-Admin-Key" as keyof typeof request.headers];

    if (typeof adminKey !== "string" || adminKey !== env.ADMIN_PASSWORD) {
      throw app.httpErrors.unauthorized("Admin credentials required");
    }

    const parsed = createTopicSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest(parsed.error.message);
    }

    const { name, description } = parsed.data;

    try {
      const { rows } = await app.db.query<TopicRow>(
        `INSERT INTO ticket_topics (name, description)
         VALUES ($1, $2)
         RETURNING id, name, description, created_at, updated_at`,
        [name.trim(), description ?? null]
      );

      void reply.code(201);
      return { topic: mapTopic(rows[0]) };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "23505"
      ) {
        throw app.httpErrors.conflict("Topic already exists");
      }

      request.log.error({ err: error }, "Failed to create topic");
      throw app.httpErrors.internalServerError("Unable to create topic");
    }
  });
}
