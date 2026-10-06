import test from "node:test";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { neonConfig } from "@neondatabase/serverless";
import { createNeonStorage, StorageConflict, type AssessmentInvite, type AssessmentSession } from "./storage";

// Execute the real driver's parameterized statements in embedded PostgreSQL.
// Only HTTP transport is replaced; SQL, JSONB, constraints and rollback are real.
test("Neon storage persists across instances and commits complete assessments atomically", async (t) => {
  const db = new PGlite();
  const originalFetch = neonConfig.fetchFunction;
  neonConfig.fetchFunction = async (_url: string | URL | Request, options?: RequestInit) => {
    const body = JSON.parse(options!.body as string);
    const execute = async (client: Pick<PGlite, "query">, statement: { query: string; params: unknown[] }) => {
      const result = await client.query<Record<string, unknown>>(statement.query, statement.params);
      return {
        fields: result.fields,
        rows: result.rows.map((row) => result.fields.map((field) => {
          const value = row[field.name];
          return value == null ? null : typeof value === "object" ? JSON.stringify(value) : String(value);
        })),
        rowCount: result.affectedRows ?? result.rows.length,
      };
    };
    try {
      const result = body.queries
        ? await db.transaction(async (tx) => ({ results: await Promise.all(body.queries.map((query: any) => execute(tx, query))) }))
        : await execute(db, body);
      return new Response(JSON.stringify(result), { status: 200 });
    } catch (error: any) {
      return new Response(JSON.stringify({ message: error.message, code: error.code }), { status: 400 });
    }
  };
  t.after(async () => { neonConfig.fetchFunction = originalFetch; await db.close(); });
  const url = "postgresql://test:test@storage-test.example/test";
  const first = createNeonStorage(url);
  const second = createNeonStorage(url);
  const invite = (id: string, email = "candidate@example.com"): AssessmentInvite => ({
    inviteId: id, candidateName: "Test Candidate", email, track: "data_engineering",
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  const session = (id: string, inviteId: string, email = "candidate@example.com"): AssessmentSession => ({
    sessionId: id, inviteId, candidateEmail: email, track: "data_engineering",
    startedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 1_800_000).toISOString(), questionIds: [],
  });
  assert.deepEqual(await first.listCandidates(), []);
  await first.saveInvite(invite("invite-1"));
  assert.equal((await second.getInvite("invite-1"))?.email, "candidate@example.com");
  const claims = await Promise.all([
    first.claimInvite(session("session-1", "invite-1")),
    second.claimInvite(session("session-race", "invite-1")),
  ]);
  assert.equal(claims[0].sessionId, claims[1].sessionId);
  assert.equal((await db.query("SELECT id FROM assessment_sessions")).rows.length, 1);
  const candidate = { id: "candidate-1", candidateEmail: "candidate@example.com", submittedAt: new Date().toISOString(), overallScore: 72 };
  const submissions = await Promise.allSettled([
    first.submitCandidate(candidate, claims[0]), second.submitCandidate(candidate, claims[1]),
  ]);
  assert.equal(submissions.filter((result) => result.status === "fulfilled").length, 1);
  assert.ok(submissions.some((result) => result.status === "rejected" && result.reason instanceof StorageConflict));
  assert.deepEqual(await second.getCandidate(candidate.id), candidate);
  assert.equal((await second.getSession(claims[0].sessionId))?.submittedAt, candidate.submittedAt);
  assert.equal((await second.getInvite("invite-1"))?.usedAt, candidate.submittedAt);
  assert.equal(await second.getActiveSessionForInvite("invite-1"), undefined);

  await first.saveInvite(invite("invite-2"));
  const duplicateSession = await first.claimInvite(session("session-2", "invite-2"));
  await assert.rejects(second.submitCandidate({ ...candidate, id: "candidate-2" }, duplicateSession), StorageConflict);
  assert.equal((await first.getSession("session-2"))?.submittedAt, undefined, "email conflict rolls back session completion");
  assert.equal((await first.getInvite("invite-2"))?.usedAt, undefined, "email conflict rolls back invitation consumption");
  assert.equal((await first.listCandidates()).length, 1);

  await first.saveInvite({ ...invite("expired"), createdAt: new Date(Date.now() - 172_800_000).toISOString() });
  await assert.rejects(first.claimInvite(session("expired-session", "expired")), StorageConflict);
  assert.equal(await first.getSession("expired-session"), undefined);
  await first.saveInvite(invite("deadline-invite", "deadline@example.com"));
  const deadlineSession = await first.claimInvite({ ...session("deadline-session", "deadline-invite", "deadline@example.com"), deadlineAt: new Date(Date.now() - 1000).toISOString() });
  await assert.rejects(first.submitCandidate({ ...candidate, id: "late", candidateEmail: "deadline@example.com" }, deadlineSession), StorageConflict);
  assert.equal((await first.getInvite("deadline-invite"))?.usedAt, undefined);

  await first.importData([candidate], [], [invite("invite-1")]);
  assert.equal((await second.getInvite("invite-1"))?.usedAt, candidate.submittedAt, "re-import preserves existing records");
  await assert.rejects(first.importData([{ ...candidate, id: "import-conflict" }], [], [invite("import-rollback")]));
  assert.equal(await second.getInvite("import-rollback"), undefined, "failed import rolls back all records");

  const originalUrl = process.env.DATABASE_URL;
  const originalVercel = process.env.VERCEL;
  process.env.DATABASE_URL = url;
  process.env.VERCEL = "1";
  t.after(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
    if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
  });
  const { app } = await import("../backend");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (route: string, body: unknown) => fetch(`${base}${route}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).storage, "neon");
  const recruiterEmail = JSON.parse(fs.readFileSync("config/recruiter-allowlist.json", "utf8")).allowedEmails[0];
  const inviteResponse = await post("/api/assessment/invites", {
    recruiterEmail, candidateName: "API Test", candidateEmail: "api@example.com", track: "data_engineering",
  });
  assert.equal(inviteResponse.status, 201);
  const apiInvite = await inviteResponse.json();
  const apiClaims = await Promise.all([0, 1].map(() => post("/api/assessment/sessions", { candidateEmail: "api@example.com", inviteId: apiInvite.inviteId })));
  assert.ok(apiClaims.every((response) => [200, 201].includes(response.status)));
  const apiSessions = await Promise.all(apiClaims.map((response) => response.json()));
  assert.equal(apiSessions[0].sessionId, apiSessions[1].sessionId);
  assert.equal(apiSessions[0].questionIds.length, 18);
  const submitPath = `/api/assessment/sessions/${apiSessions[0].sessionId}/submit`;
  const resultResponse = await post(submitPath, { candidateEmail: "api@example.com", answers: {}, code: {} });
  assert.equal(resultResponse.status, 201);
  const apiCandidate = await resultResponse.json();
  assert.equal((await second.getCandidate(apiCandidate.id))?.candidateEmail, "api@example.com");
  assert.equal((await fetch(`${base}/api/candidates/${apiCandidate.id}`)).status, 200);
  assert.equal((await post(submitPath, { candidateEmail: "api@example.com" })).status, 409);
  assert.equal((await fetch(`${base}/api/assessment/invites/${apiInvite.inviteId}`)).status, 404);
  neonConfig.fetchFunction = async () => { throw new Error("Simulated database outage"); };
  const unavailable = await fetch(`${base}/api/health`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "Assessment storage is unavailable. Please try again later." });
});
