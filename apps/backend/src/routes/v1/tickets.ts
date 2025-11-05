import { randomUUID } from "node:crypto";

import { FastifyInstance } from "fastify";
import { z } from "zod";

const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  playerId: z.string().min(1, "Player identifier is required"),
  category: z.string().optional(),
  organizationId: z.string().uuid().optional()
});

const ticketIdParamsSchema = z.object({
  id: z.string().uuid("Ticket id must be a UUID")
});

type TicketRow = {
  id: string;
  organization_id: string | null;
  title: string;
  body: string;
  player_id: string;
  category: string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapTicket(row: TicketRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    body: row.body,
    playerId: row.player_id,
    category: row.category,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  } as const;
}

export async function registerTicketRoutes(app: FastifyInstance) {
  app.post("/tickets", async (request, reply) => {
    const parsed = createTicketSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest(parsed.error.message);
    }

    const ticketId = randomUUID();
    const { title, body, playerId, category, organizationId } = parsed.data;

    try {
      const { rows } = await app.db.query<TicketRow>(
        `INSERT INTO tickets (id, organization_id, title, body, player_id, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, organization_id, title, body, player_id, category, status, created_at, updated_at`,
        [ticketId, organizationId ?? null, title, body, playerId, category ?? null]
      );

      const ticket = mapTicket(rows[0]);

      reply.code(201);
      return { ticket };
    } catch (error) {
      request.log.error({ err: error }, "Failed to create ticket");
      throw app.httpErrors.internalServerError("Unable to create ticket");
    }
  });

  app.get("/tickets/:id", async (request) => {
    const parsed = ticketIdParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      throw app.httpErrors.badRequest(parsed.error.message);
    }

    try {
      const { rows } = await app.db.query<TicketRow>(
        `SELECT id, organization_id, title, body, player_id, category, status, created_at, updated_at
         FROM tickets
         WHERE id = $1
         LIMIT 1`,
        [parsed.data.id]
      );

      if (rows.length === 0) {
        throw app.httpErrors.notFound("Ticket not found");
      }

      return { ticket: mapTicket(rows[0]) };
    } catch (error) {
      if (
        error instanceof Error &&
        "statusCode" in error &&
        (error as { statusCode: number }).statusCode === 404
      ) {
        throw error;
      }

      request.log.error({ err: error }, "Failed to fetch ticket");
      throw app.httpErrors.internalServerError("Unable to fetch ticket");
    }
  });
}
