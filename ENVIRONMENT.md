# MediKiosk — Environment Variables & Secrets Catalog (Module 10)

> [!WARNING]
> **NO SECRETS POLICY**
> This document defines configuration variable names, purposes, defaults, and requirements. **NO REAL SECRETS, PRIVATE KEYS, OR CREDENTIALS MAY BE RECORDED IN THIS FILE OR COMMITTED TO SOURCE CONTROL**. Production secrets must be stored in an enterprise Key Management Service (e.g. AWS Secrets Manager, HashiCorp Vault, or hospital HSM).

---

## 1. Centralized Environment Configuration Catalog

| Variable Name | Description & Purpose | Required in Prod? | Allowed Environments | Default Value (Dev/Test Only) | Rotation Cadence |
|---|---|---|---|---|---|
| `NODE_ENV` | Runtime execution environment. Triggers strict production security validators when set to `production`. | **YES** | `development`, `staging`, `production`, `test` | `development` | N/A |
| `PORT` | HTTP port on which the backend server binds. | NO | All | `5000` | N/A |
| `DATABASE_URL` | PostgreSQL connection string including user, password, host, port, database, and schema. | **YES** | All | `postgresql://medikiosk_user:medikiosk_password@localhost:5432/medikiosk_db?schema=public` | 90 Days |
| `JWT_SECRET` | High-entropy secret key (min 32 bytes) for signing and verifying staff and doctor JWT authentication tokens. | **YES** | All | `dev_super_secret_jwt_key_do_not_use_in_prod_12345` (Blocked in prod) | 90 Days |
| `SESSION_SECRET` | Secret key (min 32 bytes) for generating cryptographic HMAC hashes for kiosk session identifiers. | **YES** | All | `dev_session_secret_change_me_in_production_abcdef` (Blocked in prod) | 90 Days |
| `AUDIT_SIGNING_KEY` | Cryptographic secret for signing periodic audit hash chain checkpoints and HMAC signatures. | **YES** | All | `dev-audit-checkpoint-secret-key-32-bytes-min` (Blocked in prod) | 180 Days |
| `KIOSK_DEVICE_SIGNING_SECRET` | Shared secret or CA private key used to verify hardware-enrolled kiosk terminal client certificates. | **YES** | Staging, Production | `dev-kiosk-hardware-signing-secret-32-bytes` | 180 Days |
| `CORS_ORIGIN_KIOSK` | Explicit HTTPS origin allowed to communicate with kiosk intake API endpoints. Wildcards blocked in prod. | **YES** | Staging, Production | `http://localhost:5173` | As architecture changes |
| `CORS_ORIGIN_DOCTOR` | Explicit HTTPS origin allowed to communicate with doctor portal and admin API endpoints. | **YES** | Staging, Production | `http://localhost:5174` | As architecture changes |
| `STORAGE_LOCAL_DIR` | Absolute filesystem path for encrypted document upload staging (when not using S3/GCS object storage). | NO | All | `./uploads` | N/A |
| `RELEASE_VERSION` | Semantic release version identifier (e.g. `v1.0.0`) evaluated by automated Release Gates. | NO | All | `v1.0.0` | On code release |
| `KIOSK_MIN_SUPPORTED_VERSION` | Minimum client build version permitted to connect without showing "Update Required" screen. | NO | All | `1.0.0` | On client release |
| `MAX_RESTORE_DRILL_AGE_DAYS` | Maximum allowable days since the last verified isolated database restore drill before release gates block. | NO | All | `30` | N/A |
| `ALERT_LATENCY_TARGET_MS` | Maximum allowable p95 alert delivery latency threshold before alerting canary triggers warnings. | NO | All | `2000` | N/A |

---

## 2. Production Secret Startup Validator

When `NODE_ENV === 'production'`, `backend/src/config/env.config.ts` executes `validateProductionSecrets()`:
1. Rejects startup if `DATABASE_URL` contains `localhost`, `medikiosk_user`, or `medikiosk_password`.
2. Rejects startup if `JWT_SECRET`, `SESSION_SECRET`, or `AUDIT_SIGNING_KEY` contains the substrings `dev`, `test`, `default`, or `change_me`.
3. Rejects startup if secret keys are shorter than 32 characters.
4. Rejects startup if CORS origins contain wildcard `*`.
5. Logs a critical audit event and terminates process immediately (`process.exit(1)`).
