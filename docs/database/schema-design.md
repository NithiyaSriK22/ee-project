# MediKiosk — Database Architecture & Schema Design

## Database Engine
- **PostgreSQL 16+** (Relational, ACID-compliant, strong constraints for medical data integrity)
- **Prisma ORM** (Type-safe queries, migration migrations)

## Core Database Design Principles
1. **Strict Relational Normalization**: Foreign keys for all patient, document, extracted field, and audit relationships.
2. **Identifier Standard**: UUID v4 primary keys across all models (`@id @default(uuid()) @db.Uuid`).
3. **Naming Convention**: `snake_case` column mapping (e.g. `created_at`, `updated_at`, `patient_id`).
4. **Timestamping**: UTC timestamps with timezone (`@db.Timestamptz(6)`).
5. **Field Verification States**:
   - `VERIFIED`: Confirmed by deterministic formulary matching or pattern checking.
   - `UNVERIFIED`: Low confidence or partial match requiring physician review.
   - `UNREADABLE`: Illegible OCR scan or missing value. Never hallucinated by AI.

## Module 1 Implemented Foundation Schema
- `system_configs`: Runtime configuration key-values.
- `audit_logs`: Clinical action and system event immutable audit log.
