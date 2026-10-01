import React from "react";
import { Printer, CheckCircle2, ArrowLeft, Mic, Clock, FileText } from "lucide-react";
import { CandidateAssessment } from "../types";
import { ChryselysLogo } from "./ChryselysLogo";
import { ChryselysFooter } from "./ChryselysFooter";

interface PrintableReportProps {
  candidate: CandidateAssessment;
  onBack: () => void;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  candidate,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 print:p-0 print:bg-white flex flex-col justify-between">
      <div>
        {/* Top Floating Print Controller (Hidden in Print) */}
        <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#003B54] hover:bg-[#002D40] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>

        {/* Printable Sheet */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-8 sm:p-12 print:shadow-none print:border-none print:p-0 space-y-8">
          {/* Company & Assessment Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="space-y-2">
              <ChryselysLogo size="md" />
              <h1 className="text-xl font-extrabold text-[#003B54] tracking-tight">
                Candidate Evaluation Dossier • L1 Assessment
              </h1>
              <div className="text-xs text-slate-500">
                Master Data Management, SQL & Python • Generated: {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-[#003B54]">
                {candidate.overallScore}%
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#D9822B]">
                Recommendation: {candidate.recommendation}
              </div>
            </div>
          </div>

        {/* Candidate Profile Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Candidate Name</div>
            <div className="font-bold text-slate-900 mt-0.5">{candidate.candidateName}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Email Address</div>
            <div className="font-semibold text-slate-800 mt-0.5">{candidate.candidateEmail}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Target Role</div>
            <div className="font-semibold text-slate-800 mt-0.5">{candidate.role}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Evaluation Date</div>
            <div className="font-semibold text-slate-800 mt-0.5">
              {new Date(candidate.submittedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Candidate Voice Introduction (Audio Transcript) */}
        {candidate.voiceIntroduction && (
          <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Mic className="w-4 h-4 text-indigo-600" />
                <span>Candidate Voice Self-Introduction (Transcribed Audio)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {candidate.voiceIntroduction.durationSeconds}s duration
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  {candidate.voiceIntroduction.wordCount} words
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-800 italic leading-relaxed bg-white/80 p-3 rounded-lg border border-indigo-100">
              "{candidate.voiceIntroduction.transcript}"
            </p>
          </div>
        )}

        {/* Skill Rubric Breakdown Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            1. Core Competency Assessment Matrix
          </h3>
          <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Competency Area</th>
                <th className="p-3">Weight</th>
                <th className="p-3">Score</th>
                <th className="p-3">Benchmark Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {candidate.assessmentTrack !== "data_engineering" && (
                <tr>
                  <td className="p-3 font-semibold text-slate-900">
                    Master Data Management (Survivorship & Golden Record)
                  </td>
                  <td className="p-3">35%</td>
                  <td className="p-3 font-bold text-indigo-700">{candidate.scores?.mdm ?? 0}%</td>
                  <td className="p-3 font-medium text-emerald-700">Meets L1 Senior Standard</td>
                </tr>
              )}
              <tr>
                <td className="p-3 font-semibold text-slate-900">
                  SQL Window Functions, SCD Type 2 & Deduplication
                </td>
                <td className="p-3">{candidate.assessmentTrack === "data_engineering" ? "30%" : "25%"}</td>
                <td className="p-3 font-bold text-indigo-700">{candidate.scores?.sql ?? 0}%</td>
                <td className="p-3 font-medium text-emerald-700">Proficient Query Syntax</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">
                  Python Data Cleansing, Fuzzy Matching & Anomaly Rules
                </td>
                <td className="p-3">{candidate.assessmentTrack === "data_engineering" ? "30%" : "20%"}</td>
                <td className="p-3 font-bold text-indigo-700">{candidate.scores?.python ?? 0}%</td>
                <td className="p-3 font-medium text-emerald-700">Strong Problem Solving</td>
              </tr>
              {candidate.assessmentTrack === "data_engineering" && (
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Data Engineering Fundamentals</td>
                  <td className="p-3">30%</td>
                  <td className="p-3 font-bold text-indigo-700">{candidate.scores?.dataEngineering ?? 0}%</td>
                  <td className="p-3 font-medium text-slate-700">MCQ Fundamentals</td>
                </tr>
              )}
              <tr>
                <td className="p-3 font-semibold text-slate-900">
                  Edge Case Handling & Defensive Validation
                </td>
                <td className="p-3">{candidate.assessmentTrack === "data_engineering" ? "5%" : "10%"}</td>
                <td className="p-3 font-bold text-indigo-700">{candidate.scores?.edgeCases ?? 0}%</td>
                <td className="p-3 font-medium text-slate-700">Standard Null Handling</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Code Quality & Clean Architecture</td>
                <td className="p-3">{candidate.assessmentTrack === "data_engineering" ? "5%" : "10%"}</td>
                <td className="p-3 font-bold text-indigo-700">{candidate.scores?.codeQuality ?? 0}%</td>
                <td className="p-3 font-medium text-slate-700">Defensive Implementation</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">
                  Proctoring Exam Integrity Factor
                </td>
                <td className="p-3">Multiplier</td>
                <td className="p-3 font-bold text-emerald-700">
                  {candidate.proctoring?.integrityScore ?? 100}%
                </td>
                <td className="p-3 font-medium text-emerald-700">
                  {(candidate.proctoring?.integrityScore ?? 100) >= 90
                    ? "Verified Secure"
                    : "Review Recommended"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {candidate.difficultyScores && (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Difficulty-Level Results
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Level</th>
                  <th className="p-3">Average Score</th>
                  <th className="p-3">Questions Answered</th>
                  <th className="p-3">Questions Selected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(["Basic", "Intermediate", "Advanced"] as const).map((level) => {
                  const result = candidate.difficultyScores![level];
                  return (
                    <tr key={level}>
                      <td className="p-3 font-semibold">{level}</td>
                      <td className="p-3">{result.score === null ? "Not attempted" : `${result.score}%`}</td>
                      <td className="p-3">{result.answered}</td>
                      <td className="p-3">{result.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* AI Qualitative Synthesis */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            2. AI Evaluator Summary & Recruiter Notes
          </h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800">
            {candidate.aiSummary}
          </div>
        </div>

        {/* Proctoring Audit Summary */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            3. Exam Integrity & Proctoring Audit Summary
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px]">Session Integrity</span>
              <div className="text-base font-bold text-emerald-700 mt-0.5">
                {candidate.proctoring?.integrityScore ?? 100}%
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px]">Security Incidents</span>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {candidate.proctoring?.violationsCount ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px]">KEKA Integration Status</span>
              <div className="text-base font-bold text-indigo-700 mt-0.5">
                Not configured
              </div>
            </div>
          </div>
        </div>

        {/* Recruiter Signature & Final Decision Sign-off */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="text-slate-500 font-medium">Lead Technical Interviewer Signature:</div>
            <div className="mt-8 border-b border-slate-300 w-48" />
            <div className="mt-1 text-[11px] text-slate-600">Date: _______________</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">Hiring Committee Approval:</div>
            <div className="mt-8 border-b border-slate-300 w-48" />
            <div className="mt-1 text-[11px] text-slate-600">Status: Approved for Offer</div>
          </div>
        </div>
      </div>
      </div>

      <div className="print:hidden mt-8">
        <ChryselysFooter />
      </div>
    </div>
  );
};
