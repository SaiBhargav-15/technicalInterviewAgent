import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { AssessmentTrack } from "./types";
import { clampInviteExpiry, isInviteExpired } from "./utils/invitePolicy";

export type AssessmentSession = {
  sessionId: string;
  candidateEmail: string;
  inviteId: string;
  track: AssessmentTrack;
  startedAt: string;
  deadlineAt: string;
  questionIds: string[];
  submittedAt?: string;
};
export type AssessmentInvite = {
  inviteId: string;
  candidateName: string;
  email: string;
  track: AssessmentTrack;
  createdAt: string;
  expiresAt: string;
  claimedAt?: string;
  usedAt?: string;
};
export type CandidateResult = { id: string; candidateEmail: string; submittedAt: string; [key: string]: any };
export class StorageConflict extends Error {}

export interface AssessmentStorage {
  mode: "neon" | "json";
  listCandidates(): Promise<CandidateResult[]>;
  getCandidate(id: string): Promise<CandidateResult | undefined>;
  candidateEmailExists(email: string): Promise<boolean>;
  getInvite(id: string): Promise<AssessmentInvite | undefined>;
  saveInvite(invite: AssessmentInvite): Promise<void>;
  getSession(id: string): Promise<AssessmentSession | undefined>;
  getActiveSessionForInvite(id: string): Promise<AssessmentSession | undefined>;
  claimInvite(session: AssessmentSession): Promise<AssessmentSession>;
  submitCandidate(candidate: CandidateResult, session: AssessmentSession): Promise<void>;
}

const normalizeInvite = (invite: AssessmentInvite): AssessmentInvite => ({
  ...invite, expiresAt: clampInviteExpiry(invite.createdAt, invite.expiresAt),
});

export function createNeonStorage(databaseUrl: string): AssessmentStorage & {
  importData(candidates: CandidateResult[], sessions: AssessmentSession[], invites: AssessmentInvite[]): Promise<void>;
} {
  const sql = neon(databaseUrl);
  let initialization: Promise<unknown> | undefined;
  function ready() {
    if (!initialization) {
      initialization = sql.transaction([
        sql`CREATE TABLE IF NOT EXISTS candidates (
          id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, data JSONB NOT NULL
        )`,
        sql`CREATE TABLE IF NOT EXISTS assessment_invites (
          id TEXT PRIMARY KEY, data JSONB NOT NULL
        )`,
        sql`CREATE TABLE IF NOT EXISTS assessment_sessions (
          id TEXT PRIMARY KEY, invite_id TEXT NOT NULL UNIQUE, data JSONB NOT NULL
        )`,
      ]).catch((error) => { initialization = undefined; throw error; });
    }
    return initialization;
  }
  const activeSession = async (id: string): Promise<AssessmentSession | undefined> => {
    await ready();
    const rows = await sql`SELECT data FROM assessment_sessions WHERE invite_id = ${id}
      AND data->>'submittedAt' IS NULL AND (data->>'deadlineAt')::timestamptz > now()`;
    return rows[0]?.data;
  };
  return {
    mode: "neon",
    async listCandidates() {
      await ready();
      const rows = await sql`SELECT data FROM candidates ORDER BY data->>'submittedAt' DESC, id`;
      return rows.map((row) => row.data);
    },
    async getCandidate(id) {
      await ready();
      return (await sql`SELECT data FROM candidates WHERE id = ${id}`)[0]?.data;
    },
    async candidateEmailExists(email) {
      await ready();
      return (await sql`SELECT id FROM candidates WHERE email = ${email}`).length > 0;
    },
    async getInvite(id) {
      await ready();
      const invite = (await sql`SELECT data FROM assessment_invites WHERE id = ${id}`)[0]?.data;
      return invite ? normalizeInvite(invite) : undefined;
    },
    async saveInvite(invite) {
      await ready();
      await sql`INSERT INTO assessment_invites (id, data) VALUES (${invite.inviteId}, ${JSON.stringify(invite)}::jsonb)`;
    },
    async getSession(id) {
      await ready();
      return (await sql`SELECT data FROM assessment_sessions WHERE id = ${id}`)[0]?.data;
    },
    getActiveSessionForInvite: activeSession,
    async claimInvite(session) {
      await ready();
      // A single statement locks and claims the invite, then saves its session atomically.
      const rows = await sql`WITH claimed AS (
        UPDATE assessment_invites SET data = data || jsonb_build_object('claimedAt', ${session.startedAt}::text)
        WHERE id = ${session.inviteId} AND data->>'email' = ${session.candidateEmail}
          AND data->>'track' = ${session.track} AND data->>'claimedAt' IS NULL AND data->>'usedAt' IS NULL
          AND LEAST((data->>'expiresAt')::timestamptz,
            (data->>'createdAt')::timestamptz + interval '24 hours') > now()
        RETURNING id
      ) INSERT INTO assessment_sessions (id, invite_id, data)
        SELECT ${session.sessionId}, id, ${JSON.stringify(session)}::jsonb FROM claimed RETURNING data`;
      if (rows[0]) return rows[0].data;
      // Concurrent requests resume the session saved by the winning claim.
      const existing = await activeSession(session.inviteId);
      if (existing && existing.candidateEmail === session.candidateEmail) return existing;
      throw new StorageConflict("This invitation has expired or already been claimed.");
    },
    async submitCandidate(candidate, session) {
      await ready();
      try {
        const rows = await sql`WITH completed AS (
          UPDATE assessment_sessions SET data = data || jsonb_build_object('submittedAt', ${candidate.submittedAt}::text)
          WHERE id = ${session.sessionId} AND invite_id = ${session.inviteId}
            AND data->>'candidateEmail' = ${candidate.candidateEmail} AND data->>'submittedAt' IS NULL
            AND (data->>'deadlineAt')::timestamptz > now()
            AND EXISTS (SELECT 1 FROM assessment_invites WHERE id = ${session.inviteId}
              AND data->>'email' = ${candidate.candidateEmail} AND data->>'track' = ${session.track}
              AND data->>'usedAt' IS NULL)
          RETURNING invite_id
        ), saved AS (
          INSERT INTO candidates (id, email, data)
          SELECT ${candidate.id}, ${candidate.candidateEmail}, ${JSON.stringify(candidate)}::jsonb FROM completed
          RETURNING id
        ), used AS (
          UPDATE assessment_invites SET data = data || jsonb_build_object('usedAt', ${candidate.submittedAt}::text)
          WHERE id IN (SELECT invite_id FROM completed) RETURNING id
        ) SELECT id FROM saved`;
        if (!rows.length) throw new StorageConflict("Assessment has already been submitted, expired, or could not be verified.");
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new StorageConflict("An assessment has already been submitted for this email address or candidate ID.");
        }
        throw error;
      }
    },
    async importData(candidates, sessions, invites) {
      await ready();
      const queries = [
        ...invites.map((invite) => sql`INSERT INTO assessment_invites (id, data)
          VALUES (${invite.inviteId}, ${JSON.stringify(normalizeInvite(invite))}::jsonb) ON CONFLICT (id) DO NOTHING`),
        ...sessions.map((session) => sql`INSERT INTO assessment_sessions (id, invite_id, data)
          VALUES (${session.sessionId}, ${session.inviteId}, ${JSON.stringify(session)}::jsonb) ON CONFLICT (id) DO NOTHING`),
        ...candidates.map((candidate) => sql`INSERT INTO candidates (id, email, data)
          VALUES (${candidate.id}, ${candidate.candidateEmail.trim().toLowerCase()}, ${JSON.stringify(candidate)}::jsonb)
          ON CONFLICT (id) DO NOTHING`),
      ];
      if (queries.length) await sql.transaction(queries);
    },
  };
}

export function createJsonStorage(directory: string, initialCandidates: CandidateResult[]): AssessmentStorage {
  function read<T>(name: string, fallback: T): T {
    const file = path.join(directory, name);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
  }
  function write(name: string, data: unknown) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), JSON.stringify(data, null, 2), "utf8");
  }
  const candidates = read("candidates.json", initialCandidates);
  const invites = new Map(read<AssessmentInvite[]>("assessment-invites.json", []).map((invite) => [invite.inviteId, normalizeInvite(invite)]));
  const sessions = new Map(read<AssessmentSession[]>("assessment-sessions.json", []).map((session) => [session.sessionId, session]));
  const activeSession = (id: string) => [...sessions.values()].find((session) => session.inviteId === id && !session.submittedAt && Date.parse(session.deadlineAt) > Date.now());
  return {
    mode: "json",
    async listCandidates() { return [...candidates]; },
    async getCandidate(id) { return candidates.find((candidate) => candidate.id === id); },
    async candidateEmailExists(email) { return candidates.some((candidate) => candidate.candidateEmail?.trim().toLowerCase() === email); },
    async getInvite(id) { return invites.get(id); },
    async saveInvite(invite) { invites.set(invite.inviteId, invite); write("assessment-invites.json", [...invites.values()]); },
    async getSession(id) { return sessions.get(id); },
    async getActiveSessionForInvite(id) { return activeSession(id); },
    async claimInvite(session) {
      const invite = invites.get(session.inviteId);
      if (!invite || invite.usedAt || invite.email !== session.candidateEmail || invite.track !== session.track) throw new StorageConflict("Invalid invitation.");
      const existing = activeSession(session.inviteId);
      if (existing) return existing;
      if (invite.claimedAt || isInviteExpired(invite.expiresAt)) throw new StorageConflict("This invitation has expired or already been claimed.");
      invite.claimedAt = session.startedAt;
      sessions.set(session.sessionId, session);
      write("assessment-sessions.json", [...sessions.values()]);
      write("assessment-invites.json", [...invites.values()]);
      return session;
    },
    async submitCandidate(candidate, session) {
      const current = sessions.get(session.sessionId);
      const invite = invites.get(session.inviteId);
      if (!current || current.submittedAt || Date.parse(current.deadlineAt) <= Date.now() || !invite || invite.usedAt || invite.email !== candidate.candidateEmail || invite.track !== session.track) throw new StorageConflict("Assessment has already been submitted, expired, or could not be verified.");
      if (candidates.some((item) => item.id === candidate.id || item.candidateEmail?.trim().toLowerCase() === candidate.candidateEmail)) throw new StorageConflict("An assessment has already been submitted for this email address or candidate ID.");
      current.submittedAt = candidate.submittedAt;
      invite.usedAt = candidate.submittedAt;
      candidates.unshift(candidate);
      write("candidates.json", candidates);
      write("assessment-sessions.json", [...sessions.values()]);
      write("assessment-invites.json", [...invites.values()]);
    },
  };
}
