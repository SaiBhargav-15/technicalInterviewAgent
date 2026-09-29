import { ScenarioQuestion } from "../types";
import { evaluateSqlScenario } from "./scenarioEvaluator";

export interface ExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  message: string;
  executionTimeMs: number;
  testCaseResults: {
    id: string;
    name: string;
    passed: boolean;
    actual: string;
    expected: string;
    feedback: string;
  }[];
  score: number;
  syntaxScore: number;
  structuralScore: number;
  testCaseScore: number;
  codeQualityScore: number;
  passedTests: number;
  totalTests: number;
  feedback: string[];
}

export function executeSQLScenario(
  question: ScenarioQuestion,
  query: string
): ExecutionResult {
  const result = evaluateSqlScenario(question, query);

  return {
    success: result.success,
    columns: result.columns,
    rows: result.rows,
    message: result.message,
    executionTimeMs: result.executionTimeMs,
    testCaseResults: result.testCaseResults,
    score: result.score,
    syntaxScore: result.syntaxScore,
    structuralScore: result.structuralScore,
    testCaseScore: result.testCaseScore,
    codeQualityScore: result.codeQualityScore,
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    feedback: result.feedback,
  };
}
