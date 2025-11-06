import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "@google-cloud/firestore";
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

type TicketDoc = {
  organizationId?: string | null;
  title: string;
  body: string;
  playerId: string;
  status: TicketStatus;
  topicId?: string | null;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
};

type TicketMessageDoc = {
  authorType: "agent" | "player";
  body: string;
  createdAt?: Timestamp | Date | string | null;
};

type TopicDoc = {
  name: string;
};

function toIsoDate(value?: Timestamp | Date | string | null) {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

function mapTicket(
  id: string,
  data: TicketDoc,
  topic?: { id: string; name: string }
) {
  const status = TICKET_STATUSES.includes(data.status)
    ? data.status
    : "open";
  return {
    id,
    organizationId: data.organizationId ?? null,
    title: data.title,
    body: data.body,
    playerId: data.playerId,
    status,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    topic: topic ?? null
  } as const;
}

function mapTicketMessage(id: string, data: TicketMessageDoc, ticketId: string) {
  return {
    id,
    ticketId,
    authorType: data.authorType,
    body: data.body,
    createdAt: toIsoDate(data.createdAt)
  } as const;
}

export async function registerTicketRoutes(app: FastifyInstance) {
  app.get("/tickets", async () => {
    const snapshot = await app.firestore
      .collection("tickets")
      .orderBy("createdAt", "desc")
      .get();

    const topicIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as TicketDoc;
      if (data.topicId) {
        topicIds.add(data.topicId);
      }
    });

    const topicsMap = new Map<string, { id: string; name: string }>();
    if (topicIds.size > 0) {
      const topicDocs = await Promise.all(
        [...topicIds].map((topicId) =>
          app.firestore.collection("topics").doc(topicId).get()
        )
      );

      topicDocs.forEach((topicDoc) => {
        if (!topicDoc.exists) {
          return;
        }
        const data = topicDoc.data() as TopicDoc;
        topicsMap.set(topicDoc.id, { id: topicDoc.id, name: data.name });
      });
    }

    const tickets = snapshot.docs.map((doc) => {
      const data = doc.data() as TicketDoc;
      const topic = data.topicId ? topicsMap.get(data.topicId) ?? null : null;
      return mapTicket(doc.id, data, topic ?? undefined);
    });

    return { tickets };
  });

  app.post("/tickets", async (request, reply) => {
    const parsed = createTicketSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest(parsed.error.message);
    }

    const ticketId = randomUUID();
    const { title, body, playerId, topicId, organizationId } = parsed.data;

    const topicDoc = await app.firestore.collection("topics").doc(topicId).get();

    if (!topicDoc.exists) {
      throw app.httpErrors.badRequest("Topic not found");
    }

    try {
      const ticketRef = app.firestore.collection("tickets").doc(ticketId);

      await ticketRef.set({
        organizationId: organizationId ?? null,
        title,
        body,
        playerId,
        status: "open" as TicketStatus,
        topicId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      const snapshot = await ticketRef.get();
      const topicData = topicDoc.data() as TopicDoc;
      const ticket = mapTicket(snapshot.id, snapshot.data() as TicketDoc, {
        id: topicDoc.id,
        name: topicData.name
      });

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
      const ticketRef = app.firestore.collection("tickets").doc(parsed.data.id);
      const snapshot = await ticketRef.get();

      if (!snapshot.exists) {
        throw app.httpErrors.notFound("Ticket not found");
      }

      const data = snapshot.data() as TicketDoc;
      let topic: { id: string; name: string } | undefined;
      if (data.topicId) {
        const topicDoc = await app.firestore
          .collection("topics")
          .doc(data.topicId)
          .get();
        if (topicDoc.exists) {
          const topicData = topicDoc.data() as TopicDoc;
          topic = { id: topicDoc.id, name: topicData.name };
        }
      }

      return { ticket: mapTicket(snapshot.id, data, topic) };
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
      const topicDoc = await app.firestore
        .collection("topics")
        .doc(updates.topicId)
        .get();
      if (!topicDoc.exists) {
        throw app.httpErrors.badRequest("Topic not found");
      }
    }

    try {
      const ticketRef = app.firestore.collection("tickets").doc(params.data.id);
      const snapshot = await ticketRef.get();

      if (!snapshot.exists) {
        throw app.httpErrors.notFound("Ticket not found");
      }

      const updateData: Record<string, unknown> = {};
      if (updates.title) {
        updateData.title = updates.title;
      }
      if (updates.body) {
        updateData.body = updates.body;
      }
      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.topicId) {
        updateData.topicId = updates.topicId;
      }
      if (updates.organizationId) {
        updateData.organizationId = updates.organizationId;
      }

      updateData.updatedAt = FieldValue.serverTimestamp();

      await ticketRef.update(updateData);

      const refreshed = await ticketRef.get();
      const data = refreshed.data() as TicketDoc;
      let topic: { id: string; name: string } | undefined;
      if (data.topicId) {
        const topicDoc = await app.firestore
          .collection("topics")
          .doc(data.topicId)
          .get();
        if (topicDoc.exists) {
          const topicData = topicDoc.data() as TopicDoc;
          topic = { id: topicDoc.id, name: topicData.name };
        }
      }

      return { ticket: mapTicket(refreshed.id, data, topic) };
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

    const now = new Date();
    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - (days - 1));

    const snapshot = await app.firestore
      .collection("tickets")
      .where("createdAt", ">=", Timestamp.fromDate(start))
      .get();

    const buckets = new Map<string, Record<TicketStatus, number>>();
    const dayKeys: string[] = [];

    for (let i = 0; i < days; i += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + i);
      const key = day.toISOString().slice(0, 10);
      dayKeys.push(key);
      buckets.set(
        key,
        Object.fromEntries(
          TICKET_STATUSES.map((status) => [status, 0])
        ) as Record<TicketStatus, number>
      );
    }

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as TicketDoc;
      const createdKey = toIsoDate(data.createdAt).slice(0, 10);
      const bucket = buckets.get(createdKey);
      if (!bucket) {
        return;
      }
      const status = TICKET_STATUSES.includes(data.status)
        ? data.status
        : undefined;
      if (!status) {
        return;
      }
      bucket[status] += 1;
    });

    const series = dayKeys.map((key) => ({
      date: key,
      statuses: buckets.get(key)!
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

    const ticketRef = app.firestore.collection("tickets").doc(params.data.id);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw app.httpErrors.notFound("Ticket not found");
    }

    const messagesSnapshot = await ticketRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    return {
      messages: messagesSnapshot.docs.map((doc) =>
        mapTicketMessage(doc.id, doc.data() as TicketMessageDoc, params.data.id)
      )
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
    const ticketRef = app.firestore.collection("tickets").doc(ticketId);
    const snapshot = await ticketRef.get();

    if (!snapshot.exists) {
      throw app.httpErrors.notFound("Ticket not found");
    }

    const { body, authorType } = payload.data;

    try {
      const messagesCollection = ticketRef.collection("messages");
      const messageRef = await messagesCollection.add({
        authorType,
        body,
        createdAt: FieldValue.serverTimestamp()
      });

      await ticketRef.update({
        updatedAt: FieldValue.serverTimestamp()
      });

      const messageSnapshot = await messageRef.get();

      void reply.code(201);
      return {
        message: mapTicketMessage(
          messageSnapshot.id,
          messageSnapshot.data() as TicketMessageDoc,
          ticketId
        )
      };
    } catch (error) {
      request.log.error({ err: error }, "Failed to create ticket message");
      throw app.httpErrors.internalServerError("Unable to create ticket message");
    }
  });
}
