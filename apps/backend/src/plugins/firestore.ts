import { Firestore } from "@google-cloud/firestore";
import fp from "fastify-plugin";

import { env } from "../env";

declare module "fastify" {
  interface FastifyInstance {
    firestore: Firestore;
  }
}

export default fp(async (fastify) => {
  const hasClientEmail = Boolean(env.GCP_CLIENT_EMAIL);
  const hasPrivateKey = Boolean(env.GCP_PRIVATE_KEY);

  if (hasClientEmail !== hasPrivateKey) {
    fastify.log.error(
      "GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY must be provided together."
    );
    throw fastify.httpErrors.internalServerError("Invalid Firestore credentials");
  }

  const firestore = new Firestore({
    projectId: env.GCP_PROJECT_ID,
    ...(hasClientEmail && hasPrivateKey
      ? {
          credentials: {
            client_email: env.GCP_CLIENT_EMAIL!,
            private_key: env.GCP_PRIVATE_KEY!.replace(/\\n/g, "\n")
          }
        }
      : {})
  });

  firestore.settings({ ignoreUndefinedProperties: true });

  fastify.decorate("firestore", firestore);

  fastify.addHook("onClose", async () => {
    try {
      await firestore.terminate();
    } catch (error) {
      fastify.log.warn({ err: error }, "Failed to cleanly shut down Firestore");
    }
  });
});
