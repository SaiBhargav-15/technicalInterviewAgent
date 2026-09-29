import test from "node:test";
import assert from "node:assert/strict";

import { ALL_EXAM_QUESTIONS } from "../data/questions";
import { selectQuestionsForTrack, selectSessionQuestions } from "./questionSelection";

test("selects six unique questions from each assessment topic", () => {
  const selected = selectSessionQuestions(ALL_EXAM_QUESTIONS, 6, (max) => max - 1);

  assert.equal(selected.length, 18);
  assert.equal(new Set(selected.map((question) => question.id)).size, 18);
  assert.equal(selected.filter((question) => question.type === "mdm").length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "sql").length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "python").length, 6);
  assert.ok(selected.every((question) => ALL_EXAM_QUESTIONS.includes(question)));
});

test("rejects a topic pool smaller than the requested sample", () => {
  const questionPool = ALL_EXAM_QUESTIONS.filter(
    (question) => !["mdm-1", "mdm-2", "mdm-3", "mdm-4", "mdm-5"].includes(question.id)
  );

  assert.throws(
    () => selectSessionQuestions(questionPool, 6),
    /Question pool has 5 items; 6 are required\./
  );
});

test("Data Stewardship track selects MDM, SQL, and basic Python without repeats", () => {
  const selected = selectQuestionsForTrack(ALL_EXAM_QUESTIONS, "data_stewardship", 6, (max) => max - 1);

  assert.equal(selected.length, 18);
  assert.equal(selected.filter((question) => question.type === "mdm").length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "sql").length, 6);
  assert.equal(selected.filter((question) => question.type === "scenario" && question.language === "python").length, 6);
  assert.ok(selected.every((question) => question.difficulty !== "Advanced"));
});

test("Data Engineering track stays unavailable until its third topic bank exists", () => {
  assert.throws(
    () => selectQuestionsForTrack(ALL_EXAM_QUESTIONS, "data_engineering"),
    /third topic question bank is added/
  );
});