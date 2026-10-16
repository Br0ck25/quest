# OPERATIONS.md — Cloudflare Staging & Operations Runbook

> **QUEST: Kentucky — Operational Playbook for Staging, D1 Migrations, Monitoring, Backups, and Rollbacks.**

---

## 1. Cloudflare Architecture & Environment Overview

QUEST: Kentucky is architected as a standalone, zero-dependency edge application deployed to **Cloudflare Workers** with **Cloudflare D1** relational database persistence.

### Environments
| Environment | Worker Name | D1 Database Name | Purpose |
| :--- | :--- | :--- | :--- |
| **Local / Dev** | `quest-kentucky` (local runtime) | In-Memory / Local D1 | Fast local development and contract testing |
| **Staging** | `quest-kentucky-staging` | `quest_ky_staging_d1` | Pre-release verification, pilot cohort testing |
| **Production** | `quest-kentucky-production` | `quest_ky_production_d1` | Live public academic competition platform |

> [!IMPORTANT]
> **Strict Governance Rule**: Never guess production database IDs or deploy to production without explicit written sign-off from the project owner. All commands below use environment flags (`--env staging`).

---

## 2. Cloudflare D1 Database Provisioning

### Step 1: Create Remote D1 Databases
```bash
# Provision Staging D1 Database
npx wrangler d1 create quest_ky_staging_d1

# Provision Production D1 Database (requires explicit authorization)
npx wrangler d1 create quest_ky_production_d1
```
*Note the returned `database_id` strings and update them in `wrangler.json` under the respective environment blocks.*

### Step 2: Execute Ordered Migrations
D1 migrations are located in the [`migrations/`](file:///c:/Users/James/Downloads/Quest/migrations) directory.

#### Option A: Unified Full Schema (Recommended for Fresh Environments)
```bash
# Apply complete schema (Phases 1–9) to staging
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=migrations/0000_complete_schema.sql
```

#### Option B: Incremental Migration Sequence
```bash
# Apply migrations sequentially
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=migrations/0001_initial_schema.sql
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=migrations/0002_progression_and_rewards.sql
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=migrations/0003_multiplayer_rooms.sql
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=migrations/0004_duels.sql
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=migrations/0005_content_review.sql
```

---

## 3. Pre-Flight Build & Smoke Verification

Always build and verify the standalone artifact before triggering any deployment:

```bash
# 1. Compile source files from src/ into worker.js
npm run build

# 2. Run comprehensive unit & contract test suite
npm test

# 3. Run pre-flight staging smoke test (52 automated checks)
npm run smoke
```

---

## 4. Staging Deployment Procedure

```bash
# Deploy to Cloudflare Staging environment
npx wrangler deploy --env staging
```

### Staging Verification Checklist
- [ ] Visit `https://quest-kentucky-staging.<your-subdomain>.workers.dev/api/health`
  - Verify JSON response: `{"status":"ok","gradeBand":"6-8","phase":10,"mode":"release-candidate","securityAudit":"passed"}`
- [ ] Verify `GET /api/security/audit` returns `coppaCompliant: true` and `zeroPii: true`
- [ ] Verify Web App Manifest loads standalone icons at `/manifest.webmanifest`
- [ ] Test offline caching via Service Worker (`/sw.js`)
- [ ] Verify solo question combat, XP progression, and 1v1 duel lobby

---

## 5. Live Logs & Telemetry Monitoring

Monitor live edge worker traffic, errors, and WebSocket connections in real-time without logging student PII:

```bash
# Stream staging worker logs
npx wrangler tail --env staging

# Stream production worker logs (when live)
npx wrangler tail --env production

# Filter specifically for errors or status codes
npx wrangler tail --env staging --status error
```

---

## 6. Database Backup & Restore Procedures

### Automated D1 Backup / Export
```bash
# Export full SQL dump of staging database to local file
npx wrangler d1 export quest_ky_staging_d1 --remote --output=backups/staging_backup_$(date +%Y%m%d_%H%M%S).sql

# Export production database before major migrations
npx wrangler d1 export quest_ky_production_d1 --remote --output=backups/prod_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore / Recovery
```bash
# Restore from a previous SQL backup file
npx wrangler d1 execute quest_ky_staging_d1 --remote --file=backups/staging_backup_<TIMESTAMP>.sql
```

---

## 7. Rollback & Emergency Takedown Runbook

### Worker Version Rollback
If a newly deployed worker release exhibits unexpected edge errors:

```bash
# View deployment history and version IDs
npx wrangler deployments list --env staging

# Instantly roll back to previous deployment ID
npx wrangler rollback <DEPLOYMENT_ID> --env staging
```

### Emergency Question Takedown
If a question prompt is reported for inaccuracy or rights dispute, authorized reviewers can immediately deactivate it via API without redeploying code:

```bash
# Retire question from active rotation immediately
curl -X POST https://quest-kentucky-staging.<subdomain>.workers.dev/api/admin/questions/<QUESTION_ID>/retire \
  -H "Content-Type: application/json" \
  -H "X-Reviewer-Role: content_admin" \
  -H "X-Reviewer-Id: admin_emergency" \
  -d '{"reason": "Immediate review takedown request"}'
```
*Retired questions remain in the database to preserve historical student attempt references, but are instantly removed from student question delivery (`active = 0`).*

---

## 8. COPPA / FERPA Student Data Purge SLA

In compliance with COPPA and FERPA "Right to be Forgotten" mandates, requests by parents or school administrators to purge a student's pseudonymous records must be executed within **24 hours**:

```bash
# Purge all student data across all 7 relational tables
curl -X POST https://quest-kentucky-staging.<subdomain>.workers.dev/api/user/delete \
  -H "Content-Type: application/json" \
  -H "X-Reviewer-Role: super_admin" \
  -d '{"userId": "<PSEUDONYMOUS_USER_ID>"}'
```
Response:
```json
{
  "success": true,
  "userId": "student_handle_42",
  "purged": true
}
```
