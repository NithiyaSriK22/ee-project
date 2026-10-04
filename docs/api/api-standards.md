# MediKiosk — API Standards & Protocol

All MediKiosk API endpoints adhere to strict REST conventions, versioning, request correlation tracing, and standard envelope shapes.

## 1. Base URL & Versioning
All business APIs are prefixed with `/api/v1`.
- Kiosk API Base: `http://localhost:5000/api/v1`
- Doctor Portal Base: `http://localhost:5000/api/v1`

## 2. Standard Response Format

### Success (200, 201)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "medikiosk-backend"
  },
  "message": "Request successful",
  "meta": {
    "timestamp": "2026-09-26T06:45:00.000Z"
  }
}
```

### Error (400, 401, 403, 404, 429, 500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid interview payload",
    "details": [
      {
        "field": "patientId",
        "message": "Invalid UUID format"
      }
    ]
  }
}
```

## 3. Standard Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Payload fails Zod schema validation |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token/session |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g. duplicate hospital ID) |
| `RATE_LIMITED` | 429 | Rate limit threshold exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected system error (no stack trace leaked) |
| `DATABASE_ERROR` | 500 | Database query execution error |

## 4. Implemented Module 1 Endpoints
- `GET /api/v1/health` — Full system & database health check
- `GET /api/v1/health/live` — Kubernetes / load balancer liveness probe
- `GET /api/v1/health/ready` — Database readiness probe
