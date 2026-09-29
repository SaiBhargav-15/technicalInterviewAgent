import test from "node:test";
import assert from "node:assert/strict";

import { computeDifficultyScores } from "./difficultyScoring";

test("averages answered responses by difficulty and reports skipped counts", () => {
  const scores = computeDifficultyScores([
    { difficultyLevel: "Basic", score: 100, answered: true },
    { difficultyLevel: "Basic", score: 0, answered: false },
    { difficultyLevel: "Intermediate", score: 80, answered: true },
    { difficultyLevel: "Intermediate", score: 60, answered: true },
    { difficultyLevel: "Advanced", score: 0, answered: false },
  ]);

  assert.deepEqual(scores, {
    Basic: { score: 100, answered: 1, total: 2 },
    Intermediate: { score: 70, answered: 2, total: 2 },
    Advanced: { score: null, answered: 0, total: 1 },
  });
});