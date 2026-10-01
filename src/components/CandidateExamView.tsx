import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  CheckCircle2,
  Table as TableIcon,
  Code,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  BookOpen,
  Layers,
  FileCheck2,
  HelpCircle,
  Sparkles,
  Mic,
  Maximize2,
  Minimize2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import {
  DataEngineeringMultipleChoiceQuestion,
  ExamQuestion,
  MDMTopicQuestion,
  SQLMultipleChoiceQuestion,
  ScenarioQuestion,
  SubmissionResult,
  ProctoringState,
  ProctoringEvent,
  VoiceIntroduction,
} from "../types";
import { executeSQLScenario } from "../utils/sqlRunner";
import { executePythonScenario } from "../utils/pythonRunner";
import { ProctoringSystem } from "./ProctoringSystem";
import { ChryselysLogo } from "./ChryselysLogo";

interface CandidateExamViewProps {
  questions: ExamQuestion[];
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (idx: number) => void;
  candidateCodeMap: Record<string, string>;
  setCandidateCodeMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  candidateAnswersMap: Record<string, string>;
  setCandidateAnswersMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submissionsMap: Record<string, SubmissionResult>;
  setSubmissionsMap: React.Dispatch<React.SetStateAction<Record<string, SubmissionResult>>>;
  proctoringState: ProctoringState;
  setProctoringState: React.Dispatch<React.SetStateAction<ProctoringState>>;
  onSubmitAssessment: () => void;
  voiceIntroduction?: VoiceIntroduction | null;
  onOpenVoiceIntro?: () => void;
}

export const CandidateExamView: React.FC<CandidateExamViewProps> = ({
  questions,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  candidateCodeMap,
  setCandidateCodeMap,
  candidateAnswersMap,
  setCandidateAnswersMap,
  submissionsMap,
  setSubmissionsMap,
  proctoringState,
  setProctoringState,
  onSubmitAssessment,
  voiceIntroduction,
  onOpenVoiceIntro,
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const questionId = currentQuestion.id;

  const isScenario = currentQuestion.type === "scenario";
  const scenarioQ = isScenario ? (currentQuestion as ScenarioQuestion) : null;
  const choiceQ = currentQuestion.type === "mdm" || currentQuestion.type === "sql-mcq" || currentQuestion.type === "data-engineering-mcq"
    ? currentQuestion as MDMTopicQuestion | SQLMultipleChoiceQuestion | DataEngineeringMultipleChoiceQuestion
    : null;

  const code = candidateCodeMap[questionId] ?? "";
  const selectedOptionId = candidateAnswersMap[questionId] || "";

  const [selectedSampleTableIdx, setSelectedSampleTableIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // Full-Screen Proctoring Enforcement
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(() => {
    return typeof document !== "undefined" && !!document.fullscreenElement;
  });
  const [hasStartedExamInFullscreen, setHasStartedExamInFullscreen] = useState<boolean>(() => {
    return typeof document !== "undefined" && !!document.fullscreenElement;
  });
  const [fullscreenViolationPrompt, setFullscreenViolationPrompt] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = typeof document !== "undefined" && !!document.fullscreenElement;
      setIsFullscreenActive(isFs);
      setProctoringState((prev) => ({
        ...prev,
        isFullscreen: isFs,
      }));

      // Mid-exam violation trigger: if candidate already began the exam in fullscreen and now left it
      if (!isFs && hasStartedExamInFullscreen) {
        setFullscreenViolationPrompt(true);

        const newViolation: ProctoringEvent = {
          id: `evt-fs-exit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          type: "FULLSCREEN_EXIT",
          category: "Full-Screen Violation",
          severity: "high",
          message: "Exited Full-Screen Mode",
          details: "Candidate exited mandatory full-screen mode during the active assessment session. Assessment was locked to prevent external resource lookup.",
        };

        setProctoringState((prev) => ({
          ...prev,
          integrityScore: Math.max(10, prev.integrityScore - 10),
          violationsCount: prev.violationsCount + 1,
          events: [newViolation, ...prev.events],
        }));
      } else if (isFs) {
        setFullscreenViolationPrompt(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [hasStartedExamInFullscreen, setProctoringState]);

  const handleRequestFullscreenAndStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
      setIsFullscreenActive(true);
      setHasStartedExamInFullscreen(true);
      setFullscreenViolationPrompt(false);
      setProctoringState((prev) => ({
        ...prev,
        isFullscreen: true,
      }));
    } catch (err) {
      console.warn("Fullscreen permission note:", err);
      // In case the browser environment restricts native fullscreen, acknowledge and allow start
      setIsFullscreenActive(true);
      setHasStartedExamInFullscreen(true);
      setFullscreenViolationPrompt(false);
      setProctoringState((prev) => ({
        ...prev,
        isFullscreen: true,
      }));
    }
  };

  useEffect(() => {
    setSelectedSampleTableIdx(0);
    setStartTime(Date.now());
  }, [currentQuestionIndex]);

  const handleCodeChange = (newCode: string) => {
    setCandidateCodeMap((prev) => ({
      ...prev,
      [questionId]: newCode,
    }));
  };

  const handleClearCode = () => {
    handleCodeChange("");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData("text") || "";
    if (text.length > 0) {
      const charCount = text.length;
      const preview =
        text.length > 40
          ? text.slice(0, 40).replace(/\s+/g, " ") + "..."
          : text.replace(/\s+/g, " ");

      const violationMsg = `External Clipboard Paste (${charCount} chars)`;
      const violationDetail = `Candidate pasted ${charCount} characters ("${preview}") into Question ${
        currentQuestionIndex + 1
      } (${scenarioQ?.title || "Scenario"}) code workspace.`;

      setProctoringState((prev) => {
        const newScore = Math.max(10, prev.integrityScore - (charCount > 60 ? 10 : 5));
        const newEvent: ProctoringEvent = {
          id: `evt-paste-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          type: "PASTE_DETECTED",
          category: "Clipboard Paste",
          severity: charCount > 60 ? "high" : "medium",
          message: violationMsg,
          details: violationDetail,
        };

        return {
          ...prev,
          integrityScore: newScore,
          violationsCount: prev.violationsCount + 1,
          pasteCount: prev.pasteCount + 1,
          events: [newEvent, ...prev.events],
        };
      });
    }
  };

  const handleSelectOption = (optionId: string) => {
    setCandidateAnswersMap((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Submit Answer & Go Directly to Next Question (NO feedback or query results shown to candidate)
  const handleSaveAndNext = () => {
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (choiceQ) {
      const isCorrect = selectedOptionId === choiceQ.correctOptionId;
      const score = isCorrect ? 100 : selectedOptionId ? 30 : 0;
      const status: "Passed" | "Partial" | "Failed" = isCorrect
        ? "Passed"
        : selectedOptionId
        ? "Partial"
        : "Failed";

      const selectedOpt = choiceQ.options.find((o) => o.id === selectedOptionId);

      setSubmissionsMap((prev) => ({
        ...prev,
        [questionId]: {
          questionId,
          title: choiceQ.title,
          category: choiceQ.topic,
          difficultyLevel: choiceQ.difficulty,
          answered: Boolean(selectedOptionId),
          score,
          status,
          timeSpentSeconds: duration,
          selectedOptionId,
          candidateNotes: selectedOpt ? `Selected (${selectedOpt.label}): ${selectedOpt.text}` : "No selection",
          evaluatorNotes: isCorrect
            ? choiceQ.type === "mdm" ? `Correct answer on ${choiceQ.topic}.` : choiceQ.explanation
            : `Selected Option ${selectedOpt?.label || "None"}. Correct was Option ${
                choiceQ.options.find((o) => o.id === choiceQ.correctOptionId)?.label
              }.`,
        },
      }));
    } else if (scenarioQ) {
      // Evaluate in background for recruiter scoring only - zero output rendered to candidate
      let score = 0;
      let status: "Passed" | "Partial" | "Failed" = "Failed";
      let testCasesPassed = "0/0";
      let notes = "No code submitted.";

      if (scenarioQ.language === "sql") {
        const res = executeSQLScenario(scenarioQ, code);
        const passedCount = res.testCaseResults.filter((t) => t.passed).length;
        const totalCount = res.testCaseResults.length;
        score = Number((res.score ?? 0).toFixed(0));
        status = score >= 90 ? "Passed" : score >= 50 ? "Partial" : "Failed";
        testCasesPassed = `${passedCount}/${totalCount}`;
        notes = (res.feedback ?? []).join(" | ") || res.message;
      } else {
        const pyRes = executePythonScenario(scenarioQ, code);
        const passedCount = pyRes.testCaseResults.filter((t) => t.passed).length;
        const totalCount = pyRes.testCaseResults.length;
        score = Number((pyRes.score ?? 0).toFixed(0));
        status = score >= 90 ? "Passed" : score >= 50 ? "Partial" : "Failed";
        testCasesPassed = `${passedCount}/${totalCount}`;
        notes = (pyRes.feedback ?? []).join(" | ") || pyRes.stdout;
      }

      setSubmissionsMap((prev) => ({
        ...prev,
        [questionId]: {
          questionId,
          title: scenarioQ.title,
          category: scenarioQ.domain,
          score,
          status,
          testCasesPassed,
          timeSpentSeconds: duration,
          code,
          evaluatorNotes: notes,
        },
      }));
    }

    // Brief subtle notification
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1200);

    // Automatically navigate to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowConfirmSubmit(true);
    }
  };

  const totalAnswered = questions.filter(
    (q) =>
      ((q.type === "mdm" || q.type === "sql-mcq") && candidateAnswersMap[q.id]) ||
        ((q.type === "mdm" || q.type === "sql-mcq" || q.type === "data-engineering-mcq") && candidateAnswersMap[q.id]) ||
      (q.type === "scenario" && (submissionsMap[q.id] || candidateCodeMap[q.id]))
  ).length;

  return (
    <div id="candidate-exam-view" className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Toast notification: Answer Saved */}
      {saveToast && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Response saved. Moving to next question...</span>
        </div>
      )}

      {/* Top Question Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <div className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#003B54]" />
            <span>Questions:</span>
          </div>

          {questions.map((q, idx) => {
            const answered =
              ((q.type === "mdm" || q.type === "sql-mcq" || q.type === "data-engineering-mcq") && !!candidateAnswersMap[q.id]) ||
              (q.type === "scenario" && (!!submissionsMap[q.id] || !!candidateCodeMap[q.id]));
            const isCurrent = idx === currentQuestionIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#003B54] text-white shadow-xs font-semibold"
                    : answered
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {answered && !isCurrent && <Check className="w-3 h-3 text-emerald-600" />}
                <span>
                  Q{idx + 1}
                  <span className="opacity-70 text-[10px] ml-1">
                    ({q.type === "mdm" ? "MDM" : q.type === "sql-mcq" ? "SQL" : q.type === "data-engineering-mcq" ? "DATA ENGINEERING" : (q as ScenarioQuestion).language.toUpperCase()})
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress Tracker & Final Review */}
        <div className="flex items-center gap-3 text-xs w-full md:w-auto justify-between md:justify-end flex-wrap">
          {onOpenVoiceIntro && (
            <button
              type="button"
              onClick={onOpenVoiceIntro}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                voiceIntroduction
                  ? "bg-blue-50 border border-blue-200 text-[#003B54] hover:bg-blue-100"
                  : "bg-amber-50 border border-amber-300 text-[#D9822B] hover:bg-amber-100"
              }`}
              title="Click to view or record your voice introduction self-pitch"
            >
              <Mic className="w-3.5 h-3.5 text-[#003B54]" />
              <span>
                {voiceIntroduction ? `Voice Intro (${voiceIntroduction.wordCount}w)` : "Voice Intro (Step 1)"}
              </span>
            </button>
          )}

          {/* Full-Screen Mode Proctoring Badge */}
          {isFullscreenActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full-Screen Locked</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestFullscreenAndStart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs animate-pulse cursor-pointer"
              title="Force browser into full-screen mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Enter Full-Screen</span>
            </button>
          )}

          <span className="text-slate-500 font-medium">
            Answered: <strong className="text-[#003B54]">{totalAnswered}</strong> of {questions.length}
          </span>
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#003B54] hover:bg-[#002D40] text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            Review & Final Submit
          </button>
        </div>
      </div>

      {/* QUESTION CONTENT CONTAINER */}
      {choiceQ ? (
        /* ========================================================================= */
        /* MDM CONCEPTUAL QUESTION VIEW (Data Stewardship, Match & Merge, Survivorship)*/
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Context, Topic & Proctoring */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Topic: {choiceQ.topic}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {choiceQ.difficulty} • ~{choiceQ.estimatedMinutes} mins
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {choiceQ.title}
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{choiceQ.type === "mdm" ? "Master Data Management Evaluation Rubric" : `${choiceQ.topic} Fundamentals`}</span>
                </div>
              </div>

              {/* Scenario Context */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed space-y-1.5">
                <span className="font-semibold text-slate-900 block flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#003B54]" />
                  Operational Scenario Context:
                </span>
                <p>{choiceQ.type === "mdm" ? choiceQ.scenarioContext : choiceQ.explanation}</p>
              </div>

              {/* MDM Sample Staging Data */}
              {choiceQ.type === "mdm" && choiceQ.sampleTables && choiceQ.sampleTables.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {choiceQ.sampleTables.map((tbl, tIdx) => (
                    <div key={tIdx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <TableIcon className="w-3.5 h-3.5 text-[#003B54]" />
                          <span>Sample Data & Attributes</span>
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#003B54] border border-blue-200">
                          {tbl.tableName}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                              {tbl.columns.map((col) => (
                                <th key={col} className="p-2 whitespace-nowrap text-[11px] font-mono text-slate-800">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {tbl.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50">
                                {tbl.columns.map((col) => (
                                  <td key={col} className="p-2 whitespace-nowrap text-slate-600">
                                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : "NULL"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
                <span className="font-semibold block flex items-center gap-1 text-[#D9822B]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#D9822B]" />
                  L1 Assessment Directive:
                </span>
                <p>
                  {choiceQ.type === "mdm"
                    ? "Evaluate the scenario based on standard enterprise data governance protocols, lineage verification, and MDM hub integrity."
                    : `Select the best answer based on ${choiceQ.topic} fundamentals.`}
                </p>
              </div>
            </div>

            {/* Proctoring camera & audio monitor */}
            <ProctoringSystem
              proctoringState={proctoringState}
              setProctoringState={setProctoringState}
            />
          </div>

          {/* Right Column: Question Prompt & Option Selection */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1}
                </span>
                <h3 className="text-base font-semibold text-slate-900 leading-relaxed">
                  {choiceQ.questionText}
                </h3>
              </div>

              {/* Option Selection Cards */}
              <div className="space-y-3 pt-2">
                {choiceQ.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed mt-1">
                        {opt.text}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Next Question */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  disabled={!selectedOptionId}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <span>
                    {currentQuestionIndex === questions.length - 1
                      ? "Save & Submit Assessment"
                      : "Save & Next Question"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SCENARIO CODING VIEW (SQL & Basic Python)                                 */
        /* Clean Code Editor with NO query output console shown to candidate        */
        /* ========================================================================= */
        scenarioQ && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Problem, Rules, Schema, Proctoring */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Scenario: {scenarioQ.domain}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {scenarioQ.difficulty} • ~{scenarioQ.estimatedMinutes} mins
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {scenarioQ.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Concept: <strong className="text-slate-700">{scenarioQ.concept}</strong>
                  </p>
                </div>

                {/* Scenario Context */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 block mb-1">Scenario Background:</strong>
                  {scenarioQ.scenarioContext}
                </div>

                {/* Problem Statement */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Problem Statement
                  </h4>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {scenarioQ.problemStatement}
                  </p>
                </div>

                {/* Staged Sample Data Viewer */}
                {scenarioQ.sampleTables && scenarioQ.sampleTables.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5 text-[#003B54]" />
                        <span>Sample Staging Data</span>
                      </span>
                      {scenarioQ.sampleTables.length > 1 && (
                        <div className="flex gap-1">
                          {scenarioQ.sampleTables.map((t, idx) => (
                            <button
                              key={t.tableName}
                              onClick={() => setSelectedSampleTableIdx(idx)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                selectedSampleTableIdx === idx
                                  ? "bg-[#003B54] text-white font-semibold"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {t.tableName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                            {scenarioQ.sampleTables[selectedSampleTableIdx].columns.map((col) => (
                              <th key={col} className="p-2 whitespace-nowrap text-[11px] font-mono text-slate-800">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {scenarioQ.sampleTables[selectedSampleTableIdx].rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              {scenarioQ.sampleTables[selectedSampleTableIdx].columns.map((col) => (
                                <td key={col} className="p-2 whitespace-nowrap text-slate-600">
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : "NULL"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sample Expected Output */}
                {scenarioQ.expectedOutputSample && scenarioQ.expectedOutputSample.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D9822B]" />
                      <span>Sample Expected Result</span>
                    </span>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs bg-slate-50/50">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                            {Object.keys(scenarioQ.expectedOutputSample[0]).map((col) => (
                              <th key={col} className="p-2 whitespace-nowrap text-[11px] font-mono text-slate-800">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {scenarioQ.expectedOutputSample.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white">
                              {Object.keys(scenarioQ.expectedOutputSample![0]).map((col) => (
                                <td key={col} className="p-2 whitespace-nowrap text-slate-700">
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : "NULL"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Proctoring camera & audio monitor */}
              <ProctoringSystem
                proctoringState={proctoringState}
                setProctoringState={setProctoringState}
              />
            </div>

            {/* Right Column: Clean Code Editor (Zero Query Output Shown) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
                {/* Editor Header Bar */}
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="ml-2 font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-400" />
                      {scenarioQ.language === "sql" ? "query.sql" : "solution.py"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                      Empty Workspace
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                      title="Copy Code"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleClearCode}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Clear code workspace"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Editor Textarea with Paste Interception */}
                <div className="p-4 flex-1">
                  <textarea
                    id="code-editor-textarea"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onPaste={handleEditorPaste}
                    spellCheck={false}
                    className="w-full h-96 bg-transparent text-slate-100 font-mono text-xs leading-relaxed resize-y focus:outline-hidden selection:bg-indigo-600/40"
                    placeholder={
                      scenarioQ.language === "sql"
                        ? "-- Empty workspace: Write your SQL solution from scratch...\n-- Example:\n-- SELECT ...\n-- FROM ..."
                        : "# Empty workspace: Write your Python solution from scratch...\n# Example:\n# def ...:"
                    }
                  />
                </div>

                {/* Editor Instructions Notice (Replacing execution output) */}
                <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-3 text-xs text-slate-400 flex items-center justify-between">
                  <span>
                    Compose your {scenarioQ.language.toUpperCase()} solution above. Click below when ready to save and proceed.
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Line count: {code.split("\n").length}
                  </span>
                </div>
              </div>

              {/* Bottom Navigation & Save/Next Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  id="submit-and-next-button"
                  onClick={handleSaveAndNext}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <span>
                    {currentQuestionIndex === questions.length - 1
                      ? "Save & Submit Assessment"
                      : "Save & Next Question"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Confirmation Modal: Final Assessment Submission */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Submit Technical Assessment?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You have recorded answers for {totalAnswered} of {questions.length} questions.
                Once confirmed, your assessment will be submitted to the recruiting and engineering evaluation pipeline.
              </p>
            </div>

            {/* Checklist */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>Completed Questions:</span>
                <span className="font-bold text-indigo-700">
                  {totalAnswered} / {questions.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Return to Assessment
              </button>
              <button
                id="confirm-submit-assessment-button"
                onClick={() => {
                  setShowConfirmSubmit(false);
                  onSubmitAssessment();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#003B54] hover:bg-[#002D40] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INITIAL MANDATORY FULL-SCREEN SECURITY GATE */}
      {!hasStartedExamInFullscreen && !isFullscreenActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="flex justify-center">
              <div className="p-2.5 px-4 rounded-2xl bg-white shadow-md border border-slate-100 inline-flex items-center">
                <ChryselysLogo size="md" variant="full" />
              </div>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#003B54] flex items-center justify-center mx-auto border border-blue-200 shadow-xs">
              <Maximize2 className="w-7 h-7 text-[#003B54]" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-50 text-[#D9822B] text-[11px] font-bold uppercase tracking-wider border border-amber-200">
                Security Protocol Level: Strict
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Mandatory Full-Screen Mode Required
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                To guarantee assessment integrity, eliminate external aid, and provide an equitable testing environment, this L1 Technical Assessment must be completed in exclusive full-screen mode.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5 text-slate-700">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#003B54] shrink-0 mt-0.5" />
                <span>
                  <strong>Full-Screen Lock:</strong> Exiting full-screen (via ESC, Alt+Tab, or mouse gesture) pauses your test and automatically registers an integrity penalty.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Proctoring Surveillance:</strong> Window blurs, external pastes, and tab changes are continuously logged in your candidate dossier.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>30-Minute Timer:</strong> Your assessment clock begins once full-screen mode is verified.
                </span>
              </div>
            </div>

            <button
              id="enter-fullscreen-and-begin-exam-btn"
              type="button"
              onClick={handleRequestFullscreenAndStart}
              className="w-full py-4 rounded-2xl bg-[#003B54] hover:bg-[#002D40] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <Maximize2 className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Enter Full-Screen & Begin Assessment</span>
            </button>
          </div>
        </div>
      )}

      {/* MID-EXAM FULL-SCREEN EXIT LOCKOUT OVERLAY */}
      {(fullscreenViolationPrompt || (!isFullscreenActive && hasStartedExamInFullscreen)) && (
        <div className="fixed inset-0 z-50 bg-rose-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl border-2 border-rose-300 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Assessment Paused</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full-screen mode is required to continue. Re-enter full-screen to resume your assessment.
              </p>
            </div>

            <button
              id="resume-fullscreen-btn"
              type="button"
              onClick={handleRequestFullscreenAndStart}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-white" />
              <span>Re-Enter Full-Screen & Resume Assessment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
