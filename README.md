# Technical Interview Platform

React/Vite frontend with an Express API for role-based technical assessments.

## Local Development

Prerequisite: Node.js.

```powershell
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Vercel Deployment

Vercel detects the root `server.ts` Express export as the application server and handles API routes such as `/api/auth/recruiter-login`. Vercel's Express framework preset ignores `express.static()`, so the built frontend is output to `public/` (via `vite.config.ts`'s `build.outDir`) and served directly by Vercel's CDN instead of through the Express app. The source logo lives in `raw-public/` (Vite's `publicDir`) since `public/` itself is build output. Keep the repository root as the Vercel project root and use the checked-in `vercel.json` build settings.

Recruiter access uses the exact addresses in `config/recruiter-allowlist.json`; addresses must use `@chryselys.com`. Make sure the approved list is included in the deployment.

**Persistence limitation:** assessment invites, sessions, and candidate results currently use local JSON files and in-memory maps. Vercel function filesystems and memory are not durable or shared across invocations. The routes can resolve, but full assessment workflows are not reliable for team use until these stores are moved to a persistent database. Use synthetic data only until then.

KEKA synchronization is not configured; the current UI only previews the payload.