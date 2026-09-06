# API Monitor

A full-stack API monitoring platform for registering clients, issuing API keys, proxying monitored requests, collecting request metrics, and viewing analytics through a React dashboard.

## What It Provides

- User registration, login, profile management, and cookie-based authentication
- Client onboarding and API key management
- Request proxying through `/monitor`
- Request ingestion and asynchronous metric processing
- Analytics for traffic, latency, errors, endpoints, and time series
- A React dashboard for authentication, client administration, and monitoring
- PostgreSQL, MongoDB, and RabbitMQ integrations

## Architecture

```mermaid
flowchart LR
    Browser[React Dashboard] -->|HTTP / cookies| API[Express API]
    API --> PostgreSQL[(PostgreSQL)]
    API --> MongoDB[(MongoDB)]
    API --> RabbitMQ[(RabbitMQ)]
    RabbitMQ --> Consumer[Metrics Consumer]
    Consumer --> PostgreSQL
    API --> Upstream[Monitored Upstream APIs]
```

## Repository Structure

```text
.
|-- dashboard/       React + Vite frontend
|-- server/          Express API and background consumer
|   |-- src/
|   |-- scripts/
|   |-- docker-compose.yml
|   |-- Dockerfile
|   `-- Dockerfile.consumer
`-- README.md
```

## Prerequisites

Install the following before starting local development:

- Git
- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose

The recommended path is Docker Compose for the backend dependencies and API, with the dashboard running through Vite.

## Setup Procedure

### 1. Clone the repository

```bash
git clone https://github.com/Ayush-gudigar607/Complete_monitor_system_for_api.git
cd Complete_monitor_system_for_api
```

Use the branch that contains the backend when required:

```bash
git checkout backend
```

### 2. Configure the backend

Create `server/.env`. Do not commit this file because it contains credentials and signing secrets.

```dotenv
NODE_ENV=development
API_PORT=5000

POSTGRES_DB=api_monitoring
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-this-password
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=change-this-password
MONGO_DB_NAME=api-monitor
MONGO_PORT=27017

RABBITMQ_USER=api_monitor
RABBITMQ_PASSWORD=change-this-password
RABBITMQ_VHOST=/
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_QUEUE=api_monitoring_queue
RABBITMQ_URL=amqp://api_monitor:change-this-password@localhost:5672/

PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=change-this-password
PGADMIN_PORT=5050

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRATION=1h
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

When running the API through Docker Compose, the API container resolves `postgres`, `mongodb`, and `rabbitmq` by service name. The host ports above are used by tools and local clients.

### 3. Start the backend stack

```bash
cd server
docker compose up --build
```

This starts:

- Express API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- MongoDB: `localhost:27017`
- RabbitMQ AMQP: `localhost:5672`
- RabbitMQ Management UI: `http://localhost:15672`
- Mongo Express: `http://localhost:8081`
- pgAdmin: `http://localhost:5050`
- Background metrics consumer

Run the stack in the background with:

```bash
docker compose up --build -d
```

Check service status and logs with:

```bash
docker compose ps
docker compose logs -f api-app
docker compose logs -f api-monitor-consumer
```

Stop the stack with:

```bash
docker compose down
```

To remove Docker-managed database volumes as well, use this only when you intend to reset local data:

```bash
docker compose down -v
```

### 4. Verify the API

```bash
curl http://localhost:5000/health
```

The root endpoint lists the main route groups:

```bash
curl http://localhost:5000/
```

### 5. Start the dashboard

Open a second terminal from the repository root:

```bash
cd dashboard
npm install
npm run dev
```

Vite will print the local dashboard URL, normally `http://localhost:5173`.

For a deployed or separately hosted API, create `dashboard/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

For local development, the dashboard defaults to `/api`; configure a development proxy or serve the dashboard through the same origin as the API when using that default.

Build and preview the dashboard with:

```bash
npm run build
npm run preview
```

Run the dashboard linter with:

```bash
npm run lint
```

## API Route Groups

| Area | Base path | Purpose |
| --- | --- | --- |
| Health | `/health` | Service health and uptime |
| Authentication | `/api/auth` | Register, login, profile, and logout |
| Clients | `/api` | Client onboarding and API key administration |
| Ingestion | `/api/hit` | Record monitored API activity |
| Analytics | `/api/analytics` | Dashboard statistics and reporting |
| Proxy | `/monitor` | Forward requests to registered upstream services |

Authentication uses HTTP cookies. Keep `withCredentials` enabled in clients that call protected endpoints.

## Backend Development Without Docker

Start the infrastructure services with Docker Compose, then run the Node processes locally:

```bash
cd server
npm install
npm run dev
```

Run the asynchronous consumer in another terminal:

```bash
cd server
npm run consumer
```

The production-style API command is:

```bash
npm start
```

## Data and Persistence

PostgreSQL initialization is defined in `server/scripts/init-postgres.sql`. Docker Compose persists local database data in the server directory and keeps MongoDB and RabbitMQ data in Docker volumes. Runtime logs, database directories, pgAdmin state, dependencies, and `.env` files are excluded from source control.

## Troubleshooting

### Containers fail their health checks

Check the service logs and confirm that the credentials in `server/.env` match the Compose configuration:

```bash
cd server
docker compose ps
docker compose logs postgres mongodb rabbitmq
```

### Port already in use

Change the host-side ports in `server/.env`. Keep the container ports used by the Compose network unchanged, then recreate the services:

```bash
docker compose down
docker compose up --build -d
```

### The dashboard cannot reach the API

Confirm that the API responds at `http://localhost:5000/health`, then check `VITE_API_BASE_URL` and the browser network console. The dashboard and API must use matching origins or a correctly configured proxy.

### Database schema changes are not visible

The PostgreSQL initialization script runs when the database is first created. For a clean local reset:

```bash
cd server
docker compose down -v
docker compose up --build
```

This deletes local Docker volume data.

## Security Notes

- Replace every example password and the JWT secret before using the system outside local development.
- Never commit `.env` files, database data, logs, or generated dependencies.
- Use HTTPS and secure cookies in production.
- Restrict database, RabbitMQ, Mongo Express, and pgAdmin ports in production deployments.
- Review CORS, rate limits, authentication, and API key permissions before exposing the service publicly.

## Git Workflow

The repository uses separate branches for the frontend and backend work. Before pushing changes:

```bash
git status
git add <files>
git commit -m "describe the change"
git push origin <branch-name>
```

Keep generated data and local secrets out of commits. Review the staged file list before pushing:

```bash
git diff --cached --name-only
```

## License

No project license has been specified yet.
