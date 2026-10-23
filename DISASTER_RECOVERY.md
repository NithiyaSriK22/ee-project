# MediKiosk — Disaster Recovery & Backup Plan (Module 10)

> [!IMPORTANT]
> **RECOVERY OBJECTIVE NOTICE**
> A backup is considered valid **ONLY IF IT HAS BEEN RESTORED AND VERIFIED**. Untested backup archives must never be relied upon for hospital clinical data continuity.

---

## 1. Recovery Objectives (RPO & RTO Framework)

The following targets represent institutional baselines to be formally adopted by Hospital Leadership (DEC-01 & DEC-03 in `OPEN_DECISIONS.md`):

| Data Category | Target RPO (Recovery Point Objective) | Target RTO (Recovery Time Objective) | Storage & Backup Mechanism |
|---|---|---|---|
| **Confirmed Clinical Records & Patient Profiles** | **$\le 5$ Minutes** | **$\le 30$ Minutes** | PostgreSQL Continuous WAL Archiving + Point-in-Time Recovery (PITR). |
| **Cryptographic Audit Hash Chain** | **$\le 0$ Minutes (Zero Loss)** | **$\le 15$ Minutes** | Synchronous WAL replication + append-only external audit mirror. |
| **Document Storage (Prescription & Lab Images)** | **$\le 15$ Minutes** | **$\le 60$ Minutes** | S3-compatible encrypted object store with daily differential snapshots. |
| **Aggregated Operational Analytics** | **$\le 24$ Hours** | **$\le 4$ Hours** | Nightly database dump; analytics can be recomputed from audit events. |

---

## 2. Backup Architecture & Encryption

1. **Database Point-in-Time Recovery (PITR)**:
   - Full automated base backup taken daily at 02:00 AM local time.
   - Continuous Write-Ahead Log (WAL) archiving every 60 seconds to encrypted secondary backup storage.
   - Retention of WAL files allows restoration to any arbitrary second within the last 30 days.
2. **Encryption at Rest & in Transit**:
   - All backup tarballs and WAL segments are encrypted using AES-256-GCM before leaving the database host.
   - Backup encryption keys are managed separately from application database credentials via KMS / Vault.
3. **Immutability (WORM)**:
   - Backup storage enforces Object Lock / Write Once Read Many (WORM) policy preventing modification or premature deletion by compromised credentials.

---

## 3. Isolated Restore Drill Runbook (Monthly Requirement)

Release Gate 8 blocks production deployments if a successful restore drill has not been recorded within the last 30 days (`MAX_RESTORE_DRILL_AGE_DAYS`).

### Step-by-Step Restore Verification Procedure:

```bash
# 1. Provision an isolated staging PostgreSQL container (never touch production DB)
docker run --name medikiosk-restore-test \
  -e POSTGRES_PASSWORD=drill_restore_test_secret \
  -e POSTGRES_DB=medikiosk_isolated_restore \
  -d postgres:16-alpine

# 2. Decrypt and restore the latest production snapshot into isolated container
gpg --decrypt /var/backups/medikiosk/latest_base_backup.tar.gz.gpg | \
  pg_restore -h localhost -p 5433 -U medikiosk_admin -d medikiosk_isolated_restore

# 3. Verify cryptographic audit hash chain integrity
# Run isolated audit verification script against the restored database
node dist/scripts/verify-audit-chain-isolated.js --db-url="postgresql://.../medikiosk_isolated_restore"

# 4. Verify document reference pointers
# Ensure all document storage URIs in the restored database point to valid objects
node dist/scripts/verify-document-pointers-isolated.js

# 5. Record the Restore Drill in MediKiosk Platform Telemetry
curl -X POST https://medikiosk.hospital.internal/api/v1/deployment/restore-drills \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "rpoMinutes": 3.8,
    "rtoMinutes": 14.5,
    "backupArchiveSha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "verifiedRecordsCount": 1845,
    "notes": "Monthly scheduled cold-restore drill verified zero audit chain breaks and 100% document integrity."
  }'

# 6. Tear down isolated container
docker rm -f medikiosk-restore-test
```

---

## 4. Deletion Policies & Legal Hold Interaction

1. **Automated Data Purge**: Data beyond the hospital's retention schedule (Module 9 settings) is purged using cryptographically secure erasure.
2. **Backup Interplay**: Clinical records purged from production live in historical backup snapshots until the snapshot expires. Snapshots are never selectively modified (to maintain cryptographic integrity). If an old snapshot must be restored, the post-restore script re-applies the purge ledger.
3. **Legal Hold Override**: If an active Legal Hold is placed on a visit, patient, or date range via `/api/v1/admin/legal-holds`, the automated purge scheduler skips those records indefinitely until the hold is formally released by Legal Counsel.
