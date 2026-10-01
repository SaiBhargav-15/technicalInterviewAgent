import test from "node:test";
import assert from "node:assert/strict";

import { DATA_ENGINEERING_QUESTIONS } from "../data/questions";
import { ALL_EXAM_QUESTIONS } from "../data/questions";
import { selectQuestionsForTrack, selectSessionQuestions } from "./questionSelection";

function assertDifficultyMix(questions: typeof ALL_EXAM_QUESTIONS) {
  assert.equal(questions.length, 6);
  assert.equal(questions.filter((question) => question.difficulty === "Basic").length, 3);
  assert.equal(questions.filter((question) => question.difficulty === "Intermediate").length, 2);
  assert.equal(questions.filter((question) => question.difficulty === "Advanced").length, 1);
}

test("selects six unique questions from each assessment topic", () => {
  const selected = selectSessionQuestions(ALL_EXAM_QUESTIONS, 6, (max) => max - 1);

  assert.equal(selected.length, 18);
  assert.equal(new Set(selected.map((question) => question.id)).size, 18);
  assert.equal(selected.filter((question) => question.type === "mdm").length, 6);
  assert.equal(selected.filter((question) => question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")).length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "python").length, 6);
  assert.ok(selected.every((question) => ALL_EXAM_QUESTIONS.includes(question)));
  assertDifficultyMix(selected.filter((question) => question.type === "mdm"));
  assertDifficultyMix(selected.filter((question) => question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")));
  assertDifficultyMix(selected.filter((question) => question.type === "scenario" && question.language === "python"));
});

test("rejects a topic pool smaller than the requested sample", () => {
  const questionPool = ALL_EXAM_QUESTIONS.filter(
    (question) => !["mdm-1", "mdm-2", "mdm-3", "mdm-4", "mdm-5", "mdm-6"].includes(question.id)
  );

  assert.throws(
    () => selectSessionQuestions(questionPool, 6),
    /Question pool has 0 items; 3 are required\./
  );
});

test("Data Stewardship track selects MDM, SQL, and basic Python without repeats", () => {
  const selected = selectQuestionsForTrack(ALL_EXAM_QUESTIONS, "data_stewardship", 6, (max) => max - 1);

  assert.equal(selected.length, 18);
  assert.equal(selected.filter((question) => question.type === "mdm").length, 6);
  assert.equal(selected.filter((question) => question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")).length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "python").length, 6);
  assertDifficultyMix(selected.filter((question) => question.type === "mdm"));
  assertDifficultyMix(selected.filter((question) => question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")));
  assertDifficultyMix(selected.filter((question) => question.type === "scenario" && question.language === "python"));
});

test("Data Engineering track selects SQL, Python, and Data Engineering without MDM", () => {
  const selected = selectQuestionsForTrack(ALL_EXAM_QUESTIONS, "data_engineering", 6, (max) => max - 1);

  assert.equal(selected.length, 18);
  assert.equal(new Set(selected.map((question) => question.id)).size, 18);
  assert.equal(selected.filter((question) => question.type === "mdm").length, 0);
  assert.equal(selected.filter((question) => question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")).length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "python").length, 6);
  assert.equal(selected.filter((question) => question.type === "data-engineering-mcq").length, 6);
  assertDifficultyMix(selected.filter((question) => question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")));
  assertDifficultyMix(selected.filter((question) => question.type === "scenario" && question.language === "python"));
  assertDifficultyMix(selected.filter((question) => question.type === "data-engineering-mcq"));
});

test("Data Engineering Fundamentals bank has the specified difficulty distribution", () => {
  assert.equal(DATA_ENGINEERING_QUESTIONS.length, 10);
  assert.equal(DATA_ENGINEERING_QUESTIONS.filter((question) => question.difficulty === "Basic").length, 4);
  assert.equal(DATA_ENGINEERING_QUESTIONS.filter((question) => question.difficulty === "Intermediate").length, 4);
  assert.equal(DATA_ENGINEERING_QUESTIONS.filter((question) => question.difficulty === "Advanced").length, 2);
});