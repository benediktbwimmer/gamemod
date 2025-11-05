import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  playerId: z.string().min(1, "Player identifier is required"),
  topicId: z.string().uuid("Topic id must be a UUID"),
  organizationId: z.string().uuid().optional()
});

const updateTicketSchema = z
  .object({
    title: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    topicId: z.string().uuid("Topic id must be a UUID").optional(),
    organizationId: z.string().uuid().optional()
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update"
  );

const createTicketMessageSchema = z.object({
  body: z.string().min(1, "Message body is required"),
  authorType: z.enum(["agent", "player"]).default("agent")
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
  status: TicketStatus;
  created_at: Date | string;
  updated_at: Date | string;
  topic_id: string | null;
  topic_name: string | null;
};

type TopicRow = {
  id: string;
  name: string;
  description: string | null;
};

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  author_type: "agent" | "player";
  body: string;
  created_at: Date | string;
};

function mapTicket(row: TicketRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    body: row.body,
    playerId: row.player_id,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    topic: row.topic_id
      ? {
          id: row.topic_id,
          name: row.topic_name ?? "Unknown topic"
        }
      : null
  } as const;
}

function mapTicketMessage(row: TicketMessageRow) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorType: row.author_type,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString()
  } as const;
}

export async function registerTicketRoutes(app: FastifyInstance) {
  app.get("/tickets", async () => {
    const { rows } = await app.db.query<TicketRow>(
      `SELECT
         t.id,
         t.organization_id,
         t.title,
         t.body,
         t.player_id,
         t.status,
         t.created_at,
         t.updated_at,
         t.topic_id,
         tt.name AS topic_name
       FROM tickets t
       LEFT JOIN ticket_topics tt ON tt.id = t.topic_id
       ORDER BY t.created_at DESC`
    );

    return { tickets: rows.map(mapTicket) };
  });

  app.post("/tickets", async (request, reply) => {
    const parsed = createTicketSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest(parsed.error.message);
    }

    const ticketId = randomUUID();
    const { title, body, playerId, topicId, organizationId } = parsed.data;

    const topicResult = await app.db.query<TopicRow>(
      `SELECT id, name, description
       FROM ticket_topics
       WHERE id = $1
       LIMIT 1`,
      [topicId]
    );

    if (topicResult.rows.length === 0) {
      throw app.httpErrors.badRequest("Topic not found");
    }

    try {
      const { rows } = await app.db.query<TicketRow>(
        `INSERT INTO tickets (id, organization_id, title, body, player_id, topic_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, organization_id, title, body, player_id, status, created_at, updated_at, topic_id,
           (SELECT name FROM ticket_topics WHERE id = $6) AS topic_name`,
        [ticketId, organizationId ?? null, title, body, playerId, topicId]
      );

      const ticket = mapTicket(rows[0]);

      void reply.code(201);
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
      const { rows: mappedRows } = await app.db.query<TicketRow>(
        `SELECT
           t.id,
           t.organization_id,
           t.title,
           t.body,
           t.player_id,
           t.status,
           t.created_at,
           t.updated_at,
           t.topic_id,
           tt.name AS topic_name
         FROM tickets t
         LEFT JOIN ticket_topics tt ON tt.id = t.topic_id
         WHERE t.id = $1
         LIMIT 1`,
        [parsed.data.id]
      );

      if (mappedRows.length === 0) {
        throw app.httpErrors.notFound("Ticket not found");
      }

      return { ticket: mapTicket(mappedRows[0]) };
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

  app.patch("/tickets/:id", async (request) => {
    const params = ticketIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw app.httpErrors.badRequest(params.error.message);
    }

    const body = updateTicketSchema.safeParse(request.body ?? {});

    if (!body.success) {
      throw app.httpErrors.badRequest(body.error.message);
    }

    const updates = body.data;

    if (updates.topicId) {
      const { rows } = await app.db.query<TopicRow>(
        `SELECT id FROM ticket_topics WHERE id = $1 LIMIT 1`,
        [updates.topicId]
      );
      if (rows.length === 0) {
        throw app.httpErrors.badRequest("Topic not found");
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (updates.title) {
      fields.push(`title = $${index++}`);
      values.push(updates.title);
    }

    if (updates.body) {
      fields.push(`body = $${index++}`);
      values.push(updates.body);
    }

    if (updates.status) {
      fields.push(`status = $${index++}`);
      values.push(updates.status);
    }

    if (updates.topicId) {
      fields.push(`topic_id = $${index++}`);
      values.push(updates.topicId);
    }

    if (updates.organizationId) {
      fields.push(`organization_id = $${index++}`);
      values.push(updates.organizationId);
    }

    fields.push(`updated_at = NOW()`);

    values.push(params.data.id);

    try {
      const { rows } = await app.db.query<TicketRow>(
        `UPDATE tickets
         SET ${fields.join(", ")}
         WHERE id = $${index}
         RETURNING
           id,
           organization_id,
           title,
           body,
           player_id,
           status,
           created_at,
           updated_at,
           topic_id,
           (SELECT name FROM ticket_topics WHERE id = topic_id) AS topic_name`,
        values
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

      request.log.error({ err: error }, "Failed to update ticket");
      throw app.httpErrors.internalServerError("Unable to update ticket");
    }
  });

  app.get("/tickets/analytics/status", async (request) => {
    const querySchema = z
      .object({
        days: z.coerce.number().int().min(1).max(90).default(7)
      })
      .default({ days: 7 });

    const parsed = querySchema.parse(request.query);
    const { days } = parsed;

    const { rows } = await app.db.query<{
      day: string | Date;
      status: TicketStatus;
      count: string;
    }>(
      `WITH bounds AS (
         SELECT
           (date_trunc('day', NOW()) - ($1::int - 1) * INTERVAL '1 day')::date AS start_day,
           date_trunc('day', NOW())::date AS end_day
       ),
       days AS (
         SELECT generate_series(start_day, end_day, '1 day') AS day
         FROM bounds
       ),
       statuses AS (
         SELECT unnest($2::text[])::text AS status
       ),
       aggregated AS (
         SELECT
           date_trunc('day', created_at)::date AS day,
           status,
           COUNT(*) AS count
         FROM tickets
         WHERE created_at >= (SELECT start_day FROM bounds)
         GROUP BY day, status
       )
       SELECT
         d.day,
         s.status,
         COALESCE(a.count, 0) AS count
       FROM days d
       CROSS JOIN statuses s
       LEFT JOIN aggregated a ON a.day = d.day AND a.status = s.status
       ORDER BY d.day ASC, s.status ASC`,
      [days, TICKET_STATUSES]
    );

    const data = rows.reduce<Record<string, Record<TicketStatus, number>>>(
      (acc, row) => {
        const dayKey =
          row.day instanceof Date
            ? row.day.toISOString().slice(0, 10)
          : row.day.slice(0, 10);
        if (!acc[dayKey]) {
          acc[dayKey] = Object.fromEntries(
            TICKET_STATUSES.map((status) => [status, 0])
          ) as Record<TicketStatus, number>;
        }

        acc[dayKey][row.status] = Number(row.count);
        return acc;
      },
      {}
    );

    const series = Object.entries(data).map(([day, statuses]) => ({
      date: day,
      statuses
    }));

    return {
      statuses: TICKET_STATUSES,
      series
    };
  });

  app.get("/tickets/:id/messages", async (request) => {
    const params = ticketIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw app.httpErrors.badRequest(params.error.message);
    }

    const { rows } = await app.db.query<TicketMessageRow>(
      `SELECT id, ticket_id, author_type, body, created_at
       FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [params.data.id]
    );

    return {
      messages: rows.map(mapTicketMessage)
    };
  });

  app.post("/tickets/:id/messages", async (request, reply) => {
    const params = ticketIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw app.httpErrors.badRequest(params.error.message);
    }

    const payload = createTicketMessageSchema.safeParse(request.body ?? {});

    if (!payload.success) {
      throw app.httpErrors.badRequest(payload.error.message);
    }

    const ticketId = params.data.id;

    const {
      rows: ticketRows
    } = await app.db.query<{ id: string }>(
      `SELECT id FROM tickets WHERE id = $1 LIMIT 1`,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      throw app.httpErrors.notFound("Ticket not found");
    }

    const { body, authorType } = payload.data;

    try {
      const { rows } = await app.db.query<TicketMessageRow>(
        `INSERT INTO ticket_messages (ticket_id, author_type, body)
         VALUES ($1, $2, $3)
         RETURNING id, ticket_id, author_type, body, created_at`,
        [ticketId, authorType, body]
      );

      await app.db.query(
        `UPDATE tickets SET updated_at = NOW() WHERE id = $1`,
        [ticketId]
      );

      void reply.code(201);
      return { message: mapTicketMessage(rows[0]) };
    } catch (error) {
      request.log.error({ err: error }, "Failed to create ticket message");
      throw app.httpErrors.internalServerError("Unable to create ticket message");
    }
  });
}
