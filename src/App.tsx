import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { AuthView } from "./components/AuthView";
import { CandidateExamView } from "./components/CandidateExamView";
import { VoiceIntroductionPage } from "./components/VoiceIntroductionPage";
import { RecruiterDashboard } from "./components/RecruiterDashboard";
import { KekaSyncModal } from "./components/KekaSyncModal";
import { PrintableReport } from "./components/PrintableReport";
import { ChryselysFooter } from "./components/ChryselysFooter";
import { ALL_EXAM_QUESTIONS } from "./data/questions";
import {
  AuthUser,
  CandidateAssessment,
  ExamQuestion,
  ProctoringState,
  SubmissionResult,
  VoiceIntroduction,
} from "./types";
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2,
  Lock,
  RotateCcw,
  LogOut,
  Briefcase,
  Mic,
} from "lucide-react";

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("assessment_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isRecruiterAccessVerified, setIsRecruiterAccessVerified] = useState(false);

  // Role & navigation state
  const [activeRole, setActiveRole] = useState<"candidate" | "recruiter">("candidate");
  const [activeTab, setActiveTab] = useState<"candidate" | "recruiter" | "keka">("candidate");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Candidate information
  const [candidateName, setCandidateName] = useState("Kiran Varma");
  const [candidateEmail, setCandidateEmail] = useState("kiran.varma@talent-engine.com");

  // Sync role and candidate info with currentUser on initialization or change
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "recruiter") {
        setActiveRole("recruiter");
        setActiveTab("recruiter");
      } else {
        setActiveRole("candidate");
        setActiveTab("candidate");
        setCandidateName(currentUser.name);
        setCandidateEmail(currentUser.email);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== "recruiter") {
      setIsRecruiterAccessVerified(false);
      return;
    }

    let isCurrent = true;
    const verifyRecruiterAccess = async () => {
      try {
        const response = await fetch("/api/auth/recruiter-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email }),
        });
        if (!response.ok) {
          throw new Error("Recruiter access is no longer authorized.");
        }
        const data = await response.json();
        if (!isCurrent) return;
        setCurrentUser(data.user as AuthUser);
        setIsRecruiterAccessVerified(true);
        try {
          localStorage.setItem("assessment_auth_user", JSON.stringify(data.user));
        } catch {
          // Recruiter access remains verified for this page session.
        }
      } catch {
        if (!isCurrent) return;
        try {
          localStorage.removeItem("assessment_auth_user");
        } catch {
          // Continue clearing in-memory access even if storage is unavailable.
        }
        setCurrentUser(null);
        setIsRecruiterAccessVerified(false);
        setActiveRole("candidate");
        setActiveTab("candidate");
      }
    };

    void verifyRecruiterAccess();
    return () => {
      isCurrent = false;
    };
  }, [currentUser?.email, currentUser?.role]);

  // Candidate responses state
  const [candidateAnswersMap, setCandidateAnswersMap] = useState<Record<string, string>>({});
  const [candidateCodeMap, setCandidateCodeMap] = useState<Record<string, string>>({});
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, SubmissionResult>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(1800); // 30 mins
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [isStartingAssessment, setIsStartingAssessment] = useState(false);
  const [candidateStep, setCandidateStep] = useState<"voice_intro" | "exam">("voice_intro");
  const [voiceIntroduction, setVoiceIntroduction] = useState<VoiceIntroduction | null>(null);
  const [assessmentSession, setAssessmentSession] = useState<{
    sessionId: string;
    deadlineAt: string;
    durationSeconds: number;
    track: AuthUser["assessmentTrack"];
    inviteId: string;
  } | null>(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState<ExamQuestion[]>([]);

  // Proctoring state
  const [proctoringState, setProctoringState] = useState<ProctoringState>({
    integrityScore: 100,
    violationsCount: 0,
    tabSwitchCount: 0,
    pasteCount: 0,
    faceLossCount: 0,
    isWebcamActive: false,
    isFullscreen: false,
    events: [
      {
        id: "evt-init",
        timestamp: new Date().toISOString(),
        type: "INFO",
        message: "Proctoring session initialized. Audio & visibility tracking online.",
      },
    ],
  });

  // Candidate assessment list (recruiter view)
  const [candidates, setCandidates] = useState<CandidateAssessment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals & Printable view
  const [syncCandidate, setSyncCandidate] = useState<CandidateAssessment | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [activePrintCandidate, setActivePrintCandidate] = useState<CandidateAssessment | null>(null);

  // Load existing candidates from server on mount
  const fetchCandidates = async () => {
    try {
      const res = await fetch("/api/candidates");
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Timer countdown is derived from the server-owned deadline.
  useEffect(() => {
    if (isExamCompleted || activeTab !== "candidate" || !assessmentSession) return;
    const updateRemainingTime = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(assessmentSession.deadlineAt) - Date.now()) / 1000));
      setTimeRemainingSeconds(remaining);
    };
    updateRemainingTime();
    const interval = setInterval(() => {
      updateRemainingTime();
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamCompleted, activeTab, assessmentSession]);

  const startAssessment = async () => {
    if (currentUser?.role !== "candidate" || !currentUser.assessmentTrack || !currentUser.assessmentInviteId) {
      window.alert("A valid assessment invitation is required to start.");
      return;
    }
    setIsStartingAssessment(true);
    try {
      const response = await fetch("/api/assessment/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateEmail, inviteId: currentUser.assessmentInviteId }),
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error || "Unable to start assessment session.");
      }
      const session = (await response.json()) as {
        sessionId: string;
        deadlineAt: string;
        durationSeconds: number;
        questionIds: string[];
        track: AuthUser["assessmentTrack"];
        inviteId: string;
      };
      const questionById = new Map(ALL_EXAM_QUESTIONS.map((question) => [question.id, question]));
      const selectedQuestions = Array.isArray(session.questionIds)
        ? session.questionIds
            .map((questionId) => questionById.get(questionId))
            .filter((question): question is ExamQuestion => question !== undefined)
        : [];
      if (!session.questionIds || selectedQuestions.length !== session.questionIds.length || selectedQuestions.length === 0) {
        throw new Error("The assessment question set could not be loaded.");
      }
      setAssessmentQuestions(selectedQuestions);
      setAssessmentSession(session);
      setTimeRemainingSeconds(session.durationSeconds);
      setCandidateStep("exam");
    } catch (error) {
      console.error(error);
      window.alert("The assessment could not be started. Please try again.");
    } finally {
      setIsStartingAssessment(false);
    }
  };

  // Handle Login from AuthView
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setIsRecruiterAccessVerified(user.role === "recruiter");
    try {
      localStorage.setItem("assessment_auth_user", JSON.stringify(user));
    } catch {
      // Ignore storage errors
    }

    if (user.role === "recruiter") {
      setActiveRole("recruiter");
      setActiveTab("recruiter");
    } else {
      setActiveRole("candidate");
      setActiveTab("candidate");
      setCandidateName(user.name);
      setCandidateEmail(user.email);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setIsRecruiterAccessVerified(false);
    try {
      localStorage.removeItem("assessment_auth_user");
    } catch {
      // Ignore storage errors
    }
    setIsExamCompleted(false);
    handleResetForNewCandidate();
  };

  // Handle Assessment Submission
  const handleSubmitAssessment = async () => {
    if (!assessmentSession) {
      window.alert("No active assessment session was found.");
      return;
    }
    setIsSubmitting(true);

    try {
      const submitResponse = await fetch(`/api/assessment/sessions/${assessmentSession.sessionId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateName,
            candidateEmail,
            answers: candidateAnswersMap,
            code: candidateCodeMap,
            voiceIntroduction: voiceIntroduction || null,
            proctoringLog: {
              events: proctoringState.events,
            },
          }),
      });
      if (!submitResponse.ok) {
        const error = await submitResponse.json().catch(() => ({}));
        throw new Error(error.error || "Assessment submission was rejected.");
      }
      const savedCandidate = (await submitResponse.json()) as CandidateAssessment;
      setCandidates((prev) => [savedCandidate, ...prev]);
      setAssessmentSession(null);
      setIsExamCompleted(true);
    } catch (err) {
      console.warn("Assessment submission failed:", err);
      window.alert(err instanceof Error ? err.message : "Assessment submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewCandidate = () => {
    setIsExamCompleted(false);
    setCandidateCodeMap({});
    setCandidateAnswersMap({});
    setSubmissionsMap({});
    setCurrentQuestionIndex(0);
    setTimeRemainingSeconds(1800);
    setAssessmentQuestions([]);
    setVoiceIntroduction(null);
    setAssessmentSession(null);
    setCandidateStep("voice_intro");
    setProctoringState({
      integrityScore: 100,
      violationsCount: 0,
      tabSwitchCount: 0,
      pasteCount: 0,
      faceLossCount: 0,
      isWebcamActive: false,
      isFullscreen: false,
      events: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "INFO",
          message: "New candidate assessment session initialized.",
        },
      ],
    });
  };

  const handleOpenSync = (c: CandidateAssessment) => {
    setSyncCandidate(c);
    setIsSyncModalOpen(true);
  };

  const answeredQuestionCount = assessmentQuestions.filter((question) =>
    question.type === "mdm"
      ? Boolean(candidateAnswersMap[question.id])
      : Boolean(submissionsMap[question.id] || candidateCodeMap[question.id])
  ).length;

  // If user is not logged in, render the AuthView
  if (!currentUser) {
    return <AuthView onLogin={handleLogin} />;
  }

  if (currentUser.role === "recruiter" && !isRecruiterAccessVerified) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Verifying recruiter access...</div>;
  }

  if (activePrintCandidate) {
    return (
      <PrintableReport
        candidate={activePrintCandidate}
        onBack={() => setActivePrintCandidate(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-100">
      {/* Navigation Header with Role-Based Access */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeRole={activeRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeRemainingSeconds={timeRemainingSeconds}
        proctoringState={proctoringState}
        candidateName={candidateName}
        assessmentTrack={currentUser.assessmentTrack}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Candidate Exam Tab */}
        {activeTab === "candidate" && (
          isExamCompleted ? (
            /* ========================================================================= */
            /* CANDIDATE POST-SUBMISSION CONFIRMATION SCREEN                            */
            /* Restricted: Candidate cannot see scorecards, reports or KEKA data         */
            /* ========================================================================= */
            <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                  Assessment Completed
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  Thank you, {candidateName}!
                </h2>
                <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Your assessment has been securely received. You answered {answeredQuestionCount} of {assessmentQuestions.length} questions.
                </p>
              </div>

              {/* Secure Session Info Box */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 text-left space-y-3 shadow-xs max-w-md mx-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Proctoring & Audit Record</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Candidate Email:</span>
                    <strong className="text-slate-900">{candidateEmail}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Questions Completed:</span>
                    <strong className="text-slate-900">{answeredQuestionCount} / {assessmentQuestions.length}</strong>
                  </div>
                  {voiceIntroduction && (
                    <div className="flex justify-between">
                      <span>Voice Introduction:</span>
                      <strong className="text-[#003B54] flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5 text-[#D9822B]" /> Recorded ({voiceIntroduction.durationSeconds}s)
                      </strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Evaluation Status:</span>
                    <span className="text-slate-700 font-medium">Under Recruiter Review</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed border border-slate-100 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    In accordance with assessment security protocols, detailed scorecards and rubrics are restricted to authorized hiring managers.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  id="candidate-finish-signout-btn"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Finish & Sign Out</span>
                </button>

                {/* If user logged in as recruiter testing the flow, provide shortcut back */}
                {currentUser.role === "recruiter" && (
                  <button
                    id="switch-to-recruiter-from-finish"
                    onClick={() => {
                      setActiveRole("recruiter");
                      setActiveTab("recruiter");
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#003B54] hover:bg-[#002D40] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                    <span>Return to Recruiter Hub</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            candidateStep === "voice_intro" ? (
              <VoiceIntroductionPage
                candidateName={candidateName}
                candidateEmail={candidateEmail}
                isStartingAssessment={isStartingAssessment}
                onComplete={(intro) => {
                  setVoiceIntroduction(intro);
                  void startAssessment();
                }}
                onSkip={() => void startAssessment()}
                existingIntro={voiceIntroduction}
              />
            ) : (
              <CandidateExamView
                questions={assessmentQuestions}
                currentQuestionIndex={currentQuestionIndex}
                setCurrentQuestionIndex={setCurrentQuestionIndex}
                candidateCodeMap={candidateCodeMap}
                setCandidateCodeMap={setCandidateCodeMap}
                candidateAnswersMap={candidateAnswersMap}
                setCandidateAnswersMap={setCandidateAnswersMap}
                submissionsMap={submissionsMap}
                setSubmissionsMap={setSubmissionsMap}
                proctoringState={proctoringState}
                setProctoringState={setProctoringState}
                onSubmitAssessment={handleSubmitAssessment}
                voiceIntroduction={voiceIntroduction}
                onOpenVoiceIntro={() => setCandidateStep("voice_intro")}
              />
            )
          )
        )}

        {/* Recruiter Dashboard (Only accessible in Recruiter role) */}
        {activeTab === "recruiter" && activeRole === "recruiter" && (
          <RecruiterDashboard
            candidates={candidates}
            recruiterEmail={currentUser.email}
            onSelectCandidateForSync={handleOpenSync}
            onPrintReport={(c) => setActivePrintCandidate(c)}
            onRefreshCandidates={fetchCandidates}
          />
        )}

        {/* KEKA Sync tab (Only accessible in Recruiter role) */}
        {activeTab === "keka" && activeRole === "recruiter" && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    KEKA Sync
                  </h2>
                  <p className="text-xs text-slate-500">
                    Candidate scorecards are ready for mapping. Sync will be enabled when KEKA API details are available.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Integration status</div>
                  <div className="mt-1 font-semibold text-amber-700">API details pending</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Candidate records</div>
                  <div className="mt-1 font-semibold text-slate-900">{candidates.length} available for review</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={candidates.length === 0}
                  onClick={() => {
                    setSyncCandidate(candidates[0] || null);
                    setIsSyncModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Preview KEKA Payload</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Loading Overlay when Automated Scoring is Running */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Submitting Assessment...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Recording candidate responses and dispatching proctored evaluation data to the recruiter portal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KEKA payload preview */}
      <KekaSyncModal
        candidate={syncCandidate}
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Global Chryselys Footer across all views */}
      <ChryselysFooter />
    </div>
  );
}
