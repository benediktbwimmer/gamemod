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
DATABASE_URL=postgres://gamemod:gamemod@localhost:5544/gamemod
REDIS_URL=redis://localhost:6379
ADMIN_PASSWORD=changeme123
```

`DATABASE_URL` now drives ticket persistence—make sure it points at the Postgres instance started below.

### Database (local)

Spin up Postgres on a non-standard port and run migrations:

```bash
docker compose up -d postgres
npm run migrate:up
```

This provisions Postgres 16 with credentials `gamemod/gamemod` on `localhost:5544` and applies the tickets schema. Shut it down with `docker compose down` when finished.

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
- `npm run migrate:up` – Apply database migrations (requires `DATABASE_URL`).
- `npm run migrate:down` – Roll back the latest migration.

## Roadmap Notes

Refer to `docs/architecture.md` for the detailed system plan, milestones, and open questions guiding the next implementation phases.
