import test from "node:test";
import assert from "node:assert/strict";

import { ASSESSMENT_INVITE_VALIDITY_MS, clampInviteExpiry, isInviteExpired } from "./invitePolicy";

test("caps old seven-day invitations at 24 hours from creation", () => {
  const createdAt = "2026-09-28T12:00:00.000Z";
  const oldSevenDayExpiry = "2026-10-05T12:00:00.000Z";

  assert.equal(
    clampInviteExpiry(createdAt, oldSevenDayExpiry),
    new Date(Date.parse(createdAt) + ASSESSMENT_INVITE_VALIDITY_MS).toISOString()
  );
});

test("preserves a shorter existing expiry and rejects links at the expiry instant", () => {
  const createdAt = "2026-09-28T12:00:00.000Z";
  const shortExpiry = "2026-09-28T15:00:00.000Z";
  const expiry = clampInviteExpiry(createdAt, shortExpiry);

  assert.equal(expiry, shortExpiry);
  assert.equal(isInviteExpired(expiry, Date.parse(shortExpiry) - 1), false);
  assert.equal(isInviteExpired(expiry, Date.parse(shortExpiry)), true);
});