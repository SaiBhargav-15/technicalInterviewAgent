import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createNeonStorage, type AssessmentInvite, type AssessmentSession, type CandidateResult } from "../src/storage";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env before importing.");
  const directory = path.resolve(process.argv[2] || "data");
  const read = <T>(name: string): T[] => {
    const data = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
    if (!Array.isArray(data)) throw new Error(`${name} must contain an array.`);
    return data;
  };
  const candidates = read<CandidateResult>("candidates.json");
  const sessions = read<AssessmentSession>("assessment-sessions.json");
  const invites = read<AssessmentInvite>("assessment-invites.json");
  if (candidates.some((candidate) => !candidate.id || !candidate.candidateEmail || !candidate.submittedAt)
    || sessions.some((session) => !session.sessionId || !session.inviteId)
    || invites.some((invite) => !invite.inviteId || !invite.createdAt || !invite.expiresAt)) {
    throw new Error("Import data contains missing identifiers, emails, or timestamps. Fix the JSON before importing.");
  }
  await createNeonStorage(process.env.DATABASE_URL).importData(candidates, sessions, invites);
  console.log(`Import complete: processed ${candidates.length} candidates, ${sessions.length} sessions, ${invites.length} invites. Existing IDs were kept.`);
}
main().catch((error) => {
  console.error("Import failed; no records were imported.", error?.code || (error?.name === "Error" ? error.message : "Database request failed"));
  process.exitCode = 1;
});
