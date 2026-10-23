# MediKiosk — System Architecture (Modules 1–10)

```
                                  HOSPITAL NETWORK PERIMETER
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                        │
│   Patients & Companions                          Attending Doctors & Triage Nurses     │
│   ┌─────────────────────┐                       ┌───────────────────────────────┐      │
│   │ Hardened Kiosk Fleet│                       │ Doctor Portal & Admin Console │      │
│   │ (Single-app, wiped) │                       │ (Static SPA, Auth/MFA)        │      │
│   └──────────┬──────────┘                       └──────────────┬────────────────┘      │
│              │ (Segmented Kiosk VLAN)                          │ (Doctor VLAN)         │
│              ▼                                                 ▼                       │
│     ┌──────────────────────────────────────────────────────────────────┐               │
│     │ Reverse Proxy / WAF / TLS 1.3 Termination (Nginx)                │               │
│     │ - Rate limiting (General 30r/s, Emergency burst 60r/s)           │               │
│     │ - CSP, HSTS, Frameguard, Permissions-Policy headers               │               │
│     │ - Request size limitation (5MB max upload)                       │               │
│     └────────────────────────────────┬─────────────────────────────────┘               │
│                                      │                                                 │
│                                      ▼                                                 │
│     ┌──────────────────────────────────────────────────────────────────┐               │
│     │ MediKiosk Backend API (Modular Monolith - Node.js / TypeScript)  │               │
│     │ ├─ Module 1: Core Foundation & Config Hardening                  │               │
│     │ ├─ Module 2: Staff Auth, Sessions & Consent                      │               │
│     │ ├─ Module 3: Interview Templates & Questionnaire Engine         │               │
│     │ ├─ Module 4: Document Capture, OCR & Deterministic Validation    │               │
│     │ ├─ Module 5: Grounded Summarization & Fallback Engine           │               │
│     │ ├─ Module 6: Deterministic 3-State Red-Flag Triage Engine        │               │
│     │ ├─ Module 7: Doctor Review Workspace & Must-Resolve Gates        │               │
│     │ ├─ Module 8: Multi-lingual Voice, Audio & Offline Sync Layer     │               │
│     │ ├─ Module 9: Admin Console, Analytics & Tamper-Evident Audit     │               │
│     │ └─ Module 10: Production Release Gates, Kill Switches & Hardening│               │
│     └───────┬──────────────┬──────────────┬──────────────┬─────────────┘               │
│             │              │              │              │                             │
│             ▼              ▼              ▼              ▼                             │
│     ┌──────────────┐┌──────────────┐┌────────────┐┌────────────────────────────┐       │
│     │  PostgreSQL  ││ Private Enc. ││ External / ││ Monitoring, Backup & Audit │       │
│     │  (Replica,   ││ Object Store ││ Local AI   ││ - PITR Continuous Archive   │       │
│     │  Connection  ││ (Prescription││ Providers  ││ - Merkle Hash Checkpoints  │       │
│     │  Pooling,    ││  & Lab Scans,││ (OCR, STT, ││ - Alert Canary Synthetic   │       │
│     │  PITR WAL)   ││  Signed URLs)││  LLM, SMS) ││ - Status Board (/status)   │       │
│     └──────────────┘└──────────────┘└────────────┘└────────────────────────────┘       │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architectural Principles

1. **Modular Monolith**: Clean boundaries between business domains with shared database transactions where necessary, avoiding distributed transaction complexity.
2. **Deterministic Triage Path**: Red-flag evaluation is decoupled from generative AI; rules are deterministic regex/keyword matches running directly on structured patient responses.
3. **Defense in Depth**: Zero secrets in client applications; short-lived session tokens; cryptographic audit hash chains; field-level patient data scoping.
4. **Resilient Alert Pathway**: Alert state lives in durable PostgreSQL storage; workers retry delivery automatically; connection losses trigger visible user interface warnings and automatic catch-up.
5. **Human Decision Primacy**: AI drafts, translations, and extracted values are preliminary assistive assets; final medical and legal responsibility resides strictly with the reviewing doctor.
