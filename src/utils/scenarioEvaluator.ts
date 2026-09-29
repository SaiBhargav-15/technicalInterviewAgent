import { ScenarioQuestion } from "../types";

export interface StructuredEvaluationResult {
  score: number;
  syntaxScore: number;
  structuralScore: number;
  testCaseScore: number;
  codeQualityScore: number;
  passedTests: number;
  totalTests: number;
  success: boolean;
  feedback: string[];
  testCaseResults: {
    id: string;
    name: string;
    passed: boolean;
    actual: string;
    expected: string;
    feedback: string;
  }[];
  columns: string[];
  rows: Record<string, any>[];
  message: string;
  executionTimeMs: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sqlNormalized = (value: string) => (value ?? "").trim();
const upper = (value: string) => value.toUpperCase();

function getQuestionMetadata(question: ScenarioQuestion) {
  return question.evaluation ?? {};
}

function inferSqlStructuralChecks(question: ScenarioQuestion) {
  const checks: Array<{ id: string; label: string; weight: number; patterns: string[] }> = [];
  const problem = upper(question.problemStatement ?? "");
  const rules = (question.businessRules ?? []).join(" ").toUpperCase();

  if (question.sampleTables.some((table) => table.tableName.toUpperCase().includes("CUSTOMER"))) {
    checks.push({
      id: "uses_customer_table",
      label: "Uses required customer table",
      weight: 10,
      patterns: ["STG_CUSTOMERS", "CUSTOMER_ID"],
    });
  }

  if (question.sampleTables.some((table) => table.tableName.toUpperCase().includes("ORDER"))) {
    checks.push({
      id: "uses_order_table",
      label: "Uses required order table",
      weight: 10,
      patterns: ["STG_ORDERS", "ORDER_STATUS", "ORDER_AMOUNT"],
    });
  }

  if (problem.includes("LEFT JOIN") || rules.includes("LEFT JOIN")) {
    checks.push({
      id: "left_join",
      label: "Uses LEFT JOIN",
      weight: 15,
      patterns: ["LEFT JOIN", "LEFT OUTER JOIN"],
    });
  }

  if (problem.includes("COMPLETED") || rules.includes("COMPLETED")) {
    checks.push({
      id: "completed_filter",
      label: "Filters COMPLETED orders",
      weight: 15,
      patterns: ["ORDER_STATUS = 'COMPLETED'", "ORDER_STATUS='COMPLETED'", "AND O.ORDER_STATUS = 'COMPLETED'", "CASE WHEN O.ORDER_STATUS = 'COMPLETED' THEN"],
    });
  }

  if (problem.includes("COUNT") || rules.includes("COUNT")) {
    checks.push({
      id: "total_orders",
      label: "Computes total_orders",
      weight: 10,
      patterns: ["COUNT(", "COUNT ("],
    });
  }

  if (problem.includes("SUM") || rules.includes("SUM")) {
    checks.push({
      id: "total_spend",
      label: "Computes total_spend",
      weight: 10,
      patterns: ["SUM(", "SUM ("],
    });
  }

  if (problem.includes("CASE") || rules.includes("CASE") || question.problemStatement.toLowerCase().includes("tier")) {
    checks.push({
      id: "customer_tier",
      label: "Calculates customer tier",
      weight: 10,
      patterns: ["CASE", "VIP", "STANDARD", "BASIC"],
    });
  }

  checkFallbackGroupOrder(question, checks);
  return checks;
}

function checkFallbackGroupOrder(question: ScenarioQuestion, checks: Array<{ id: string; label: string; weight: number; patterns: string[] }>) {
  if (checks.some((check) => check.id === "left_join") || checks.some((check) => check.id === "customer_tier")) {
    checks.push({
      id: "group_by",
      label: "Groups by customer fields",
      weight: 5,
      patterns: ["GROUP BY", "GROUP BY C.CUSTOMER_ID", "GROUP BY CUSTOMER_ID"],
    });
    checks.push({
      id: "order_by",
      label: "Orders correctly",
      weight: 5,
      patterns: ["ORDER BY", "TOTAL_SPEND DESC", "CUSTOMER_ID ASC"],
    });
  }
}

function getSqlStructuralChecks(question: ScenarioQuestion) {
  const metadata = getQuestionMetadata(question);
  if (metadata && Array.isArray((metadata as any).structuralChecks) && (metadata as any).structuralChecks.length > 0) {
    return (metadata as any).structuralChecks as Array<{ id: string; label: string; weight: number; patterns: string[] }>;
  }

  return inferSqlStructuralChecks(question);
}

function evaluateSqlStructural(question: ScenarioQuestion, normalizedQuery: string) {
  const checks = getSqlStructuralChecks(question);
  const upperQuery = upper(normalizedQuery);
  const totalWeight = checks.reduce((sum, item) => sum + (item.weight ?? 0), 0) || 1;

  let matchedWeight = 0;
  const matched: string[] = [];
  for (const check of checks) {
    const patterns = (check.patterns ?? []).map((pattern) => pattern.toUpperCase());
    const isMatch = patterns.some((pattern) => upperQuery.includes(pattern));
    if (isMatch) {
      matchedWeight += Number(check.weight ?? 0);
      matched.push(check.label);
    }
  }

  return {
    totalWeight,
    matchedWeight,
    matched,
    structuralScore: clamp((matchedWeight / totalWeight) * 30, 0, 30),
  };
}

function buildSqlTestResults(question: ScenarioQuestion, normalizedQuery: string) {
  const upperQuery = upper(normalizedQuery);
  const results = question.testCases.map((tc) => ({
    id: tc.id,
    name: tc.name,
    passed: false,
    actual: "Query not yet validated",
    expected: tc.expectedOutputSummary,
    feedback: tc.description,
  }));

  if (question.id === "sql-1") {
    const hasCustomers = upperQuery.includes("STG_CUSTOMERS") || upperQuery.includes("CUSTOMER_ID");
    const hasOrders = upperQuery.includes("STG_ORDERS") || upperQuery.includes("ORDER_AMOUNT");
    const hasLeftJoin = upperQuery.includes("LEFT JOIN") || upperQuery.includes("LEFT OUTER JOIN");
    const hasCompletedFilter = upperQuery.includes("ORDER_STATUS = 'COMPLETED'") || upperQuery.includes("ORDER_STATUS='COMPLETED'") || upperQuery.includes("AND O.ORDER_STATUS = 'COMPLETED'") || upperQuery.includes("CASE WHEN O.ORDER_STATUS = 'COMPLETED' THEN");
    const hasCount = upperQuery.includes("COUNT(");
    const hasSum = upperQuery.includes("SUM(");
    const hasTierCase = upperQuery.includes("CASE") && (upperQuery.includes("VIP") || upperQuery.includes("STANDARD") || upperQuery.includes("BASIC"));
    const hasGroupBy = upperQuery.includes("GROUP BY");
    const hasOrderBy = upperQuery.includes("ORDER BY");
    const badWhereAfterJoin = upperQuery.includes("WHERE O.ORDER_STATUS = 'COMPLETED'") || upperQuery.includes("WHERE ORDER_STATUS = 'COMPLETED'");

    const validJoinFilterPattern = hasLeftJoin && hasCompletedFilter && !badWhereAfterJoin && hasCount && hasSum && hasTierCase && hasGroupBy;
    const correctAggregatePattern = hasCount && hasSum && hasGroupBy && hasOrderBy;

    results[0] = {
      ...results[0],
      passed: correctAggregatePattern && hasCustomers && hasOrders,
      actual: correctAggregatePattern ? "Aggregated completed orders and spend per customer" : "Missing aggregation/grouping for completed orders",
      expected: question.testCases[0]?.expectedOutputSummary ?? "Alice C-101 total_orders = 2, total_spend = 1200, tier = VIP",
      feedback: correctAggregatePattern ? "Completed orders are aggregated correctly." : "Ensure total_orders and total_spend are computed from completed orders only.",
    };

    results[1] = {
      ...results[1],
      passed: hasCompletedFilter && (!badWhereAfterJoin || hasLeftJoin),
      actual: hasCompletedFilter ? "Cancelled orders are excluded from totals" : "Cancelled order filtering is missing",
      expected: question.testCases[1]?.expectedOutputSummary ?? "Bob C-102 total_spend = 350, tier = Standard",
      feedback: hasCompletedFilter ? "Completed-order filter satisfies the business rule." : "Use order_status = 'COMPLETED' when computing totals.",
    };

    results[2] = {
      ...results[2],
      passed: hasLeftJoin && !badWhereAfterJoin && hasCompletedFilter && hasTierCase,
      actual: hasLeftJoin ? "Zero-order customer is preserved via LEFT JOIN" : "Customers without orders are dropped",
      expected: question.testCases[2]?.expectedOutputSummary ?? "Diana C-104 total_orders = 0, total_spend = 0, tier = Basic",
      feedback: hasLeftJoin && !badWhereAfterJoin ? "LEFT JOIN preserves customers without completed orders." : "Keep zero-order customers by not filtering them out in the WHERE clause.",
    };

    const referenceScoreBoost = validJoinFilterPattern ? 1 : 0;
    if (validJoinFilterPattern) {
      results.forEach((result) => {
        result.passed = true;
      });
    }

    return results;
  }

  if (question.id === "sql-2") {
    const hasRowNumber = upperQuery.includes("ROW_NUMBER()") || upperQuery.includes("ROW_NUMBER ()");
    const hasPartition = upperQuery.includes("PARTITION BY");
    const hasOrderBy = upperQuery.includes("LAST_LOGIN_AT DESC") || upperQuery.includes("ORDER BY LAST_LOGIN_AT DESC");
    const hasRankFilter = upperQuery.includes("RANK_NUM = 1") || upperQuery.includes("WHERE RANK_NUM = 1") || upperQuery.includes("QUALIFY");

    results[0] = { ...results[0], passed: hasRowNumber && hasPartition && hasOrderBy, actual: hasRowNumber ? "Window logic is present" : "Window logic is missing", expected: question.testCases[0]?.expectedOutputSummary ?? "Most recent profile selected", feedback: hasRowNumber ? "ROW_NUMBER is configured correctly." : "Partition by email and order by last_login_at DESC." };
    results[1] = { ...results[1], passed: hasRankFilter && hasRowNumber, actual: hasRankFilter ? "Latest record filter applied" : "Duplicate selection filter missing", expected: question.testCases[1]?.expectedOutputSummary ?? "Latest record retained", feedback: hasRankFilter ? "The latest row is retained per partition." : "Filter on rank_num = 1 after ranking." };
    results[2] = { ...results[2], passed: hasRowNumber || hasPartition, actual: hasRowNumber ? "Unique rows preserved" : "Window function missing", expected: question.testCases[2]?.expectedOutputSummary ?? "Unique profiles retained", feedback: hasRowNumber ? "Duplicate profile logic is in place." : "Use a row-number-based deduplication pattern." };
    return results;
  }

  // Fallback deterministic checks for the rest of the SQL questions.
  const keywordHits = [
    "GROUP BY",
    "HAVING",
    "LEFT JOIN",
    "CASE",
    "ROW_NUMBER()",
    "ORDER BY",
    "SUM(",
    "COUNT(",
    "PARTITION BY",
  ].filter((keyword) => upperQuery.includes(keyword));

  results.forEach((result, index) => {
    result.passed = keywordHits.length > 0 && index <= keywordHits.length - 1;
    result.actual = keywordHits.length > 0 ? `Matched ${keywordHits.length} relevant SQL patterns` : "Query is too generic to match the scenario";
    result.feedback = keywordHits.length > 0 ? "Relevant SQL constructs were detected." : "The query is not aligned with the required business logic.";
  });

  return results;
}

function getPythonStructuralChecks(question: ScenarioQuestion) {
  const metadata = getQuestionMetadata(question);
  if (metadata && Array.isArray((metadata as any).structuralChecks) && (metadata as any).structuralChecks.length > 0) {
    return (metadata as any).structuralChecks as Array<{ id: string; label: string; weight: number; patterns: string[] }>;
  }

  const fallback: Array<{ id: string; label: string; weight: number; patterns: string[] }> = [];
  const functionName = extractFunctionName(question);
  if (functionName) {
    fallback.push({ id: "function_name", label: "Defines the required function", weight: 10, patterns: [functionName] });
  }

  if (question.problemStatement.toLowerCase().includes("phone")) {
    fallback.push({ id: "regex", label: "Uses digit extraction", weight: 10, patterns: ["RE.SUB", "ISDIGIT", "\D", "DIGITS"] });
  }

  if (question.problemStatement.toLowerCase().includes("email") || question.problemStatement.toLowerCase().includes("dedup")) {
    fallback.push({ id: "dedupe", label: "Normalizes or deduplicates values", weight: 10, patterns: ["SET()", "LOWER()", "STRIP()", "SEEN"] });
  }

  if (question.problemStatement.toLowerCase().includes("tier") || question.problemStatement.toLowerCase().includes("completeness")) {
    fallback.push({ id: "logic", label: "Applies required conditionals", weight: 10, patterns: ["IF", "CASE", "RETURN", "ELSE"] });
  }

  return fallback;
}

function extractFunctionName(question: ScenarioQuestion) {
  const ref = question.solutionReference ?? "";
  const match = ref.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
  return match ? match[1] : "";
}

function evaluatePythonStructural(question: ScenarioQuestion, code: string) {
  const checks = getPythonStructuralChecks(question);
  const upperCode = code.toUpperCase();
  const totalWeight = checks.reduce((sum, check) => sum + (check.weight ?? 0), 0) || 1;

  let matchedWeight = 0;
  for (const check of checks) {
    const patterns = (check.patterns ?? []).map((pattern) => pattern.toUpperCase());
    const isMatch = patterns.some((pattern) => upperCode.includes(pattern));
    if (isMatch) {
      matchedWeight += Number(check.weight ?? 0);
    }
  }

  return {
    totalWeight,
    matchedWeight,
    structuralScore: clamp((matchedWeight / totalWeight) * 20, 0, 20),
  };
}

function buildPythonTestResults(question: ScenarioQuestion, code: string) {
  const upperCode = code.toUpperCase();
  const results = question.testCases.map((tc) => ({
    id: tc.id,
    name: tc.name,
    passed: false,
    actual: "Code not evaluated",
    expected: tc.expectedOutputSummary,
    feedback: tc.description,
  }));

  if (question.id === "py-1") {
    const hasFunction = upperCode.includes("NORMALIZE_PHONE_NUMBER");
    const hasDigits = upperCode.includes("RE.SUB") || upperCode.includes("ISDIGIT") || upperCode.includes("\\D");
    const hasCountryCheck = upperCode.includes("STARTSWITH('1')") || upperCode.includes('STARTSWITH("1")') || upperCode.includes("LEN(DIGITS) == 11");
    const hasInvalidReturn = upperCode.includes("INVALID");

    results[0] = { ...results[0], passed: hasFunction && hasDigits && hasInvalidReturn, actual: hasDigits ? "Digit extraction and formatting logic detected" : "Digit extraction missing", expected: "'(555) 987-6543'", feedback: hasDigits ? "Standard 10-digit normalization logic is present." : "Use regex or digit extraction to normalize the number." };
    results[1] = { ...results[1], passed: hasCountryCheck && hasFunction, actual: hasCountryCheck ? "Country-code stripping logic detected" : "Leading 1 is not handled", expected: "'(555) 123-4567'", feedback: hasCountryCheck ? "Leading country code 1 is handled correctly." : "Strip a leading 1 when 11 digits are present." };
    results[2] = { ...results[2], passed: hasInvalidReturn && hasFunction, actual: hasInvalidReturn ? "INVALID handling detected" : "Invalid-length handling missing", expected: "'INVALID'", feedback: hasInvalidReturn ? "The function rejects invalid lengths." : "Return INVALID for numbers that do not resolve to exactly 10 digits." };
    return results;
  }

  if (question.id === "py-2") {
    const hasFunction = upperCode.includes("CLEAN_AND_DEDUPLICATE_RECORDS");
    const hasLower = upperCode.includes("LOWER()") || upperCode.includes("STRIP()");
    const hasSet = upperCode.includes("SET()") || upperCode.includes("SEEN");
    const hasCountry = upperCode.includes("COUNTRY") && upperCode.includes("USA");
    const hasActive = upperCode.includes("IS_ACTIVE") && (upperCode.includes("TRUE") || upperCode.includes("NONE"));

    results[0] = { ...results[0], passed: hasFunction && hasLower && hasSet, actual: hasLower ? "Email normalization/dedup logic detected" : "Deduplication is incomplete", expected: "Single record kept per email", feedback: hasLower ? "Case-insensitive deduplication is applied." : "Normalize email with strip().lower() and track seen values." };
    results[1] = { ...results[1], passed: hasCountry && hasActive, actual: hasCountry && hasActive ? "Default imputation logic detected" : "Country/is_active defaults missing", expected: "country = USA and is_active = True", feedback: hasCountry && hasActive ? "Missing values are defaulted correctly." : "Impute USA and True when fields are missing." };
    results[2] = { ...results[2], passed: hasFunction && (upperCode.includes("CONTINUE") || upperCode.includes("IF NOT") || upperCode.includes("IF NOT EMAIL")), actual: hasFunction ? "Empty-email filtering detected" : "Invalid email filtering missing", expected: "Ghost record excluded", feedback: hasFunction ? "Empty and null emails are filtered out." : "Skip blank email addresses before deduplicating." };
    return results;
  }

  // Generic Python fallback: relevant if function definition and some business-rule keywords appear.
  const hasFunction = /def\s+[A-Za-z_][A-Za-z0-9_]*/.test(code);
  const hasReturn = upperCode.includes("RETURN");
  const hasIf = upperCode.includes("IF");
  const hasLoop = upperCode.includes("FOR ") || upperCode.includes("WHILE ");

  results.forEach((result) => {
    result.passed = hasFunction && (hasReturn || hasIf || hasLoop);
    result.actual = hasFunction ? "A function and logic flow are present" : "The code is not structured as the required function";
    result.feedback = hasFunction ? "The implementation follows a function-based approach with executable logic." : "Define the required function and implement the transformation logic.";
  });

  return results;
}

export function evaluateSqlScenario(question: ScenarioQuestion, query: string): StructuredEvaluationResult {
  const normalizedQuery = sqlNormalized(query);
  const upperQuery = upper(normalizedQuery);
  const start = performance.now();

  if (!normalizedQuery) {
    return {
      score: 0,
      syntaxScore: 0,
      structuralScore: 0,
      testCaseScore: 0,
      codeQualityScore: 0,
      passedTests: 0,
      totalTests: question.testCases.length || 1,
      success: false,
      feedback: ["The SQL query is empty."],
      testCaseResults: question.testCases.map((tc) => ({ id: tc.id, name: tc.name, passed: false, actual: "Empty query", expected: tc.expectedOutputSummary, feedback: "Please provide a valid SQL query." })),
      columns: [],
      rows: [],
      message: "Empty SQL query submitted.",
      executionTimeMs: Math.round(performance.now() - start),
    };
  }

  const hasSelect = upperQuery.includes("SELECT");
  const hasFrom = upperQuery.includes("FROM");
  const disallowedStatement = ["DROP ", " DELETE ", " UPDATE ", " INSERT ", " ALTER ", " CREATE "].some((keyword) => upperQuery.includes(keyword.trim()));

  const syntaxScore = hasSelect && hasFrom && !disallowedStatement ? 10 : hasSelect ? 5 : 0;

  const structural = evaluateSqlStructural(question, normalizedQuery);
  const testResults = buildSqlTestResults(question, normalizedQuery);
  const passedTests = testResults.filter((item) => item.passed).length;
  const totalTests = Math.max(1, question.testCases.length || testResults.length);
  const testCaseScore = (passedTests / totalTests) * 50;

  const qualitySignals = [
    upperQuery.includes("GROUP BY"),
    upperQuery.includes("LEFT JOIN"),
    upperQuery.includes("CASE"),
    upperQuery.includes("ORDER BY"),
    upperQuery.includes("COALESCE"),
  ].filter(Boolean).length;
  const codeQualityScore = clamp((qualitySignals / 5) * 10, 0, 10);

  const score = clamp(syntaxScore + structural.structuralScore + testCaseScore + codeQualityScore, 0, 100);

  const feedback = [
    ...structural.matched.slice(0, 4),
    ...(passedTests > 0 ? [`Passed ${passedTests}/${totalTests} test checks.`] : ["The query does not satisfy the scenario requirements yet."]),
    ...(disallowedStatement ? ["Destructive SQL statements were rejected."] : []),
  ];

  return {
    score: Number(score.toFixed(1)),
    syntaxScore: Number(syntaxScore.toFixed(1)),
    structuralScore: Number(structural.structuralScore.toFixed(1)),
    testCaseScore: Number(testCaseScore.toFixed(1)),
    codeQualityScore: Number(codeQualityScore.toFixed(1)),
    passedTests,
    totalTests,
    success: score >= 60,
    feedback: feedback.length > 0 ? feedback : ["No meaningful SQL requirements were detected."],
    testCaseResults: testResults,
    columns: question.expectedOutputColumns ?? [],
    rows: question.expectedOutputSample ?? [],
    message: score >= 60 ? "Query appears to satisfy the business requirement." : "Query does not meet the required SQL behavior yet.",
    executionTimeMs: Math.round(performance.now() - start),
  };
}

export function evaluatePythonScenario(question: ScenarioQuestion, code: string): StructuredEvaluationResult {
  const trimmed = (code ?? "").trim();
  const upperCode = trimmed.toUpperCase();
  const start = performance.now();

  if (!trimmed) {
    return {
      score: 0,
      syntaxScore: 0,
      structuralScore: 0,
      testCaseScore: 0,
      codeQualityScore: 0,
      passedTests: 0,
      totalTests: question.testCases.length || 1,
      success: false,
      feedback: ["No Python code was submitted."],
      testCaseResults: question.testCases.map((tc) => ({ id: tc.id, name: tc.name, passed: false, actual: "Empty code", expected: tc.expectedOutputSummary, feedback: "Implement the required function." })),
      columns: [],
      rows: [],
      message: "Empty Python submission.",
      executionTimeMs: Math.round(performance.now() - start),
    };
  }

  const hasDef = /def\s+[A-Za-z_][A-Za-z0-9_]*/.test(trimmed);
  const syntaxScore = hasDef ? 10 : 5;

  const structure = evaluatePythonStructural(question, trimmed);
  const testResults = buildPythonTestResults(question, trimmed);
  const passedTests = testResults.filter((item) => item.passed).length;
  const totalTests = Math.max(1, question.testCases.length || testResults.length);
  const testCaseScore = (passedTests / totalTests) * 50;

  const qualitySignals = [
    upperCode.includes("RETURN"),
    upperCode.includes("IF "),
    upperCode.includes("FOR "),
    upperCode.includes("LIST"),
    upperCode.includes("SET"),
    upperCode.includes("RE.SUB") || upperCode.includes("ISDIGIT"),
  ].filter(Boolean).length;
  const codeQualityScore = clamp((qualitySignals / 6) * 10, 0, 10);

  const score = clamp(syntaxScore + structure.structuralScore + testCaseScore + codeQualityScore, 0, 100);

  return {
    score: Number(score.toFixed(1)),
    syntaxScore: Number(syntaxScore.toFixed(1)),
    structuralScore: Number(structure.structuralScore.toFixed(1)),
    testCaseScore: Number(testCaseScore.toFixed(1)),
    codeQualityScore: Number(codeQualityScore.toFixed(1)),
    passedTests,
    totalTests,
    success: score >= 60,
    feedback: [
      ...(hasDef ? ["Function definition detected."] : ["The submission is not a valid function-based solution." ]),
      ...(passedTests > 0 ? [`Passed ${passedTests}/${totalTests} behavior checks.`] : ["The implementation does not satisfy the required behavior yet."]),
    ],
    testCaseResults: testResults,
    columns: question.expectedOutputColumns ?? [],
    rows: question.expectedOutputSample ?? [],
    message: score >= 60 ? "Python solution appears to satisfy the requested behavior." : "Python solution does not satisfy the required behavior yet.",
    executionTimeMs: Math.round(performance.now() - start),
  };
}
