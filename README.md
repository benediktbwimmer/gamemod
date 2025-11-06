# GameMod Platform

GameMod is a communication and ticketing platform tailored to game studios that need streamlined operations, analytics, and moderation tooling.

## Monorepo Structure

- `apps/backend` – Fastify + TypeScript service exposing REST/WebSocket surfaces. Includes environment validation, route scaffolding, and database plugin stubs.
- `apps/frontend` – React + Vite + Tailwind dashboard with D3-driven analytics, query caching, and placeholder views.
- `docs/` – Architecture and planning references.

## Getting Started

### Prerequisites

- Node.js 20+
- npm >= 9 (workspace support)

### Install Dependencies

```bash
npm install
```

> The repo uses npm workspaces; dependency installs will populate both apps.

### Environment

Create `apps/backend/.env` (or export variables) with:

```dotenv
PORT=3000
GCP_PROJECT_ID=your-gcp-project-id
# Provide these when using an explicit service account (recommended for local dev)
GCP_CLIENT_EMAIL=firestore-service-account@your-gcp-project-id.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_PASSWORD=changeme123
```

If you prefer application-default credentials, set `GOOGLE_APPLICATION_CREDENTIALS` to point at your service-account JSON and omit the explicit email/key—the backend will fall back to the default Google Cloud credential chain.

For production, store `ADMIN_PASSWORD` in Secret Manager:

```bash
printf 'super-secret' | gcloud secrets create gamemod-admin-password --replication-policy=automatic --data-file=-
gcloud secrets add-iam-policy-binding gamemod-admin-password \
  --member="serviceAccount:904841096457-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then mount it during Cloud Run deploy (see below).
### Firestore (local)

The API persists all data in Firestore. For local development you can either:

1. Point at a real Firestore project (quickest). Create a dedicated project, download a service-account key with the "Cloud Datastore User" role, and populate the `.env` variables above.
2. Or run the Firestore emulator:
   ```bash
   gcloud components install cloud-firestore-emulator
   gcloud beta emulators firestore start --host-port=localhost:8080
   ```
   Then export `FIRESTORE_EMULATOR_HOST=localhost:8080` before starting the backend to direct the Firestore client at the emulator.

### Development Servers

Start the API and dashboard in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Both commands block the terminal they run in—open separate shells or append `>& logs &` to run them in the background:

```bash
npm run dev:backend > backend.log 2>&1 &
npm run dev:frontend > frontend.log 2>&1 &
```

Use `tail -f backend.log` or `tail -f frontend.log` to follow output, and stop the processes with `pkill -f "ts-node-dev"` / `pkill -f "vite"` or by killing their PIDs.

The backend listens on `http://localhost:3000` (health endpoint at `/health`).  
The frontend runs via Vite at `http://localhost:5173` and surfaces API health in the header.

### Available Scripts

- `npm run dev:backend` – Start Fastify server with `ts-node-dev`.
- `npm run dev:frontend` – Launch Vite dev server with hot module reloading.
- `npm run build` – Type-check and build all workspaces.
- `npm run lint` – Run ESLint across backend and frontend.
- `npm run format` – Format source files via Prettier.

## Cloud Deployment (Google Cloud)

The production topology targets:

- **Backend/API** → Cloud Run (container built from `apps/backend/Dockerfile`)
- **Data Store** → Firestore (Native mode)
- **Frontend** → Cloud Run (Express host serving the Vite build)

### 1. Prerequisites

```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud services enable run.googleapis.com firestore.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com compute.googleapis.com
```

Set a few reusable shell variables for subsequent commands:

```bash
export REGION=us-central1               # pick the region you want
export ARTIFACT_REPO=gamemod-api        # artifact registry name for backend images
export SERVICE_NAME=gamemod-api         # Cloud Run service name
export PROJECT_ID=$(gcloud config get-value project)
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
```

### 2. Provision Firestore (Native mode)

If Firestore is not already enabled for the project, create the default database:

```bash
gcloud alpha firestore databases create --location="$REGION" --type=FIRESTORE_NATIVE
```

Grant the Cloud Run runtime service account the `Datastore User` role so it can access Firestore:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

For production deployments, prefer creating a dedicated service account with the minimal roles (`roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/datastore.user`) and use it for Cloud Run.

### 3. Build and push the backend image

First create an Artifact Registry (if it does not already exist):

```bash
gcloud artifacts repositories create "$ARTIFACT_REPO" \
  --repository-format=docker \
  --location="$REGION"
```

Then build and publish the container (runs from the repo root):

```bash
gcloud builds submit . \
  --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/backend:latest" \
  --file apps/backend/Dockerfile
```

### 4. Deploy the Cloud Run service

Deploy the service, passing environment variables required at runtime. Store secrets (like `ADMIN_PASSWORD`) in Secret Manager and mount them as env vars in production.

```bash
gcloud run deploy "$SERVICE_NAME" \
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/backend:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID}"
  --set-secrets "ADMIN_PASSWORD=gamemod-admin-password:latest"
```

Cloud Run supplies the `PORT` environment variable automatically; the Fastify app listens on it.

### 5. Deploy the frontend host service

1. Build the Vite bundle so the hosting image can serve it:

   ```bash
   VITE_API_BASE_URL=https://YOUR_BACKEND_RUN_URL npm run build --workspace frontend
   ```

2. Trigger the Cloud Build pipeline that packages the Express host and uploads the container image (override `_API_URL` if your backend runs elsewhere):

   ```bash
   gcloud builds submit . \
     --config cloudbuild.frontend.yaml \
     --substitutions=_API_URL=https://YOUR_BACKEND_RUN_URL
   ```

3. Deploy the image to Cloud Run (update the service name if you prefer a different identifier):

   ```bash
   gcloud run deploy gamemod-frontend \
     --image us-central1-docker.pkg.dev/${PROJECT_ID}/gamemod-web/frontend:latest \
     --region "$REGION" \
     --platform managed \
     --allow-unauthenticated
   ```

   The service responds to SPA routes and always falls back to `index.html`. The default URL looks like `https://gamemod-frontend-<PROJECT_NUMBER>.us-central1.run.app/#/staff`. Map a custom domain via Cloud Run if desired.

### 6. Restrict API access (optional)

The backend enables CORS for all origins by default. To scope it down to your Cloud Run frontend host or custom domains, adjust the configuration in `apps/backend/src/app.ts`.

---

Once deployed, Cloud Run serves both the API and the static frontend, and Firestore stores application data. Use Cloud Run revisions for rollbacks and Cloud Logging/Trace for observability.

## Roadmap Notes

Refer to `docs/architecture.md` for the detailed system plan, milestones, and open questions guiding the next implementation phases.
