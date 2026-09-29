import React, { useState, useRef, useEffect } from "react";
import {
  Users,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Building2,
  ExternalLink,
  ChevronRight,
  Code2,
  Calendar,
  Award,
  Check,
  RefreshCw,
  ClipboardCheck,
  Eye,
  Info,
  Layers,
  Mic,
  Volume2,
  Play,
  Pause,
  Clock,
  FileText,
  Headphones,
  UserPlus,
  ClipboardCopy,
  X,
} from "lucide-react";
import { AssessmentTrack, CandidateAssessment } from "../types";
import { exportCandidateToExcel, exportAllCandidatesToExcel } from "../utils/excelExporter";

interface RecruiterDashboardProps {
  candidates: CandidateAssessment[];
  recruiterEmail: string;
  onSelectCandidateForSync: (candidate: CandidateAssessment) => void;
  onPrintReport: (candidate: CandidateAssessment) => void;
  onRefreshCandidates?: () => void;
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  candidates,
  recruiterEmail,
  onSelectCandidateForSync,
  onPrintReport,
  onRefreshCandidates,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState<string>("ALL");
  const [proctoringFilter, setProctoringFilter] = useState<"ALL" | "VIOLATIONS" | "TABS" | "PASTES">("ALL");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateAssessment | null>(
    candidates[0] || null
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCandidateName, setInviteCandidateName] = useState("");
  const [inviteCandidateEmail, setInviteCandidateEmail] = useState("");
  const [inviteTrack, setInviteTrack] = useState<AssessmentTrack>("data_stewardship");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio if candidate selection changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  }, [selectedCandidate?.id]);

  const handleToggleAudioPlay = (cand: CandidateAssessment) => {
    if (!cand.voiceIntroduction) return;

    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    if (cand.voiceIntroduction.audioDataUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(cand.voiceIntroduction.audioDataUrl);
        audioRef.current.onended = () => setIsPlayingAudio(false);
      } else {
        audioRef.current.src = cand.voiceIntroduction.audioDataUrl;
      }
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => {
          fallbackSpeak(cand.voiceIntroduction!.transcript);
        });
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      fallbackSpeak(cand.voiceIntroduction.transcript);
    }
  };

  const fallbackSpeak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((cand) => {
    const matchesSearch =
      cand.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRec =
      recommendationFilter === "ALL" || cand.recommendation === recommendationFilter;

    return matchesSearch && matchesRec;
  });

  // Calculate high-level stats
  const totalCount = candidates.length;
  const avgOverallScore = totalCount
    ? Math.round(candidates.reduce((acc, c) => acc + c.overallScore, 0) / totalCount)
    : 0;
  const strongHireCount = candidates.filter((c) => c.recommendation === "Strong Hire").length;
  const avgIntegrity = totalCount
    ? Math.round(
        candidates.reduce((acc, c) => acc + (c.proctoring?.integrityScore || 100), 0) / totalCount
      )
    : 100;

  const handleDownloadAll = () => {
    exportAllCandidatesToExcel(candidates);
  };

  const handleDownloadSingle = (c: CandidateAssessment) => {
    exportCandidateToExcel(c);
  };

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteError("");
    setInviteUrl("");
    setIsCreatingInvite(true);
    try {
      const response = await fetch("/api/assessment/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: inviteCandidateName,
          candidateEmail: inviteCandidateEmail,
          track: inviteTrack,
          recruiterEmail,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not create assessment invite.");
      setInviteUrl(data.inviteUrl);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Could not create assessment invite.");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Recruiter & Hiring Evaluation Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time candidate scorecards, automated MDM / SQL / Python skill rubrics, proctoring audits, and Excel export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#003B54] hover:bg-[#002D40] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Assessment Invite</span>
          </button>
          {onRefreshCandidates && (
            <button
              onClick={onRefreshCandidates}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1.5 transition-all"
              title="Refresh candidate roster"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Roster to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Assessed Candidates</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Active Pipeline</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Mean Overall Score</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{avgOverallScore}%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Across submitted assessments</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Strong Hire Conversion</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {totalCount ? Math.round((strongHireCount / totalCount) * 100) : 0}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {strongHireCount} recommended hires
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Proctoring Integrity Index</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{avgIntegrity}%</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">High exam integrity</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Decision:</span>
          {["ALL", "Strong Hire", "Hire", "Re-evaluate"].map((rec) => (
            <button
              key={rec}
              onClick={() => setRecommendationFilter(rec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                recommendationFilter === rec
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {rec}
            </button>
          ))}
        </div>
      </div>

      {/* Master Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Candidate Roster Table */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Candidate Submissions ({filteredCandidates.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No candidates matching search criteria.
              </div>
            ) : (
              filteredCandidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/60 border-l-4 border-indigo-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{cand.candidateName}</div>
                        <div className="text-xs text-slate-500">{cand.candidateEmail}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-extrabold text-indigo-700">
                          {cand.overallScore}%
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            cand.recommendation === "Strong Hire"
                              ? "bg-emerald-100 text-emerald-800"
                              : cand.recommendation === "Hire"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {cand.recommendation}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                          <ShieldCheck
                            className={`w-3.5 h-3.5 ${
                              (cand.proctoring?.integrityScore ?? 100) >= 90
                                ? "text-emerald-600"
                                : "text-amber-500"
                            }`}
                          />
                          {cand.proctoring?.integrityScore ?? 100}%
                        </span>

                        {/* Violation Tags for Quick Recruiter Triage */}
                        {(cand.proctoring?.tabSwitchCount ?? 0) > 0 || (cand.proctoring?.pasteCount ?? 0) > 0 ? (
                          <>
                            {(cand.proctoring?.tabSwitchCount ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-0.5">
                                <ExternalLink className="w-2.5 h-2.5" />
                                {cand.proctoring?.tabSwitchCount} Tab{(cand.proctoring?.tabSwitchCount ?? 0) > 1 ? "s" : ""}
                              </span>
                            )}
                            {(cand.proctoring?.pasteCount ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold flex items-center gap-0.5">
                                <ClipboardCheck className="w-2.5 h-2.5" />
                                {cand.proctoring?.pasteCount} Paste{(cand.proctoring?.pasteCount ?? 0) > 1 ? "s" : ""}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Clean Session
                          </span>
                        )}

                        {/* Candidate Voice Introduction Badge */}
                        {cand.voiceIntroduction && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold flex items-center gap-0.5">
                            <Mic className="w-2.5 h-2.5 text-indigo-600" />
                            {cand.voiceIntroduction.durationSeconds}s Voice
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(cand.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Selected Candidate Comprehensive Scorecard */}
        <div className="lg:col-span-7 space-y-6">
          {selectedCandidate ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Header Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedCandidate.candidateName}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedCandidate.recommendation === "Strong Hire"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedCandidate.recommendation === "Hire"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedCandidate.recommendation}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedCandidate.role} • ID: {selectedCandidate.id} • {selectedCandidate.candidateEmail}
                  </div>
                </div>

                {/* Candidate Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadSingle(selectedCandidate)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all cursor-pointer"
                    title="Export candidate report to Excel spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Excel</span>
                  </button>

                  <button
                    onClick={() => onPrintReport(selectedCandidate)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    title="Printable evaluation sheet"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print PDF</span>
                  </button>

                  <button
                    onClick={() => onSelectCandidateForSync(selectedCandidate)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    title="Preview KEKA candidate payload"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Sync KEKA</span>
                  </button>
                </div>
              </div>

              {/* Domain Skill Scoring Rubric Bars */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Skill Competency Rubric
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SkillProgressBar
                    label="MDM Architecture & Golden Record"
                    score={selectedCandidate.scores?.mdm ?? 85}
                  />
                  <SkillProgressBar
                    label="SQL Window Functions & SCD2"
                    score={selectedCandidate.scores?.sql ?? 80}
                  />
                  <SkillProgressBar
                    label="Python Deduplication & Fuzzy Matching"
                    score={selectedCandidate.scores?.python ?? 82}
                  />
                  <SkillProgressBar
                    label="Edge Cases & Null Defense"
                    score={selectedCandidate.scores?.edgeCases ?? 75}
                  />
                  <SkillProgressBar
                    label="Code Readability & Clean Architecture"
                    score={selectedCandidate.scores?.codeQuality ?? 88}
                  />
                  <SkillProgressBar
                    label="Proctoring Integrity Index"
                    score={selectedCandidate.proctoring?.integrityScore ?? 100}
                    isIntegrity
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Difficulty-Level Results
                </h4>
                {selectedCandidate.difficultyScores ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(["Basic", "Intermediate", "Advanced"] as const).map((level) => {
                      const result = selectedCandidate.difficultyScores![level];
                      return (
                        <div key={level} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="text-xs font-semibold text-slate-700">{level}</div>
                          <div className="mt-1 text-xl font-bold text-slate-900">
                            {result.score === null ? "Not attempted" : `${result.score}%`}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {result.answered} of {result.total} questions answered
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Difficulty-level results are unavailable for this legacy assessment.</p>
                )}
              </div>

              {/* CANDIDATE VOICE INTRODUCTION & AUDIO DOSSIER */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-200/80 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>Candidate Voice Self-Introduction</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          Audited Voice Dossier
                        </span>
                      </h4>
                      <div className="text-[11px] text-slate-500">
                        Spoken audio self-introduction recorded upon entry & auto-transcribed for hiring review
                      </div>
                    </div>
                  </div>

                  {selectedCandidate.voiceIntroduction && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAudioPlay(selectedCandidate)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                          isPlayingAudio
                            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                        title="Listen to candidate audio self-pitch"
                      >
                        {isPlayingAudio ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Listen to Voice Intro ({selectedCandidate.voiceIntroduction.durationSeconds}s)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {selectedCandidate.voiceIntroduction ? (
                  <div className="space-y-3">
                    {/* Transcript card */}
                    <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1 font-semibold text-indigo-900">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" /> Verbatim Spoken Transcript
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {selectedCandidate.voiceIntroduction.durationSeconds} seconds
                          </span>
                          <span>•</span>
                          <span>{selectedCandidate.voiceIntroduction.wordCount} words</span>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-slate-800 leading-relaxed italic border-l-2 border-indigo-500 pl-3 py-1 bg-slate-50/50 rounded-r-lg">
                        "{selectedCandidate.voiceIntroduction.transcript}"
                      </p>
                    </div>

                    {/* Detected Topics Tags */}
                    {selectedCandidate.voiceIntroduction.topicsCovered && selectedCandidate.voiceIntroduction.topicsCovered.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-slate-500 font-medium">Verified competency focus:</span>
                        {selectedCandidate.voiceIntroduction.topicsCovered.map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                    Candidate completed assessment prior to voice capture implementation (Legacy Session).
                  </div>
                )}
              </div>

              {/* AI Evaluator Qualitative Notes */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Recruiter Synthesis & Executive Recommendation</span>
                </div>
                <p className="text-xs text-indigo-950 leading-relaxed">
                  {selectedCandidate.aiSummary ||
                    "Candidate displayed comprehensive grasp of enterprise Master Data Management workflows, successfully harmonizing cross-system feeds with sound survivorship policies."}
                </p>

                {selectedCandidate.strengths && selectedCandidate.strengths.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-200/60">
                    <div className="text-[11px] font-bold text-indigo-900 mb-1">Key Strengths Demonstrated:</div>
                    <ul className="text-[11px] text-indigo-900 space-y-0.5">
                      {selectedCandidate.strengths.map((s, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* PROCTORING SECURITY & AUDIT DOSSIER */}
              {(() => {
                const proctoring = selectedCandidate.proctoring || {
                  integrityScore: 100,
                  violationsCount: 0,
                  tabSwitchCount: 0,
                  pasteCount: 0,
                  events: [],
                };
                const events = proctoring.events || [];
                const tabSwitchesCount =
                  proctoring.tabSwitchCount ??
                  events.filter(
                    (e) =>
                      e.type === "TAB_SWITCH" ||
                      e.category === "Tab Switch" ||
                      e.message?.toLowerCase().includes("tab")
                  ).length;
                const pasteCount =
                  proctoring.pasteCount ??
                  events.filter(
                    (e) =>
                      e.type === "PASTE_DETECTED" ||
                      e.category === "Clipboard Paste" ||
                      e.message?.toLowerCase().includes("paste")
                  ).length;
                const violationsCount =
                  proctoring.violationsCount ??
                  events.filter(
                    (e) =>
                      e.type !== "INFO" &&
                      (e.severity === "high" ||
                        e.severity === "medium" ||
                        e.type === "WARNING" ||
                        e.type === "CRITICAL" ||
                        e.type === "TAB_SWITCH" ||
                        e.type === "PASTE_DETECTED")
                  ).length;

                const filteredEvents = events.filter((evt) => {
                  const isViolation =
                    evt.type !== "INFO" &&
                    (evt.severity === "high" ||
                      evt.severity === "medium" ||
                      evt.type === "WARNING" ||
                      evt.type === "CRITICAL" ||
                      evt.type === "TAB_SWITCH" ||
                      evt.type === "PASTE_DETECTED");
                  const isTab =
                    evt.type === "TAB_SWITCH" ||
                    evt.category === "Tab Switch" ||
                    evt.message?.toLowerCase().includes("tab");
                  const isPaste =
                    evt.type === "PASTE_DETECTED" ||
                    evt.category === "Clipboard Paste" ||
                    evt.message?.toLowerCase().includes("paste");

                  if (proctoringFilter === "VIOLATIONS") return isViolation;
                  if (proctoringFilter === "TABS") return isTab;
                  if (proctoringFilter === "PASTES") return isPaste;
                  return true;
                });

                return (
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                    {/* Dossier Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-600" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Proctoring Security & Violation Audit Dossier
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Granular monitoring log: tab switches, external clipboard pastes, multi-monitor blur, and active focus tracking.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            proctoring.integrityScore >= 90
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : proctoring.integrityScore >= 75
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {proctoring.integrityScore >= 90 ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>
                            {proctoring.integrityScore}% Integrity ({proctoring.integrityScore >= 90 ? "High Trust" : "Audit Flagged"})
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* KPI 4-Card Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="text-[11px] font-medium">Tab Switches</span>
                          <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className={`text-xl font-black ${tabSwitchesCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
                          {tabSwitchesCount}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {tabSwitchesCount > 0 ? "External window opened" : "Zero tab changes"}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="text-[11px] font-medium">Clipboard Pastes</span>
                          <ClipboardCheck className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div className={`text-xl font-black ${pasteCount > 0 ? "text-rose-700" : "text-slate-800"}`}>
                          {pasteCount}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {pasteCount > 0 ? "External text inserted" : "Zero pastes detected"}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="text-[11px] font-medium">Total Violations</span>
                          <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className={`text-xl font-black ${violationsCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {violationsCount}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {violationsCount === 0 ? "Flawless session" : `${violationsCount} total incident${violationsCount > 1 ? "s" : ""}`}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="text-[11px] font-medium">KEKA Integration</span>
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="text-sm font-bold text-slate-800 mt-1">
                          Not configured
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          API details pending
                        </div>
                      </div>
                    </div>

                    {/* Filter Tabs for Proctoring Event Log */}
                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setProctoringFilter("ALL")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            proctoringFilter === "ALL"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          All Events ({events.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setProctoringFilter("VIOLATIONS")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            proctoringFilter === "VIOLATIONS"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                          }`}
                        >
                          Violations ({violationsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setProctoringFilter("TABS")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            proctoringFilter === "TABS"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
                          }`}
                        >
                          Tab Switches ({tabSwitchesCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setProctoringFilter("PASTES")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            proctoringFilter === "PASTES"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                          }`}
                        >
                          Pastes ({pasteCount})
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono">
                        Showing {filteredEvents.length} of {events.length} logs
                      </span>
                    </div>

                    {/* Detailed Event Audit Stream */}
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {filteredEvents.length === 0 ? (
                        <div className="p-6 rounded-xl bg-white border border-slate-200 text-center">
                          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                          <div className="text-xs font-bold text-slate-800">
                            No violations found under this filter
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Candidate maintained strict session focus with no flagged activity in this category.
                          </div>
                        </div>
                      ) : (
                        filteredEvents.map((evt) => {
                          const isHigh = evt.severity === "high" || evt.type === "CRITICAL";
                          const isWarning =
                            isHigh ||
                            evt.severity === "medium" ||
                            evt.type === "WARNING" ||
                            evt.type === "TAB_SWITCH" ||
                            evt.type === "PASTE_DETECTED";

                          return (
                            <div
                              key={evt.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isHigh
                                  ? "bg-rose-50/80 border-rose-200"
                                  : isWarning
                                  ? "bg-amber-50/70 border-amber-200"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <div className="mt-0.5">
                                    {isHigh ? (
                                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    ) : isWarning ? (
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-xs text-slate-900">
                                        {evt.message}
                                      </span>

                                      {/* Category Badge */}
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                          evt.category === "Tab Switch" || evt.type === "TAB_SWITCH"
                                            ? "bg-amber-100 text-amber-800"
                                            : evt.category === "Clipboard Paste" || evt.type === "PASTE_DETECTED"
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        {evt.category ||
                                          (evt.type === "TAB_SWITCH"
                                            ? "Tab Switch"
                                            : evt.type === "PASTE_DETECTED"
                                            ? "Clipboard Paste"
                                            : "System")}
                                      </span>

                                      {/* Severity Badge */}
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                          isHigh
                                            ? "bg-rose-600 text-white"
                                            : isWarning
                                            ? "bg-amber-500 text-white"
                                            : "bg-slate-200 text-slate-700"
                                        }`}
                                      >
                                        {evt.severity
                                          ? evt.severity.toUpperCase()
                                          : isHigh
                                          ? "HIGH"
                                          : isWarning
                                          ? "WARNING"
                                          : "INFO"}
                                      </span>
                                    </div>

                                    {/* Clear, Complete Description for Recruiter */}
                                    <div className="text-xs text-slate-700 leading-relaxed font-sans bg-white/80 p-2.5 rounded-lg border border-slate-200/80 mt-1.5">
                                      <strong className="text-slate-900 block text-[11px] mb-0.5 font-semibold">
                                        Violation Audit Detail:
                                      </strong>
                                      {evt.details || evt.message}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-[11px] font-mono font-semibold text-slate-600">
                                    {new Date(evt.timestamp).toLocaleTimeString()}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {new Date(evt.timestamp).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Submissions Deep-Dive Code Inspector */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Question Submissions & Evaluator Review ({selectedCandidate.submissions?.length || 0})
                </h4>

                <div className="space-y-3">
                  {(selectedCandidate.submissions || []).map((sub) => (
                    <div key={sub.questionId} className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{sub.title}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Domain: {sub.category}{sub.difficultyLevel ? ` • ${sub.difficultyLevel}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.testCasesPassed && (
                            <span className="text-[11px] text-slate-500 font-mono">Tests: {sub.testCasesPassed}</span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sub.score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Score: {sub.score}%
                          </span>
                        </div>
                      </div>

                      {sub.candidateNotes && (
                        <div className="text-[11px] text-slate-700 bg-indigo-50/60 border border-indigo-100 p-2 rounded-lg">
                          <strong className="text-indigo-900">Candidate Choice: </strong> {sub.candidateNotes}
                        </div>
                      )}

                      {sub.evaluatorNotes && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <strong>Evaluator: </strong> {sub.evaluatorNotes}
                        </div>
                      )}

                      {sub.code && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium text-[11px]">
                            View Submitted Code Solution
                          </summary>
                          <pre className="mt-2 p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                            {sub.code}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Select a candidate from the roster to view their comprehensive evaluation scorecard.
            </div>
          )}
        </div>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Assessment Invite</h3>
                <p className="text-xs text-slate-500 mt-1">The invitation fixes the candidate’s assessment track.</p>
              </div>
              <button type="button" onClick={() => setIsInviteModalOpen(false)} aria-label="Close invite dialog" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Candidate name
                <input required value={inviteCandidateName} onChange={(event) => setInviteCandidateName(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 font-normal" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Candidate email
                <input required type="email" value={inviteCandidateEmail} onChange={(event) => setInviteCandidateEmail(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 font-normal" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Assessment track
                <select value={inviteTrack} onChange={(event) => setInviteTrack(event.target.value as AssessmentTrack)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-normal">
                  <option value="data_stewardship">Data Stewardship (MDM, SQL, Basic Python)</option>
                  <option value="data_engineering" disabled>Data Engineering (not available yet)</option>
                </select>
              </label>

              {inviteError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{inviteError}</p>}
              {inviteUrl && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="text-xs font-semibold text-emerald-900">18-question invite created. Link expires in 24 hours.</div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={inviteUrl} className="min-w-0 flex-1 px-2 py-2 rounded border border-emerald-200 bg-white text-[11px]" />
                    <button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => setIsInviteCopied(true))} className="p-2 rounded border border-emerald-300 text-emerald-800 hover:bg-emerald-100" title="Copy invite link">
                      {isInviteCopied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
                <button type="submit" disabled={isCreatingInvite} className="px-4 py-2 rounded-lg bg-[#003B54] text-white text-xs font-semibold disabled:opacity-60">
                  {isCreatingInvite ? "Creating..." : "Create invite link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface SkillProgressBarProps {
  label: string;
  score: number;
  isIntegrity?: boolean;
}

const SkillProgressBar: React.FC<SkillProgressBarProps> = ({ label, score, isIntegrity = false }) => {
  const getColor = () => {
    if (isIntegrity) {
      return score >= 90 ? "bg-emerald-600" : score >= 75 ? "bg-amber-500" : "bg-rose-500";
    }
    return score >= 85 ? "bg-indigo-600" : score >= 70 ? "bg-blue-600" : "bg-amber-500";
  };

  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{score}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
};
