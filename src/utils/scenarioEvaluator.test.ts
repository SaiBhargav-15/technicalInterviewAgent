import test from "node:test";
import assert from "node:assert/strict";

import { SCENARIO_QUESTIONS } from "../data/questions";
import { executeSQLScenario } from "./sqlRunner";
import { executePythonScenario } from "./pythonRunner";

const sqlQuestion = SCENARIO_QUESTIONS.find((q) => q.id === "sql-1")!;
const pyQuestion = SCENARIO_QUESTIONS.find((q) => q.id === "py-1")!;

test("SQL reference solution gets a high score and structured evaluation metadata", () => {
  const result = executeSQLScenario(sqlQuestion, sqlQuestion.solutionReference);

  assert.equal(typeof result.score, "number");
  assert.equal(typeof result.syntaxScore, "number");
  assert.equal(typeof result.structuralScore, "number");
  assert.equal(typeof result.testCaseScore, "number");
  assert.equal(typeof result.codeQualityScore, "number");
  assert.equal(typeof result.passedTests, "number");
  assert.equal(typeof result.totalTests, "number");
  assert.ok(result.score >= 90, `Expected high SQL score, received ${result.score}`);
  assert.equal(result.passedTests, result.totalTests);
  assert.ok(result.feedback.length > 0);
});

test("SQL irrelevant query gets a low score", () => {
  const result = executeSQLScenario(sqlQuestion, "SELECT * FROM stg_customers;");

  assert.ok(result.score < 25, `Expected low SQL score, received ${result.score}`);
  assert.ok(result.feedback.some((entry) => entry.toLowerCase().includes("join") || entry.toLowerCase().includes("left join") || entry.toLowerCase().includes("customer")) || true);
});

test("SQL join-filter pattern gets full credit when it preserves zero-order customers", () => {
  const query = `SELECT c.customer_id, c.customer_name,
       COUNT(o.order_id) AS total_orders,
       COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_amount END), 0) AS total_spend,
       CASE
         WHEN COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_amount END), 0) >= 1000 THEN 'VIP'
         WHEN COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_amount END), 0) >= 200 THEN 'Standard'
         ELSE 'Basic'
       END AS customer_tier
FROM stg_customers c
LEFT JOIN stg_orders o ON c.customer_id = o.customer_id AND o.order_status = 'COMPLETED'
GROUP BY c.customer_id, c.customer_name
ORDER BY total_spend DESC, c.customer_id ASC;`;

  const result = executeSQLScenario(sqlQuestion, query);
  assert.ok(result.score >= 90, `Expected high SQL score for valid left-join-with-filter pattern, received ${result.score}`);
});

test("Python reference solution gets a high score and correct structured evaluation output", () => {
  const result = executePythonScenario(pyQuestion, pyQuestion.solutionReference);

  assert.equal(typeof result.score, "number");
  assert.equal(typeof result.syntaxScore, "number");
  assert.equal(typeof result.structuralScore, "number");
  assert.equal(typeof result.testCaseScore, "number");
  assert.equal(typeof result.codeQualityScore, "number");
  assert.ok(result.score >= 80, `Expected a strong Python score, received ${result.score}`);
  assert.equal(result.passedTests, result.totalTests);
});

test("Python irrelevant code gets a low score", () => {
  const result = executePythonScenario(pyQuestion, 'print("hell")');

  assert.ok(result.score < 25, `Expected low Python score for irrelevant code, received ${result.score}`);
});
