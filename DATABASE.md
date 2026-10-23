# MediKiosk — Production Database Architecture & Operations (Module 10)

This document details the PostgreSQL 16 database design, connection management, query optimization indexes, and migration standards.

---

## 1. Connection Pooling & Production Sizing

- **Connection Pool Configuration**:
  - `connection_limit = 50` per backend replica.
  - `pool_timeout = 20` seconds.
  - `idle_in_transaction_session_timeout = 10000` ms (kills stuck transactions).
  - `statement_timeout = 15000` ms (protects against un-indexed query lockouts).
- **High Availability (HA) & Replication**:
  - Asynchronous streaming replica for read queries and analytics reporting.
  - Automatic failover managed by patroni / cloud RDS.

---

## 2. Core Index Catalog Across Modules 1–10

| Table | Index Columns | Index Type | Query Pattern Optimized |
|---|---|---|---|
| `kiosk_sessions` | `(visit_id)` | UNIQUE B-Tree | Kiosk session lookup and token validation |
| `kiosk_sessions` | `(status, expires_at)` | B-Tree | Session expiration sweeper and active count |
| `triage_alerts` | `(visit_id, acknowledged_at)` | B-Tree | Doctor Review workspace unread alert filter |
| `triage_alerts` | `(severity, created_at DESC)` | B-Tree | Staff triage queue deterministic ordering |
| `clinical_summaries`| `(visit_id, version DESC)` | B-Tree | Latest AI draft summary retrieval |
| `confirmed_records` | `(visit_id, version DESC)` | B-Tree | Signed clinical record version history |
| `audit_logs` | `(sequence_number)` | UNIQUE B-Tree | Cryptographic hash chain sequential traversal |
| `audit_logs` | `(actor_id, occurred_at DESC)` | B-Tree | Insider snooping & access reports |
| `audit_logs` | `(visit_ref, occurred_at ASC)` | B-Tree | Full patient encounter audit reconstruction |
| `patient_visit_profiles` | `(hospital_registration_number)` | B-Tree | Patient check-in lookup at kiosk |

---

## 3. Migration Safety & Zero-Downtime Standards

1. **Strictly Additive**: Production migrations must be backward-compatible. Adding columns must use `NULL` or provide a default value.
2. **Never Drop in Migration**: Renaming or dropping columns is a multi-release process:
   - Release A: Mark column deprecated in application code; stop writing to it.
   - Release B: Stop reading from column.
   - Release C: Drop column in off-peak migration.
3. **Pre-Migration Snapshot**: Every production migration script must be preceded by an automated point-in-time snapshot:
   ```bash
   pg_dump -Fc -h $DB_HOST -U medikiosk_admin medikiosk_production > /backups/pre_migration_$(date +%s).dump
   ```
4. **No Destructive Resets**: `prisma migrate reset` and `prisma db push --force-reset` are prohibited in production pipelines.
