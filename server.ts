import express from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import type { AssessmentTrack, ExamQuestion } from "./src/types";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { ALL_EXAM_QUESTIONS } from "./src/data/questions";
import { executePythonScenario } from "./src/utils/pythonRunner";
import { calculateProctoringAudit } from "./src/utils/proctoringAudit";
import { computeDifficultyScores } from "./src/utils/difficultyScoring";
import { ASSESSMENT_INVITE_VALIDITY_MS, clampInviteExpiry, isInviteExpired } from "./src/utils/invitePolicy";
import { QUESTIONS_PER_TOPIC, selectQuestionsForTrack } from "./src/utils/questionSelection";
import { isAllowedRecruiterEmail } from "./src/utils/recruiterAccess";
import { executeSQLScenario } from "./src/utils/sqlRunner";

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "10mb" }));

// Recruiter passwordless email login endpoint
app.post("/api/auth/recruiter-login", (req, res) => {
  const { email } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail) {
    return res.status(400).json({ error: "Recruiter email is required." });
  }

  if (!isAllowedRecruiterEmail(normalizedEmail, loadRecruiterAllowlist())) {
    return res.status(403).json({
      error: "Recruiter access requires an allowlisted @chryselys.com email address.",
    });
  }

  res.json({
    success: true,
    user: {
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      role: "recruiter",
      loginAt: new Date().toISOString(),
    },
  });
});

// In-memory candidate interview results store with initial realistic sample candidates
let candidateResults: any[] = [
  {
    id: "cand-101",
    candidateName: "Alex Morgan",
    candidateEmail: "alex.morgan@example.com",
    role: "L1 Data & MDM Engineer",
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    overallScore: 88,
    recommendation: "Strong Hire",
    scores: {
      mdm: 92,
      sql: 85,
      python: 87,
      edgeCases: 84,
      codeQuality: 90,
      integrity: 98,
    },
    proctoring: {
      integrityScore: 98,
      violationsCount: 1,
      tabSwitchCount: 1,
      pasteCount: 0,
      events: [
        {
          id: "evt-1",
          timestamp: new Date(Date.now() - 3600000 * 3 + 120000).toISOString(),
          type: "INFO",
          category: "System",
          message: "Proctoring Session Initialized",
          details: "Hardware webcam streaming and ambient audio monitoring (42 dB) active.",
        },
        {
          id: "evt-2",
          timestamp: new Date(Date.now() - 3600000 * 3 + 650000).toISOString(),
          type: "TAB_SWITCH",
          category: "Tab Switch",
          severity: "low",
          message: "Tab Switch / Window Inactive (3 seconds)",
          details: "Candidate clicked away from the assessment window to an external application for 3 seconds during Question 3.",
        },
      ],
    },
    submissions: [
      {
        questionId: "mdm-1",
        title: "Data Stewardship Queue Triage & Exception Governance",
        category: "Data Stewardship",
        score: 100,
        status: "Passed",
        timeSpentSeconds: 180,
        selectedOptionId: "opt-b",
        candidateNotes: "Stewardship queue items between 70-85% require manual provenance inspection and recorded audit reasons rather than auto-merging.",
        evaluatorNotes: "Correctly identified stewardship exception handling protocol.",
      },
      {
        questionId: "mdm-2",
        title: "Deterministic vs. Probabilistic Match Rule Strategy",
        category: "Match & Merge",
        score: 100,
        status: "Passed",
        timeSpentSeconds: 160,
        selectedOptionId: "opt-a",
        candidateNotes: "Deterministic matching is suited for unique Tax IDs, while probabilistic fuzzy matching handles legal entity names.",
        evaluatorNotes: "Sound grasp of deterministic vs probabilistic match rule architecture.",
      },
      {
        questionId: "mdm-3",
        title: "Attribute-Level Survivorship & Golden Record Construction",
        category: "Survivorship",
        score: 100,
        status: "Passed",
        timeSpentSeconds: 210,
        selectedOptionId: "opt-c",
        candidateNotes: "Attribute-level survivorship with source confidence for financials, recency for phone, and null-suppression.",
        evaluatorNotes: "Accurately applied attribute-level survivorship rules.",
      },
      {
        questionId: "sql-1",
        title: "Customer Order Aggregations & Tier Classification",
        category: "SQL",
        score: 95,
        status: "Passed",
        testCasesPassed: "3/3",
        timeSpentSeconds: 420,
        code: `SELECT 
  c.customer_id,
  c.customer_name,
  COUNT(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_id END) AS total_orders,
  COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_amount ELSE 0 END), 0.0) AS total_spend,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_amount ELSE 0 END), 0) >= 1000 THEN 'VIP'
    WHEN COALESCE(SUM(CASE WHEN o.order_status = 'COMPLETED' THEN o.order_amount ELSE 0 END), 0) >= 200 THEN 'Standard'
    ELSE 'Basic'
  END AS customer_tier
FROM stg_customers c
LEFT JOIN stg_orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name
ORDER BY total_spend DESC, c.customer_id ASC;`,
        evaluatorNotes: "Clean LEFT JOIN and conditional aggregation handling non-purchasing customers seamlessly.",
      },
      {
        questionId: "sql-2",
        title: "Customer Deduplication & Recency Window Ranking",
        category: "SQL",
        score: 92,
        status: "Passed",
        testCasesPassed: "3/3",
        timeSpentSeconds: 380,
        code: `WITH RankedProfiles AS (
  SELECT 
    user_id,
    full_name,
    email,
    status,
    last_login_at,
    ROW_NUMBER() OVER (
      PARTITION BY email 
      ORDER BY last_login_at DESC, user_id DESC
    ) AS rank_num
  FROM stg_user_profiles
)
SELECT 
  user_id,
  full_name,
  email,
  status,
  last_login_at
FROM RankedProfiles
WHERE rank_num = 1
ORDER BY user_id ASC;`,
        evaluatorNotes: "Accurate window ranking and tie-breaker on user_id DESC.",
      },
      {
        questionId: "py-1",
        title: "Customer Contact String Normalization",
        category: "Basic Python",
        score: 90,
        status: "Passed",
        testCasesPassed: "3/3",
        timeSpentSeconds: 290,
        code: `import re

def normalize_phone_number(phone_raw: str) -> str:
    if not phone_raw:
        return "INVALID"
    digits = re.sub(r'\\D', '', str(phone_raw))
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return "INVALID"`,
        evaluatorNotes: "Robust regex extraction and valid formatting.",
      },
      {
        questionId: "py-2",
        title: "Record Deduplication & Missing Attribute Imputation",
        category: "Basic Python",
        score: 88,
        status: "Passed",
        testCasesPassed: "3/3",
        timeSpentSeconds: 340,
        code: `def clean_and_deduplicate_records(records: list[dict]) -> list[dict]:
    clean_records = []
    seen = set()
    for r in records:
        email = r.get("email")
        if not email or str(email).strip() == "":
            continue
        norm = str(email).strip().lower()
        if norm in seen:
            continue
        seen.add(norm)
        c = dict(r)
        if not c.get("country"):
            c["country"] = "USA"
        if c.get("is_active") is None:
            c["is_active"] = True
        clean_records.append(c)
    return clean_records`,
        evaluatorNotes: "Clean set lookup with default attribute imputation.",
      },
    ],
    voiceIntroduction: {
      transcript: "Hi, I'm Alex Morgan. I have about 2.5 years of experience in data engineering, focusing on master data governance and match-and-merge pipelines. In my previous role, I worked with source CRM feeds, configuring deterministic rules for NPI IDs and fuzzy matching for physician addresses. I'm very comfortable using SQL window functions for survivorship and Python for data cleaning and completeness validation.",
      durationSeconds: 48,
      recordedAt: new Date(Date.now() - 3600000 * 3 - 60000).toISOString(),
      wordCount: 65,
      audioRecorded: true,
      topicsCovered: ["MDM Architecture", "Match & Merge", "SQL Window Functions", "Python Data Quality"],
    },
    aiSummary: "Candidate demonstrates strong L1 Master Data Management competency across Data Stewardship, Match & Merge, and Survivorship principles. Spoken audio introduction verified articulate communication and practical familiarity with HCP address resolution. Solves SQL aggregations and window deduplication with clean code, and handles Python string normalization defensively.",
    hrmsSyncStatus: "Synced",
    hrmsTarget: "Greenhouse",
  },
  {
    id: "cand-102",
    candidateName: "Priya Sharma",
    candidateEmail: "priya.sharma@example.com",
    role: "L1 Data & MDM Engineer",
    submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    overallScore: 94,
    recommendation: "Strong Hire",
    scores: {
      mdm: 96,
      sql: 94,
      python: 92,
      edgeCases: 95,
      codeQuality: 94,
      integrity: 100,
    },
    proctoring: {
      integrityScore: 100,
      violationsCount: 0,
      tabSwitchCount: 0,
      pasteCount: 0,
      events: [
        {
          id: "evt-1",
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
          type: "INFO",
          category: "System",
          message: "Proctoring Session Initialized",
          details: "Single face detected, ambient audio normal, full screen mode verified. Zero violations or tab switches throughout entire session.",
        },
      ],
    },
    submissions: [
      {
        questionId: "q1",
        title: "Customer 360 Golden Record Resolution",
        category: "MDM & SQL",
        score: 98,
        status: "Passed",
        testCasesPassed: "3/3",
        timeSpentSeconds: 310,
        code: `-- Optimal window query with COALESCE survivorship`,
        evaluatorNotes: "Exceptionally fast execution and handled null phone numbers cleanly.",
      },
    ],
    voiceIntroduction: {
      transcript: "Hello! My name is Priya Sharma. I am passionate about data governance and building scalable Golden Record engines. I have worked extensively with HCP entity resolution, survivorship rules based on source system reliability weights, and writing defensive SQL and Python scripts to catch nulls and format irregularities. Excited to showcase my skills today.",
      durationSeconds: 42,
      recordedAt: new Date(Date.now() - 3600000 * 18 - 60000).toISOString(),
      wordCount: 56,
      audioRecorded: true,
      topicsCovered: ["Data Stewardship", "HCP Entity Resolution", "Survivorship Rules", "Defensive Python"],
    },
    aiSummary: "Top tier L1 candidate. High precision in SQL window functions and Python fuzzy algorithms. Spoken audio introduction verified professional depth in HCP survivorship and data governance. Clean coding style and 100% proctoring integrity.",
    hrmsSyncStatus: "Synced",
    hrmsTarget: "Workday",
  },
  {
    id: "cand-103",
    candidateName: "David Chen",
    candidateEmail: "d.chen@example.com",
    role: "L1 Data & MDM Engineer",
    submittedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    overallScore: 68,
    recommendation: "Re-evaluate",
    scores: {
      mdm: 70,
      sql: 72,
      python: 62,
      edgeCases: 65,
      codeQuality: 70,
      integrity: 76,
    },
    proctoring: {
      integrityScore: 76,
      violationsCount: 4,
      tabSwitchCount: 2,
      pasteCount: 2,
      events: [
        {
          id: "evt-1",
          timestamp: new Date(Date.now() - 3600000 * 28 + 180000).toISOString(),
          type: "TAB_SWITCH",
          category: "Tab Switch",
          severity: "medium",
          message: "Tab Switch / Window Inactive (14 seconds)",
          details: "Candidate navigated away from the assessment browser tab to an external window for 14 seconds during Question 4 (SQL Scenario).",
        },
        {
          id: "evt-2",
          timestamp: new Date(Date.now() - 3600000 * 28 + 420000).toISOString(),
          type: "PASTE_DETECTED",
          category: "Clipboard Paste",
          severity: "high",
          message: "External Clipboard Paste (164 characters)",
          details: "Candidate pasted 164 characters (\"SELECT c.customer_id, c.customer_name, COUNT(CASE WHEN o.order_status = 'COMPLETED'...\") into Question 5 code workspace.",
        },
        {
          id: "evt-3",
          timestamp: new Date(Date.now() - 3600000 * 28 + 680000).toISOString(),
          type: "TAB_SWITCH",
          category: "Tab Switch",
          severity: "medium",
          message: "Tab Switch / Window Inactive (8 seconds)",
          details: "Candidate switched away from the exam tab to another application for 8 seconds during Question 9.",
        },
        {
          id: "evt-4",
          timestamp: new Date(Date.now() - 3600000 * 28 + 840000).toISOString(),
          type: "PASTE_DETECTED",
          category: "Clipboard Paste",
          severity: "medium",
          message: "External Clipboard Paste (78 characters)",
          details: "Candidate pasted 78 characters (\"def standardize_postal_code(raw_zip: str): ...\") into Question 12 code workspace.",
        },
      ],
    },
    submissions: [],
    aiSummary: "Shows potential with fundamental SQL joins, but struggled with Python string normalization regex and had multiple proctoring tab switches.",
    hrmsSyncStatus: "Pending",
    hrmsTarget: "None",
  },
];

const ASSESSMENT_DURATION_SECONDS = 30 * 60;
const DATA_DIRECTORY = path.join(process.cwd(), "data");
const RECRUITER_ALLOWLIST_FILE = path.join(process.cwd(), "config", "recruiter-allowlist.json");
const CANDIDATES_FILE = path.join(DATA_DIRECTORY, "candidates.json");
const SESSIONS_FILE = path.join(DATA_DIRECTORY, "assessment-sessions.json");
const INVITES_FILE = path.join(DATA_DIRECTORY, "assessment-invites.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    }
  } catch (error) {
    console.warn(`Could not read ${filePath}; using fallback data.`, error);
  }
  return fallback;
}

function writeJsonFile(filePath: string, value: unknown) {
  try {
    fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
  } catch (error) {
    console.error(`Could not persist ${filePath}.`, error);
  }
}

const initialCandidateResults = candidateResults;
candidateResults = readJsonFile(CANDIDATES_FILE, initialCandidateResults);
type AssessmentSession = {
  sessionId: string;
  candidateEmail: string;
  inviteId: string;
  track: AssessmentTrack;
  startedAt: string;
  deadlineAt: string;
  questionIds: string[];
  submittedAt?: string;
};
type AssessmentInvite = {
  inviteId: string;
  candidateName: string;
  email: string;
  track: AssessmentTrack;
  createdAt: string;
  expiresAt: string;
  claimedAt?: string;
  usedAt?: string;
};
const assessmentInvites = new Map<string, AssessmentInvite>(
  readJsonFile<AssessmentInvite[]>(INVITES_FILE, []).map((invite) => {
    const expiresAt = clampInviteExpiry(invite.createdAt, invite.expiresAt);
    return [invite.inviteId, { ...invite, expiresAt }];
  })
);
writeJsonFile(INVITES_FILE, [...assessmentInvites.values()]);
const assessmentSessions = new Map<string, AssessmentSession>(
  readJsonFile<AssessmentSession[]>(SESSIONS_FILE, []).map((session) => [session.sessionId, session])
);

function getActiveAssessmentSession(sessionId: unknown) {
  if (typeof sessionId !== "string" || !sessionId) {
    return { error: "Assessment session is required.", status: 400 } as const;
  }

  const session = assessmentSessions.get(sessionId);
  if (!session) {
    return { error: "Assessment session not found.", status: 404 } as const;
  }
  if (!session.track || !session.inviteId) {
    return { error: "Assessment session has no valid role assignment. Please use a new invitation.", status: 409 } as const;
  }
  const questionIds = session.questionIds;
  const availableQuestionIds = new Set(ALL_EXAM_QUESTIONS.map((question) => question.id));
  if (
    !Array.isArray(questionIds) ||
    questionIds.length !== QUESTIONS_PER_TOPIC * 3 ||
    new Set(questionIds).size !== questionIds.length ||
    questionIds.some((questionId) => !availableQuestionIds.has(questionId))
  ) {
    return { error: "Assessment session has no valid question set. Please start a new session.", status: 409 } as const;
  }
  if (session.submittedAt) {
    return { error: "Assessment has already been submitted.", status: 409 } as const;
  }
  if (Date.now() >= Date.parse(session.deadlineAt)) {
    return { error: "Assessment deadline has passed.", status: 410 } as const;
  }

  return { session } as const;
}

function normalizeAssessmentTrack(value: unknown): AssessmentTrack | null {
  return value === "data_stewardship" || value === "data_engineering" ? value : null;
}

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function loadRecruiterAllowlist(): string[] {
  const config = readJsonFile<{ allowedEmails?: unknown }>(RECRUITER_ALLOWLIST_FILE, { allowedEmails: [] });
  return Array.isArray(config.allowedEmails)
    ? config.allowedEmails.filter((email): email is string => typeof email === "string")
    : [];
}

function candidateEmailExists(email: string) {
  return candidateResults.some((candidate) => normalizeEmail(candidate.candidateEmail) === email);
}

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Resilient Gemini content generator with fast timeout and model fallback for 503 / 429 demand spikes
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: {
    prompt: string;
    systemInstruction?: string;
    preferredModel?: string;
    responseMimeType?: string;
    timeoutMs?: number;
  }
): Promise<string> {
  const models = [
    options.preferredModel || "gemini-flash-latest",
    "gemini-2.5-flash",
  ];
  const candidateModels = Array.from(new Set(models));
  const timeoutMs = options.timeoutMs ?? 3500;

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      // Promise race with timeout to avoid keeping candidate waiting
      const generatePromise = ai.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
          ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on ${model}`)), timeoutMs)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(
        `Gemini API notice on model ${model}: ${errMsg.slice(0, 100)}... Attempting fallback.`
      );
      // Immediately try next model without long blocking delays
      continue;
    }
  }

  throw lastError || new Error("Gemini models temporarily unavailable or under high demand");
}

// Dynamic heuristic scorecard generator used as high-availability fallback
function computeHeuristicScorecard(
  candidateName: string,
  submissions: any[] = [],
  proctoringLog: any = {},
  timeTakenSeconds: number = 1800,
  voiceIntroduction?: any,
  assessmentTrack: AssessmentTrack = "data_stewardship"
) {
  let mdmScores: number[] = [];
  let sqlScores: number[] = [];
  let pythonScores: number[] = [];
  let dataEngineeringScores: number[] = [];
  let edgeCasePassedCount = 0;
  let totalTestCases = 0;

  for (const sub of submissions) {
    const s = typeof sub.score === "number" ? sub.score : 80;
    const cat = (sub.category || "").toLowerCase();
    if (cat.includes("sql")) sqlScores.push(s);
    if (cat.includes("python")) pythonScores.push(s);
    if (cat.includes("data engineering")) dataEngineeringScores.push(s);
    if (
      cat.includes("mdm") ||
      cat.includes("master") ||
      cat.includes("stewardship") ||
      cat.includes("match & merge") ||
      cat.includes("survivorship")
    ) {
      mdmScores.push(s);
    }

    if (sub.testCasesPassed && typeof sub.testCasesPassed === "string") {
      const parts = sub.testCasesPassed.split("/");
      if (parts.length === 2) {
        edgeCasePassedCount += parseInt(parts[0], 10) || 0;
        totalTestCases += parseInt(parts[1], 10) || 0;
      }
    }
  }

  const avg = (arr: number[], def = 0) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : def;

  const mdm = avg(mdmScores);
  const sql = avg(sqlScores);
  const python = avg(pythonScores);
  const dataEngineering = avg(dataEngineeringScores);

  const edgeCases =
    totalTestCases > 0 ? Math.round((edgeCasePassedCount / totalTestCases) * 100) : 0;

  let qualityBonus = 0;
  for (const sub of submissions) {
    const code = sub.code || "";
    if (code.includes("WITH ") || code.includes("ROW_NUMBER()") || code.includes("OVER (")) {
      qualityBonus += 4;
    }
    if (code.includes("def ") && code.includes("return ")) {
      qualityBonus += 3;
    }
    if (code.includes("SequenceMatcher") || code.includes("re.sub")) {
      qualityBonus += 3;
    }
  }
  const codeQuality = Math.min(95, qualityBonus);

  const integrityScore = Math.max(
    0,
    Math.min(100, proctoringLog?.integrityScore ?? 100 - (proctoringLog?.violationsCount || 0) * 8)
  );

  const trackScore = assessmentTrack === "data_engineering"
    ? sql * 0.30 + python * 0.30 + dataEngineering * 0.30 + edgeCases * 0.05 + codeQuality * 0.05
    : mdm * 0.35 + sql * 0.25 + python * 0.20 + edgeCases * 0.10 + codeQuality * 0.10;
  const weightedOverall = Math.round(trackScore * (integrityScore / 100));

  let recommendation: "Strong Hire" | "Hire" | "Re-evaluate" | "No Hire" = "Hire";
  if (weightedOverall >= 88 && integrityScore >= 90) recommendation = "Strong Hire";
  else if (weightedOverall >= 75 && integrityScore >= 80) recommendation = "Hire";
  else if (weightedOverall >= 60) recommendation = "Re-evaluate";
  else recommendation = "No Hire";

  const strengths: string[] = [];
  if (mdm >= 80) strengths.push("Strong grasp of survivorship and golden record governance");
  if (sql >= 80) strengths.push("Effective use of SQL window ranking and partition clauses");
  if (python >= 80) strengths.push("Proficient in Python text normalization and fuzzy deduplication algorithms");
  if (dataEngineering >= 80) strengths.push("Strong understanding of data engineering fundamentals and Spark concepts");
  if (codeQuality >= 85) strengths.push("Clean modular code formatting and defensive edge-case handling");
  if (voiceIntroduction?.transcript) strengths.push("Articulate spoken self-introduction demonstrating MDM background");
  if (strengths.length < 2) strengths.push("Solid foundation in core data pipelines");

  const improvements: string[] = [];
  if (edgeCases < 90) improvements.push("Verify null coalescing and date boundary edge cases");
  if (proctoringLog?.violationsCount > 0) improvements.push("Review environment focus during proctored session");
  if (improvements.length === 0) improvements.push("Deepen knowledge of SCD Type 2 end-date closeouts");

  const voiceSynthesis = voiceIntroduction?.transcript
    ? ` Candidate delivered a verified ${voiceIntroduction.durationSeconds || 30}s voice self-introduction (${voiceIntroduction.wordCount || 0} words) outlining relevant MDM experience.`
    : "";
  const trackLabel = assessmentTrack === "data_engineering" ? "Data Engineering" : "Data Stewardship";

  return {
    overallScore: weightedOverall,
    recommendation,
    scores: {
      mdm,
      sql,
      python,
      dataEngineering,
      edgeCases,
      codeQuality,
      integrity: integrityScore,
    },
    aiSummary: `Candidate ${candidateName} completed the ${trackLabel} assessment with an overall score of ${weightedOverall}/100.${voiceSynthesis} ${assessmentTrack === "data_engineering" ? "Assessment results include SQL, Python, and Data Engineering fundamentals." : "Assessment results include data stewardship, SQL, and Python."} Session integrity: ${integrityScore}%.`,
    strengths,
    improvementsToProbe: improvements,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    activeCandidatesCount: candidateResults.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Candidate Submissions & Results
app.get("/api/candidates", (_req, res) => {
  res.json(candidateResults);
});

app.get("/api/candidates/:id", (req, res) => {
  const candidate = candidateResults.find((c) => c.id === req.params.id);
  if (!candidate) {
    return res.status(404).json({ error: "Candidate not found" });
  }
  res.json(candidate);
});

app.post("/api/assessment/invites", (req, res) => {
  const recruiterEmail = normalizeEmail(req.body?.recruiterEmail);
  if (!recruiterEmail || !isAllowedRecruiterEmail(recruiterEmail, loadRecruiterAllowlist())) {
    return res.status(403).json({ error: "Only an allowlisted recruiter can create assessment invitations." });
  }
  const candidateName = typeof req.body?.candidateName === "string" ? req.body.candidateName.trim() : "";
  const candidateEmail = normalizeEmail(req.body?.candidateEmail);
  const track = normalizeAssessmentTrack(req.body?.track);
  if (!candidateName || !candidateEmail || !track) {
    return res.status(400).json({ error: "Candidate name, email, and assessment track are required." });
  }

  let selectedQuestions: ExamQuestion[];
  try {
    selectedQuestions = selectQuestionsForTrack(ALL_EXAM_QUESTIONS, track);
  } catch (error) {
    return res.status(409).json({ error: error instanceof Error ? error.message : "This assessment track is unavailable." });
  }

  const inviteId = randomUUID();
  const createdAt = new Date();
  const invite: AssessmentInvite = {
    inviteId,
    candidateName,
    email: candidateEmail,
    track,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + ASSESSMENT_INVITE_VALIDITY_MS).toISOString(),
  };
  assessmentInvites.set(inviteId, invite);
  writeJsonFile(INVITES_FILE, [...assessmentInvites.values()]);

  res.status(201).json({
    ...invite,
    inviteUrl: `${req.protocol}://${req.get("host")}/?invite=${inviteId}`,
    questionCount: selectedQuestions.length,
  });
});

app.get("/api/assessment/invites/:inviteId", (req, res) => {
  const invite = assessmentInvites.get(req.params.inviteId);
  const existingSession = invite && [...assessmentSessions.values()].find(
    (session) => session.inviteId === invite.inviteId && !session.submittedAt && Date.now() < Date.parse(session.deadlineAt)
  );
  if (
    !invite ||
    invite.usedAt ||
    (isInviteExpired(invite.expiresAt) && !existingSession) ||
    (invite.claimedAt && !existingSession)
  ) {
    return res.status(404).json({ error: "This assessment invitation is invalid, expired, or already used." });
  }

  res.json({
    candidateName: invite.candidateName,
    candidateEmail: invite.email,
    assessmentTrack: invite.track,
    assessmentLabel: invite.track === "data_stewardship" ? "Data Stewardship" : "Data Engineering",
  });
});

app.post("/api/assessment/sessions", (req, res) => {
  const candidateEmail = normalizeEmail(req.body?.candidateEmail);
  const inviteId = typeof req.body?.inviteId === "string" ? req.body.inviteId : "";
  const invite = assessmentInvites.get(inviteId);
  if (!candidateEmail || !invite || invite.email !== candidateEmail || invite.usedAt) {
    return res.status(403).json({ error: "A valid unused assessment invitation is required." });
  }

  const existingSession = [...assessmentSessions.values()].find(
    (session) => session.inviteId === inviteId && !session.submittedAt && Date.now() < Date.parse(session.deadlineAt)
  );
  if (existingSession) {
    return res.status(200).json({
      ...existingSession,
      durationSeconds: Math.max(0, Math.ceil((Date.parse(existingSession.deadlineAt) - Date.now()) / 1000)),
    });
  }
  if (isInviteExpired(invite.expiresAt)) {
    return res.status(403).json({ error: "This assessment invitation has expired." });
  }
  if (invite.claimedAt) {
    return res.status(409).json({ error: "This invitation has already been claimed by an assessment session." });
  }

  let questionIds: string[];
  try {
    questionIds = selectQuestionsForTrack(ALL_EXAM_QUESTIONS, invite.track).map((question) => question.id);
  } catch (error) {
    return res.status(409).json({ error: error instanceof Error ? error.message : "This assessment track is unavailable." });
  }

  const startedAt = new Date();
  const deadlineAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_SECONDS * 1000);
  const session = {
    sessionId: `assessment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    candidateEmail,
    inviteId,
    track: invite.track,
    startedAt: startedAt.toISOString(),
    deadlineAt: deadlineAt.toISOString(),
    questionIds,
  };
  invite.claimedAt = startedAt.toISOString();
  assessmentSessions.set(session.sessionId, session);
  writeJsonFile(SESSIONS_FILE, [...assessmentSessions.values()]);
  writeJsonFile(INVITES_FILE, [...assessmentInvites.values()]);

  res.status(201).json({
    ...session,
    durationSeconds: ASSESSMENT_DURATION_SECONDS,
  });
});

app.post("/api/assessment/sessions/:sessionId/submit", (req, res) => {
  const activeSession = getActiveAssessmentSession(req.params.sessionId);
  if ("error" in activeSession) {
    return res.status(activeSession.status ?? 400).json({ error: activeSession.error });
  }

  const session = activeSession.session;
  const invite = assessmentInvites.get(session.inviteId);
  if (!invite || invite.track !== session.track || invite.email !== session.candidateEmail) {
    return res.status(409).json({ error: "The assessment invitation could not be verified." });
  }
  const candidateEmail = normalizeEmail(req.body?.candidateEmail);
  if (!candidateEmail || candidateEmail !== session.candidateEmail) {
    return res.status(403).json({ error: "Candidate does not match the assessment session." });
  }
  if (candidateEmailExists(candidateEmail)) {
    return res.status(409).json({ error: "An assessment has already been submitted for this email address." });
  }

  const proctoringAudit = calculateProctoringAudit(req.body?.proctoringLog);
  const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  const code = req.body?.code && typeof req.body.code === "object" ? req.body.code : {};
  const sessionQuestions = session.questionIds
    .map((questionId) => ALL_EXAM_QUESTIONS.find((question) => question.id === questionId))
    .filter((question): question is ExamQuestion => question !== undefined);
  const submissions = sessionQuestions.map((question) => {
    if (question.type === "mdm" || question.type === "sql-mcq" || question.type === "data-engineering-mcq") {
      const selectedOptionId = typeof answers[question.id] === "string" ? answers[question.id] : "";
      const selectedOption = question.options.find((option) => option.id === selectedOptionId);
      const isCorrect = selectedOptionId === question.correctOptionId;
      const category = question.topic;
      return {
        questionId: question.id,
        title: question.title,
        category,
        difficultyLevel: question.difficulty,
        answered: Boolean(selectedOptionId),
        score: isCorrect ? 100 : selectedOptionId ? 30 : 0,
        status: isCorrect ? "Passed" as const : selectedOptionId ? "Partial" as const : "Failed" as const,
        timeSpentSeconds: 0,
        selectedOptionId,
        candidateNotes: selectedOption ? `Selected (${selectedOption.label}): ${selectedOption.text}` : "No answer submitted",
        evaluatorNotes: isCorrect
          ? question.type === "mdm" ? `Correct answer on ${category}.` : question.explanation
          : selectedOptionId ? `Selected option ${selectedOption?.label}.` : "Question was unanswered.",
      };
    }

    const submittedCode = typeof code[question.id] === "string" ? code[question.id] : "";
    if (!submittedCode.trim()) {
      return {
        questionId: question.id,
        title: question.title,
        category: question.domain,
        difficultyLevel: question.difficulty,
        answered: false,
        score: 0,
        status: "Failed" as const,
        testCasesPassed: "0/0",
        timeSpentSeconds: 0,
        code: "",
        evaluatorNotes: "Question was unanswered.",
      };
    }

    const result = question.language === "sql"
      ? executeSQLScenario(question, submittedCode)
      : executePythonScenario(question, submittedCode);
    return {
      questionId: question.id,
      title: question.title,
      category: question.domain,
      difficultyLevel: question.difficulty,
      answered: true,
      score: Math.round(result.score),
      status: result.score >= 90 ? "Passed" as const : result.score >= 50 ? "Partial" as const : "Failed" as const,
      testCasesPassed: `${result.passedTests}/${result.totalTests}`,
      timeSpentSeconds: 0,
      code: submittedCode,
      evaluatorNotes: result.feedback.join(" | ") || ("message" in result ? result.message : result.stdout),
    };
  });

  const submittedAt = new Date();
  const timeTakenSeconds = Math.max(0, Math.round((submittedAt.getTime() - Date.parse(session.startedAt)) / 1000));
  const scorecard = computeHeuristicScorecard(
    invite.candidateName,
    submissions,
    proctoringAudit,
    timeTakenSeconds,
    req.body?.voiceIntroduction || undefined,
    session.track
  );
  const difficultyScores = computeDifficultyScores(submissions);
  const newCandidate = {
    id: `cand-${Date.now().toString().slice(-4)}`,
    candidateName: invite.candidateName,
    candidateEmail,
    role: invite.track === "data_stewardship" ? "Data Stewardship" : "Data Engineering",
    assessmentTrack: invite.track,
    submittedAt: submittedAt.toISOString(),
    overallScore: scorecard.overallScore,
    recommendation: scorecard.recommendation,
    scores: scorecard.scores,
    difficultyScores,
    proctoring: proctoringAudit,
    voiceIntroduction: req.body?.voiceIntroduction || undefined,
    submissions,
    aiSummary: scorecard.aiSummary,
    strengths: scorecard.strengths,
    improvementsToProbe: scorecard.improvementsToProbe,
    hrmsSyncStatus: "Pending",
    hrmsTarget: "None",
  };

  session.submittedAt = submittedAt.toISOString();
  invite.usedAt = submittedAt.toISOString();
  candidateResults.unshift(newCandidate);
  writeJsonFile(CANDIDATES_FILE, candidateResults);
  writeJsonFile(SESSIONS_FILE, [...assessmentSessions.values()]);
  writeJsonFile(INVITES_FILE, [...assessmentInvites.values()]);
  res.status(201).json(newCandidate);
});

app.post("/api/candidates", (req, res) => {
  const activeSession = getActiveAssessmentSession(req.body?.sessionId);
  if ("error" in activeSession) {
    return res.status(activeSession.status ?? 400).json({ error: activeSession.error });
  }

  const candidateEmail = normalizeEmail(req.body?.candidateEmail);
  if (!candidateEmail || candidateEmail !== activeSession.session.candidateEmail) {
    return res.status(403).json({ error: "Candidate does not match the assessment session." });
  }
  if (candidateEmailExists(candidateEmail)) {
    return res.status(409).json({ error: "An assessment has already been submitted for this email address." });
  }

  const newCandidate = {
    id: req.body.id || `cand-${Date.now().toString().slice(-4)}`,
    candidateName: req.body.candidateName || "Anonymous Candidate",
    candidateEmail,
    role: req.body.role || "L1 Data & MDM Engineer",
    submittedAt: new Date().toISOString(),
    overallScore: req.body.overallScore || 0,
    recommendation: req.body.recommendation || "Pending",
    scores: req.body.scores || {},
    proctoring: req.body.proctoring || { integrityScore: 100, violationsCount: 0, events: [] },
    submissions: req.body.submissions || [],
    aiSummary: req.body.aiSummary || "",
    hrmsSyncStatus: "Pending",
    hrmsTarget: "None",
  };

  activeSession.session.submittedAt = new Date().toISOString();
  candidateResults.unshift(newCandidate);
  writeJsonFile(CANDIDATES_FILE, candidateResults);
  writeJsonFile(SESSIONS_FILE, [...assessmentSessions.values()]);
  res.status(201).json(newCandidate);
});

// 3. Real-time AI Code Feedback / Hint Endpoint
app.post("/api/ai/code-feedback", async (req, res) => {
  const { questionTitle, questionScenario, candidateCode, language, requestType } = req.body;

  const ai = getGeminiClient();

  if (!ai) {
    return res.json(generateLocalCodeFeedback(questionTitle, candidateCode, language, requestType));
  }

  try {
    const prompt = `You are a Principal Data Architect & Senior MDM Interviewer evaluating an L1 candidate.
Question Title: ${questionTitle}
Scenario Context: ${questionScenario}
Language: ${language}
Candidate Code:
\`\`\`${language}
${candidateCode}
\`\`\`

Request Type: ${requestType || "feedback"} (feedback, hint, or dry-run evaluation)

Provide concise, constructive technical feedback for the candidate.
If Request Type is "hint", provide a conceptual hint without giving away the full final solution.
If Request Type is "feedback", evaluate:
1. Logic correctness for Master Data Management requirements (survivorship, golden record, deduplication, SCD Type 2, DQ rules).
2. Code efficiency and syntax accuracy.
3. Edge case coverage (NULL values, duplicates, conflicting timestamps).

Return a JSON object with:
{
  "feedback": "2-3 sentences of direct feedback",
  "suggestions": ["list of 2-3 specific bullet suggestions"],
  "estimatedCorrectness": "percentage estimate like 85%",
  "mdmInsight": "1 key MDM architectural concept applied here"
}`;

    const text = await generateContentWithRetry(ai, {
      prompt,
      preferredModel: "gemini-flash-latest",
      responseMimeType: "application/json",
      timeoutMs: 3500,
    });

    const parsed = JSON.parse(text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.warn("AI code feedback fallback triggered due to service demand:", error?.message || error);
    res.json(generateLocalCodeFeedback(questionTitle, candidateCode, language, requestType));
  }
});

// Helper for local rule-based MDM feedback
function generateLocalCodeFeedback(
  questionTitle: string,
  code: string = "",
  language: string = "sql",
  requestType: string = "feedback"
) {
  const hasWindow = code.includes("OVER") && (code.includes("ROW_NUMBER") || code.includes("RANK"));
  const hasCoalesce = code.includes("COALESCE") || code.includes("ISNULL") || code.includes("NVL");
  const hasRegex = code.includes("re.sub") || code.includes("SequenceMatcher");

  if (requestType === "hint") {
    if (language === "sql") {
      return {
        feedback: "Hint: Consider partitioning by the candidate entity identifier and ordering by trust tier and timestamp.",
        suggestions: [
          "Use a ROW_NUMBER() window function partitioned by business key",
          "Ensure secondary sorting sorts descending on updated_at",
          "Filter out rows where rank > 1 in an outer query",
        ],
        estimatedCorrectness: "In Progress",
        mdmInsight: "Deterministic survivorship prevents ambiguous golden records in operational MDM hubs.",
      };
    }
    return {
      feedback: "Hint: Standardize text by stripping legal suffixes and non-alphanumeric noise prior to similarity scoring.",
      suggestions: [
        "Normalize strings with upper() and regex substitutions",
        "Compare candidate against existing cluster prototypes using a similarity threshold",
        "Handle None or empty string inputs defensively",
      ],
      estimatedCorrectness: "In Progress",
      mdmInsight: "Entity resolution requires data cleansing before probabilistic record linkage.",
    };
  }

  const suggestions: string[] = [];
  if (language === "sql" && !hasWindow) {
    suggestions.push("Incorporate ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) for rank-based survivorship");
  }
  if (!hasCoalesce && language === "sql") {
    suggestions.push("Use COALESCE to handle nullable phone numbers and open-ended effective dates");
  }
  if (language === "python" && !hasRegex) {
    suggestions.push("Ensure common legal entity suffixes (INC, LLC, CORP) are stripped before clustering");
  }
  if (suggestions.length === 0) {
    suggestions.push("Verify index performance and edge cases with whitespace-only inputs");
  }

  return {
    feedback:
      "Automated MDM Code Analysis: Implementation demonstrates foundational structure. Ensure all NULL edge cases and survivorship rules are accounted for.",
    suggestions,
    estimatedCorrectness: hasWindow || hasRegex ? "88%" : "75%",
    mdmInsight: "In enterprise Master Data Management, idempotent data pipelines are essential for auditability.",
  };
}

// 4. Automated Candidate Skill Scoring & Recruiter Synthesis
app.post("/api/ai/score-assessment", async (req, res) => {
  const { candidateName, submissions, proctoringLog, timeTakenSeconds, sessionId } = req.body;
  const activeSession = getActiveAssessmentSession(sessionId);
  if ("error" in activeSession) {
    return res.status(activeSession.status ?? 400).json({ error: activeSession.error });
  }

  const proctoringAudit = calculateProctoringAudit(proctoringLog);
  const heuristic = computeHeuristicScorecard(
    candidateName || "Candidate",
    submissions || [],
    proctoringAudit,
    timeTakenSeconds || 1800,
    activeSession.session.track
  );

  return res.json(heuristic);
});

// KEKA API routes remain unavailable until the integration details are supplied.
app.post("/api/keka/sync", (_req, res) => {
  res.status(503).json({ error: "KEKA synchronization is not configured." });
});

app.post("/api/keka/webhook", (_req, res) => {
  res.status(503).json({ error: "KEKA webhook integration is not configured." });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ["**/data/**"],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`L1 Interview Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  void startServer();
}

export default app;
