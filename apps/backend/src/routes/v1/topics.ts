import { FieldValue, Timestamp } from "@google-cloud/firestore";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { env } from "../../env";

const createTopicSchema = z.object({
  name: z.string().min(1, "Topic name is required"),
  description: z.string().max(256).optional()
});

type TopicDoc = {
  name?: string;
  nameLower?: string;
  description?: string | null;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
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

function mapTopic(
  topicId: string,
  data: TopicDoc
) {
  const name = data.name ?? "Untitled Topic";
  return {
    id: topicId,
    name,
    description: data.description ?? null,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt)
  } as const;
}

export async function registerTopicRoutes(app: FastifyInstance) {
  app.get("/topics", async () => {
    const snapshot = await app.firestore
      .collection("topics")
      .orderBy("name")
      .get();

    const topics = snapshot.docs.map((doc) => {
      const data = doc.data() as TopicDoc;
      return mapTopic(doc.id, data);
    });

    return { topics };
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
    const trimmedName = name.trim();

    try {
      const existing = await app.firestore
        .collection("topics")
        .where("nameLower", "==", trimmedName.toLowerCase())
        .limit(1)
        .get();

      if (!existing.empty) {
        throw app.httpErrors.conflict("Topic already exists");
      }

      const docRef = app.firestore.collection("topics").doc();

      await docRef.set({
        name: trimmedName,
        nameLower: trimmedName.toLowerCase(),
        description: description ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      const snapshot = await docRef.get();

      void reply.code(201);
      return {
        topic: mapTopic(snapshot.id, snapshot.data() as TopicDoc)
      };
    } catch (error) {
      request.log.error({ err: error }, "Failed to create topic");
      throw app.httpErrors.internalServerError("Unable to create topic");
    }
  });
}
