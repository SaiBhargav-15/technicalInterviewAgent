import test from "node:test";
import assert from "node:assert/strict";

import { calculateProctoringAudit } from "./proctoringAudit";

test("derives integrity and violation counts from events, ignoring client totals", () => {
  const audit = calculateProctoringAudit({
    integrityScore: 0,
    violationsCount: 99,
    events: [
      { id: "start", type: "INFO", message: "Session started" },
      { id: "tab", type: "TAB_SWITCH", severity: "medium", message: "Tab switch" },
      { id: "paste", type: "PASTE_DETECTED", severity: "high", message: "Paste detected" },
      { id: "fullscreen", type: "FULLSCREEN_EXIT", severity: "high", message: "Fullscreen exited" },
    ],
  });

  assert.equal(audit.integrityScore, 74);
  assert.equal(audit.violationsCount, 3);
  assert.equal(audit.tabSwitchCount, 1);
  assert.equal(audit.pasteCount, 1);
  assert.equal(audit.events.length, 4);
});

test("starts at full integrity when there are no proctoring events", () => {
  const audit = calculateProctoringAudit({ integrityScore: 12, violationsCount: 8, events: [] });

  assert.equal(audit.integrityScore, 100);
  assert.equal(audit.violationsCount, 0);
});