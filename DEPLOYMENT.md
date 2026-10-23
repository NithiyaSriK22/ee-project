# MediKiosk — Production Deployment Guide (Module 10)

This guide documents the real deployment procedures for MediKiosk using Docker Compose or Kubernetes on hospital infrastructure.

---

## 1. Prerequisites & Environment Setup

1. **Hardware / VM Sizing**:
   - Minimum: 4 CPU Cores, 16 GB RAM, 100 GB Encrypted NVMe SSD.
   - Recommended (Peak OPD): 8 CPU Cores, 32 GB RAM, 250 GB Encrypted NVMe SSD.
2. **Software Dependencies**:
   - Docker Engine 24.0+ & Docker Compose v2.20+.
   - OpenSSL 3.0+ for certificate and key generation.
   - Node.js 20 LTS (if building directly on host).

---

## 2. Step-by-Step Production Deployment

### Step 1: Clone Repository and Generate Secrets
```bash
git clone https://github.com/hospital-org/medikiosk.git
cd medikiosk

# Generate high-entropy production secrets (never use defaults)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
AUDIT_KEY=$(openssl rand -hex 32)
KIOSK_KEY=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -hex 24)

# Create production environment file (.env.prod)
cat <<EOF > .env.prod
NODE_ENV=production
DATABASE_USER=medikiosk_admin
DATABASE_PASSWORD=${DB_PASS}
DATABASE_NAME=medikiosk_production
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
AUDIT_SIGNING_KEY=${AUDIT_KEY}
KIOSK_DEVICE_SIGNING_SECRET=${KIOSK_KEY}
CORS_ORIGIN_KIOSK=https://kiosk.hospital.internal
CORS_ORIGIN_DOCTOR=https://doctor.hospital.internal
MAX_RESTORE_DRILL_AGE_DAYS=30
ALERT_LATENCY_TARGET_MS=2000
EOF
```

### Step 2: Install TLS Certificates
Place hospital-signed TLS certificates in `./nginx/certs/`:
- `./nginx/certs/medikiosk.crt` (Server certificate + intermediate CA)
- `./nginx/certs/medikiosk.key` (Private key - chmod 600)

### Step 3: Launch Production Containers
```bash
# Start isolated database first
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres

# Wait for healthy database status
docker compose -f docker-compose.prod.yml ps postgres

# Run database migrations
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Launch remaining services (Backend replicas, Frontends, Reverse Proxy)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Step 4: Verify Post-Deployment Health
```bash
# 1. Check basic container health
docker compose -f docker-compose.prod.yml ps

# 2. Probe unauthenticated health endpoint
curl -k https://localhost/health

# 3. Probe detailed readiness evaluation
curl -k https://localhost/api/v1/health/ready

# 4. Check Alert Pipeline Canary
curl -k https://localhost/api/v1/deployment/alert-pipeline/health

# 5. Check Release Gates status in Admin Console
curl -k https://localhost/api/v1/deployment/release-gates \
  -H "Authorization: Bearer $ADMIN_JWT"
```
