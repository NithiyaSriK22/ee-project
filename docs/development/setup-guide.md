# MediKiosk — Local Development Setup Guide

## Prerequisites
- Node.js >= 18.0.0 (Node v20+ recommended)
- npm >= 9.0.0
- Docker & Docker Compose (Optional for local PostgreSQL) or a local PostgreSQL instance

## Step-by-Step Installation

### 1. Install All Dependencies (Root Workspace)
```bash
npm install
```

### 2. Configure Environment Files
Copy the example environment templates:
```bash
# Root environment
cp .env.example .env

# Frontend apps
cp frontend-kiosk/.env.example frontend-kiosk/.env
cp frontend-doctor-portal/.env.example frontend-doctor-portal/.env
```

### 3. Start PostgreSQL Database
Using Docker Compose:
```bash
docker-compose up -d
```
Or start your local PostgreSQL instance on port 5432 with database `medikiosk_db`.

### 4. Run Prisma Database Generation
```bash
npm --workspace=backend run prisma:generate
```

### 5. Start Development Servers
You can run all three apps concurrently in separate terminals:

**Terminal 1 — Backend API (Port 5000):**
```bash
npm run dev:backend
```

**Terminal 2 — Patient Kiosk Frontend (Port 5173):**
```bash
npm run dev:kiosk
```

**Terminal 3 — Doctor Review Portal (Port 5174):**
```bash
npm run dev:doctor
```

## Running Tests
```bash
# Run all workspace tests
npm test

# Run backend unit/integration tests
npm --workspace=backend run test

# Run kiosk frontend tests
npm --workspace=frontend-kiosk run test

# Run doctor portal tests
npm --workspace=frontend-doctor-portal run test
```

## Running Type-Checks and Linting
```bash
npm run lint
```
