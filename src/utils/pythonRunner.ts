import { ScenarioQuestion } from "../types";
import { evaluatePythonScenario } from "./scenarioEvaluator";

export interface PythonExecutionResult {
  success: boolean;
  stdout: string;
  returnValue: any;
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

export function executePythonScenario(
  question: ScenarioQuestion,
  code: string
): PythonExecutionResult {
  const result = evaluatePythonScenario(question, code);

  return {
    success: result.success,
    stdout: result.message,
    returnValue: result.rows,
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
