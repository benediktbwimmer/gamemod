import { FieldValue } from "@google-cloud/firestore";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { env } from "../../env";

const themeSchema = z.object({
  primary: z.string(),
  surface: z.string(),
  surfaceMuted: z.string(),
  surfaceSubtle: z.string(),
  backgroundAccentOne: z.string(),
  backgroundAccentTwo: z.string()
});

const siteSchema = z.object({
  brandLabel: z.string(),
  brandHeading: z.string(),
  headerNote: z.string(),
  headerGreeting: z.string(),
  guildName: z.string(),
  showGuildCard: z.boolean(),
  showTopicsPanel: z.boolean()
});

type ThemeSettings = z.infer<typeof themeSchema>;
type SiteSettings = z.infer<typeof siteSchema>;

const defaultTheme: ThemeSettings = {
  primary: "#6366f1",
  surface: "#101225",
  surfaceMuted: "#1b1e3b",
  surfaceSubtle: "#2a2e5c",
  backgroundAccentOne: "#1f2353",
  backgroundAccentTwo: "#2f347a"
};

const defaultSite: SiteSettings = {
  brandLabel: "GameMod",
  brandHeading: "Control Center",
  headerNote: "Operations Checkpoint",
  headerGreeting: "Welcome back, Commander Vega",
  guildName: "NovaWatch",
  showGuildCard: true,
  showTopicsPanel: true
};

async function getOrCreateSettings(app: FastifyInstance) {
  const docRef = app.firestore.collection("config").doc("staffSettings");
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    const data = snapshot.data() as {
      theme?: ThemeSettings;
      site?: SiteSettings;
    };

    return {
      theme: data.theme ?? defaultTheme,
      site: data.site ?? defaultSite
    };
  }

  await docRef.set({
    theme: defaultTheme,
    site: defaultSite,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return {
    theme: defaultTheme,
    site: defaultSite
  };
}

export async function registerStaffRoutes(app: FastifyInstance) {
  app.get("/staff/settings", async () => {
    const settings = await getOrCreateSettings(app);
    return settings;
  });

  app.put("/staff/settings", async (request) => {
    if (!env.ADMIN_PASSWORD) {
      request.log.error("ADMIN_PASSWORD must be set to update staff settings.");
      throw app.httpErrors.internalServerError("Staff settings are not configured");
    }

    const adminKey =
      request.headers["x-admin-key"] ??
      request.headers["X-Admin-Key" as keyof typeof request.headers];

    if (typeof adminKey !== "string" || adminKey !== env.ADMIN_PASSWORD) {
      throw app.httpErrors.unauthorized("Staff credentials required");
    }

    const payloadSchema = z
      .object({
        theme: themeSchema.optional(),
        site: siteSchema.optional()
      })
      .refine(
        (value) => Boolean(value.theme) || Boolean(value.site),
        "Provide theme and/or site settings to update."
      );

    const rawBody = request.body ?? {};
    let normalizedBody: unknown = rawBody;

    if (typeof rawBody === "string" || Buffer.isBuffer(rawBody)) {
      const textBody = Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : (rawBody as string);
      try {
        normalizedBody = textBody.length ? JSON.parse(textBody) : {};
      } catch (error) {
        request.log.warn({ error }, "Invalid JSON body for staff settings update.");
        throw app.httpErrors.badRequest("Malformed JSON payload.");
      }
    }

    const parsedResult = payloadSchema.safeParse(normalizedBody);

    if (!parsedResult.success) {
      request.log.warn(
        { issues: parsedResult.error.issues },
        "Validation failed for staff settings update."
      );
      throw app.httpErrors.badRequest("Invalid staff settings payload.");
    }

    const parsed = parsedResult.data;

    const current = await getOrCreateSettings(app);

    const nextTheme = parsed.theme ?? current.theme;
    const nextSite = parsed.site ?? current.site;

    await app.firestore
      .collection("config")
      .doc("staffSettings")
      .set(
        {
          theme: nextTheme,
          site: nextSite,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    return {
      theme: nextTheme,
      site: nextSite
    };
  });
}
