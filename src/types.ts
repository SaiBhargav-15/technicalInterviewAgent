export type MDMTopic = "Data Stewardship" | "Match & Merge" | "Survivorship";
export type QuestionDomain = "MDM Topic" | "SQL" | "Basic Python";
export type QuestionLevel = "Basic" | "Intermediate" | "Advanced";
export type AssessmentTrack = "data_stewardship" | "data_engineering";

export interface DifficultyScore {
  score: number | null;
  answered: number;
  total: number;
}

export type DifficultyScorecard = Record<QuestionLevel, DifficultyScore>;

export interface TestCase {
  id: string;
  name: string;
  description: string;
  inputDescription: string;
  expectedOutputSummary: string;
}

export interface SampleTable {
  tableName: string;
  description: string;
  columns: string[];
  rows: Record<string, any>[];
}

export interface MDMOption {
  id: string;
  label: string; // "A", "B", "C", "D"
  text: string;
  explanation?: string;
}

export interface MDMTopicQuestion {
  id: string;
  type: "mdm";
  title: string;
  topic: MDMTopic;
  difficulty: QuestionLevel;
  estimatedMinutes: number;
  scenarioContext: string;
  questionText: string;
  options: MDMOption[];
  correctOptionId: string;
  governanceGuideline: string;
  sampleTables?: SampleTable[];
}

export interface SQLMultipleChoiceQuestion {
  id: string;
  type: "sql-mcq";
  title: string;
  topic: "SQL";
  difficulty: QuestionLevel;
  estimatedMinutes: number;
  scenarioContext?: string;
  sampleTables?: SampleTable[];
  questionText: string;
  options: MDMOption[];
  correctOptionId: string;
  explanation: string;
  concept: string;
}

export interface DataEngineeringMultipleChoiceQuestion {
  id: string;
  type: "data-engineering-mcq";
  title: string;
  topic: "Data Engineering";
  difficulty: QuestionLevel;
  estimatedMinutes: number;
  questionText: string;
  options: MDMOption[];
  correctOptionId: string;
  explanation: string;
  concept: string;
}

export interface StructuralCheck {
  id: string;
  label: string;
  weight: number;
  patterns: string[];
}

export interface QuestionEvaluationMetadata {
  type: "sql" | "python";
  requiredTables?: string[];
  requiredOperations?: string[];
  requiredConditions?: string[];
  requiredOutputColumns?: string[];
  structuralChecks?: StructuralCheck[];
  requiredFunctionName?: string;
}

export interface ScenarioQuestion {
  id: string;
  type: "scenario";
  title: string;
  domain: "SQL" | "Basic Python";
  difficulty: QuestionLevel;
  estimatedMinutes: number;
  scenarioContext: string;
  problemStatement: string;
  businessRules: string[];
  sampleTables: SampleTable[];
  expectedOutputColumns?: string[];
  expectedOutputSample?: Record<string, any>[];
  language: "sql" | "python";
  starterCode: string;
  solutionReference: string;
  testCases: TestCase[];
  hints: string[];
  concept: string;
  evaluation?: QuestionEvaluationMetadata;
}

export type ExamQuestion =
  | MDMTopicQuestion
  | SQLMultipleChoiceQuestion
  | DataEngineeringMultipleChoiceQuestion
  | ScenarioQuestion;

export interface SubmissionResult {
  questionId: string;
  title: string;
  category: string;
  difficultyLevel?: QuestionLevel;
  answered?: boolean;
  score: number;
  status: "Passed" | "Partial" | "Failed";
  testCasesPassed?: string;
  timeSpentSeconds: number;
  code?: string;
  selectedOptionId?: string;
  candidateNotes?: string;
  evaluatorNotes?: string;
  outputLog?: string;
}

export interface ProctoringEvent {
  id: string;
  timestamp: string;
  type:
    | "INFO"
    | "WARNING"
    | "CRITICAL"
    | "TAB_SWITCH"
    | "PASTE_DETECTED"
    | "WINDOW_BLUR"
    | "FULLSCREEN_EXIT"
    | "WEBCAM_LOST"
    | "AUDIO_ANOMALY";
  category?: string;
  message: string;
  details?: string;
  severity?: "low" | "medium" | "high";
}

export interface ProctoringState {
  integrityScore: number;
  violationsCount: number;
  tabSwitchCount: number;
  pasteCount: number;
  faceLossCount: number;
  isWebcamActive: boolean;
  isFullscreen: boolean;
  events: ProctoringEvent[];
}

export interface VoiceIntroduction {
  transcript: string;
  durationSeconds: number;
  recordedAt: string;
  wordCount: number;
  audioRecorded?: boolean;
  audioDataUrl?: string;
  topicsCovered?: string[];
}

export interface AuthUser {
  email: string;
  name: string;
  role: "candidate" | "recruiter";
  loginAt: string;
  assessmentTrack?: AssessmentTrack;
  assessmentInviteId?: string;
  voiceIntroduction?: VoiceIntroduction;
}

export interface CandidateScores {
  mdm: number;
  sql: number;
  python: number;
  dataEngineering: number;
  edgeCases: number;
  codeQuality: number;
  integrity: number;
}

export interface CandidateAssessment {
  id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  assessmentTrack?: AssessmentTrack;
  submittedAt: string;
  overallScore: number;
  recommendation: "Strong Hire" | "Hire" | "Re-evaluate" | "No Hire";
  scores: CandidateScores;
  difficultyScores?: DifficultyScorecard;
  proctoring: {
    integrityScore: number;
    violationsCount: number;
    tabSwitchCount?: number;
    pasteCount?: number;
    faceLossCount?: number;
    events: ProctoringEvent[];
  };
  voiceIntroduction?: VoiceIntroduction;
  submissions: SubmissionResult[];
  aiSummary: string;
  strengths?: string[];
  improvementsToProbe?: string[];
  hrmsSyncStatus: "Synced" | "Pending" | "Failed";
  hrmsTarget: string;
}

