# Recyclerie Backend

Backend API for managing recyclerie (thrift store / recycling center) operations: inventory, donations, point of sale, cash sessions, gift cards, employee planning, and reporting.

Built with **Express 5**, **Sequelize**, and **TypeScript** (ESM).

# Recyclerie Backend

![tests](https://github.com/yfabrik/recyclery_backend/actions/workflows/unit-test.yml/badge.svg)

## Requirements

- [Node.js](https://nodejs.org/) **22+** (see `.nvmrc`; use `nvm use` if you use nvm)
- npm

## Quick start

```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

npm install
npm run dev
```

The server listens on **http://0.0.0.0:5000**. API routes are under `/api`.

## Environment variables

Copy [`.env.example`](.env.example) to `.env`. The app **will not start** without `JWT_SECRET`.

| Variable                  | Required   | Description                                           |
| ------------------------- | ---------- | ----------------------------------------------------- |
| `JWT_SECRET`              | Yes        | Secret for signing JWT tokens                         |
| `NODE_ENV`                | No         | `development` (default), `test`, or `production`      |
| `DB_URL`                  | Production | Database connection string (see `config/config.json`) |
| `DEFAULT_USERNAME`        | No         | Bootstrap admin username when DB is empty             |
| `DEFAULT_MAIL`            | No         | Bootstrap admin email                                 |
| `DEFAULT_PASS`            | No         | Bootstrap admin password                              |
| `RATE_LIMIT_WINDOW_MS`    | No         | Rate limit window in ms (default: 15 min)             |
| `RATE_LIMIT_MAX_REQUESTS` | No         | Max requests per IP per window (default: 1000)        |
| `RATE_LIMIT_WHITELIST`    | No         | Comma-separated IPs exempt from rate limiting         |

## Scripts

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `npm run dev`  | Start dev server with hot reload (`tsx --watch`) |
| `npm run jest` | Run tests (in-memory SQLite, `force: true` sync) |

## Database

- **Development:** SQLite file at `./database/database2.sqlite` (gitignored)
- **Test:** in-memory SQLite
- **Production:** connection via `DB_URL`

On startup the app runs `sequelize.sync()` and optionally seeds a default admin when `DEFAULT_*` vars are set and no users exist.

Migrations are managed with [sequelize-cli](https://github.com/sequelize/cli); config paths are in [`.sequelizerc`](.sequelizerc).

## Docker

**Production image** (multi-stage build):

```bash
docker build -t recyclerie-backend .
docker run --env-file .env -p 5000:5000 recyclerie-backend
```

**Isolated dev container** (keeps `node_modules` in Docker volumes):

```bash
./run-dev-container.sh dev    # npm run dev with port mapping
./run-dev-container.sh shell  # interactive shell
./run-dev-container.sh run npm run jest
```

CI builds and pushes the image to GitHub Container Registry on pushes to the `with-imports` branch (see [`.github/workflows/docker.yml`](.github/workflows/docker.yml)).

## API overview

- **Public:** `POST /api/auth/login` (and `POST /api/auth/register` when not in production)
- **Protected:** all other `/api/*` routes require `Authorization: Bearer <token>`
- Role-based access: `employee`, `manager`, `admin` (see `src/middlewares/hasPermissions.ts`)

Main resource groups: recycleries/stores, users, donations, categories, collection points, arrivals, labeled items, cash registers & sessions, sales transactions, gift cards, promotions, employees, tasks & planning, eco-organisms, waste disposals, dashboard.

## Project layout

```
src/
  index.ts              # Entry point
  config/               # Shared config (e.g. JWT)
  models/               # Sequelize TypeScript models
  v1/routes/            # Express routers
  v1/controllers/       # Request handlers
  services/             # Domain logic (gift cards, tasks, logging, …)
  middlewares/          # Auth, permissions, errors
test/                   # Jest unit tests
config/config.json      # Sequelize per-environment config
```

## Further reading

- [`TS_MODEL_MIGRATION_STATUS.md`](TS_MODEL_MIGRATION_STATUS.md) — TypeScript model migration notes
- [`TODO.md`](TODO.md) — schema and migration backlog
