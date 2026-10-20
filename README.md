# Analytics SDK & Dashboard

A full-stack analytics platform for tracking browser activity and server-side business events, with an analytics dashboard and restaurant demo application.

## Features

- Browser SDK for page views and custom events
- Server-side event tracking protected by an API key
- REST API for event ingestion and analytics
- PostgreSQL storage for events and orders
- Dashboard with total events, unique users, event breakdown, daily trends, and popular pages
- Event search and pagination
- User analytics and event history
- Date-range filtering
- Restaurant demo with cart and checkout
- API and SDK tests

## Tech Stack

- TypeScript, Node.js, Express
- React, Vite, Recharts
- PostgreSQL
- Docker Compose
- Vitest and Supertest

## Prerequisites

- Node.js and npm
- Docker Desktop
- PostgreSQL runs through Docker Compose

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a root `.env` file and configure:

```env
PORT=4000
DATABASE_URL=postgresql://analytics:YOUR_LOCAL_PASSWORD@localhost:5432/analytics_db
SERVER_API_KEY=replace-with-your-own-secret
```

Use the same local PostgreSQL password as the Docker configuration. Replace the server API key with a private value. Never commit `.env` or real secrets.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Start the API

```bash
npm run dev --workspace=@analytics/api
```

API base URL: `http://localhost:4000`

Health endpoint: `http://localhost:4000/api/health`

### 5. Start the dashboard

In a separate terminal:

```bash
npm run dev --workspace=@analytics/web
```

Dashboard: `http://localhost:5174`

### 6. Start the restaurant demo

In another terminal:

```bash
npm run dev --workspace=@analytics/demo
```

Demo app: `http://localhost:5175`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database health |
| POST | `/api/events` | Ingest browser events |
| POST | `/api/server-events` | Ingest authenticated server events |
| GET | `/api/analytics/summary` | Summary metrics and trends |
| GET | `/api/events` | Search and paginate events |
| GET | `/api/analytics/users` | Search and paginate users |
| GET | `/api/analytics/users/:userId/events` | Retrieve a user's event history |
| POST | `/api/checkout` | Create a demo order and record its event |

The server-side event endpoint requires the configured `SERVER_API_KEY`. Analytics summary supports `from` and `to` date parameters.

## Build and Test

Build the SDK:

```bash
npm run build --workspace=@analytics/sdk
```

Build the API:

```bash
npm run build --workspace=@analytics/api
```

Build the dashboard:

```bash
npm run build --workspace=@analytics/web
```

Build the demo:

```bash
npm run build --workspace=@analytics/demo
```

Run tests:

```bash
npm test
```

## Architecture

1. The browser SDK captures page views and custom events.
2. The API validates incoming events and persists them in PostgreSQL.
3. Server-side business events are accepted through an API-key-protected endpoint.
4. The dashboard requests aggregated analytics from the API.
5. The restaurant demo demonstrates browser tracking and checkout/order events.

## Assumptions and Trade-offs

- The restaurant application is a demonstration, not a production payment system.
- Checkout prices are validated server-side against the demo catalog.
- PostgreSQL is used for durable event storage and analytics queries.
- The implementation prioritizes a clear, testable end-to-end flow over production-scale infrastructure.

## Limitations

- Authentication is intended for this assignment's demo scope.
- Production deployment would require stronger access controls, rate limiting, monitoring, and secret management.
- Analytics accuracy and performance should be evaluated with larger datasets before production use.

## Security

- Keep `.env` files and API keys out of version control.
- Use a unique, private server API key.
- Use strong credentials and secure configuration for production deployments.
