# Technical Interview Platform

React/Vite frontend with an Express API for role-based technical assessments.

## Local Development

Prerequisite: Node.js 22 or newer.

```sh
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Set `DATABASE_URL` in the ignored `.env` file to use Neon locally; use a Development database/branch. Without that variable, local development uses `data/*.json` and the existing sample candidates.

## Vercel Deployment

1. Connect your Neon database to this Vercel project and enable `DATABASE_URL` for Production and Preview. Use separate databases/branches for Preview and Production.
2. Keep the repository root as the project root and use the checked-in `vercel.json` build settings.
3. Deploy the changes. The build bundles `backend.ts` into `dist/server.cjs`; `api/index.js` exports the Express app, and `/api/*` rewrites to that function. Vite builds the frontend to `public/`, served by Vercel's CDN. Source static assets live in `raw-public/`.
4. Visit `/api/health`. A working database returns `status: "healthy"` and `storage: "neon"`. A missing connection string or unavailable database returns HTTP 503.
5. Create a test invitation, start an assessment, submit it, and verify the result still appears after a redeploy.

The API automatically creates `candidates`, `assessment_sessions`, and `assessment_invites` on its first database request. The database user needs permission to create tables. Every storage route queries Neon directly; invite claims and submissions are atomic, and a candidate email can only be submitted once. Vercel never falls back to JSON storage when the database is missing or unavailable.

Recruiter access uses the exact addresses in `config/recruiter-allowlist.json`; addresses must use `@chryselys.com`. The deployment includes this file.

## Optional Existing Data Import

A new database starts empty. Existing JSON files and built-in demo candidates are not automatically inserted. If `data/*.json` contains records you want to retain, set the target database's `DATABASE_URL` in `.env`, then run:

```sh
npm run db:import
# Or import from another directory containing the three JSON files:
npm run db:import -- /path/to/data
```

The import runs in one transaction and preserves records whose IDs already exist. Conflicting candidate emails or multiple sessions for one invite abort the import. Resolve those conflicts in the source data before retrying. Existing invite expiry is capped at 24 hours from creation, so importing an old invite does not renew it.

## Validation

```sh
npm run lint
npm run build
npm test
```

Storage tests execute the Neon driver's SQL against an isolated embedded PostgreSQL database; they do not connect to your Neon project.

KEKA synchronization is not configured; the current UI only previews the payload.
