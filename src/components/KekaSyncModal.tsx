import React, { useState } from "react";
import { Building2, Check, ClipboardCopy, Code, LockKeyhole, X } from "lucide-react";
import { CandidateAssessment } from "../types";

interface KekaSyncModalProps {
  candidate: CandidateAssessment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const KekaSyncModal: React.FC<KekaSyncModalProps> = ({ candidate, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const payload = candidate
    ? {
        event: "assessment.completed",
        systemTarget: "KEKA",
        candidate: {
          externalId: candidate.id,
          name: candidate.candidateName,
          email: candidate.candidateEmail,
          appliedRole: candidate.role,
        },
        assessment: {
          assessmentType: "L1_TECHNICAL_MDM_SQL_PYTHON",
          overallScore: candidate.overallScore,
          recommendation: candidate.recommendation,
          scorecard: candidate.scores,
          proctoringAudit: {
            integrityScore: candidate.proctoring?.integrityScore,
            violationsCount: candidate.proctoring?.violationsCount,
          },
          evaluationNotes: candidate.aiSummary,
        },
      }
    : null;

  const handleCopy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">KEKA Sync</h3>
              <p className="text-xs text-slate-500">Candidate assessment payload preview</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close KEKA sync preview"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950">
          <LockKeyhole className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold">KEKA API integration is pending</div>
            <p className="text-xs mt-1 text-amber-900">
              Sync is unavailable until the KEKA API details and field mapping are provided.
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-600" />
              KEKA payload preview
            </h4>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!payload}
              className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy payload"}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl overflow-auto max-h-80">
            {payload ? JSON.stringify(payload, null, 2) : "Select a candidate to preview the payload."}
          </pre>
        </section>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            disabled
            title="KEKA API integration is not configured yet"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold opacity-50 cursor-not-allowed"
          >
            Sync to KEKA
          </button>
        </div>
      </div>
    </div>
  );
};