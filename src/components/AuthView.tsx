import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Briefcase,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { AuthUser } from "../types";
import { ChryselysLogo } from "./ChryselysLogo";
import { ChryselysFooter } from "./ChryselysFooter";

interface AuthViewProps {
  onLogin: (user: AuthUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<"candidate" | "recruiter">("candidate");

  // Candidate state
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateError, setCandidateError] = useState("");
  const [assessmentInviteId, setAssessmentInviteId] = useState("");
  const [assessmentTrack, setAssessmentTrack] = useState<AuthUser["assessmentTrack"]>();
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  // Recruiter state
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [recruiterError, setRecruiterError] = useState("");
  const [isLoadingRecruiter, setIsLoadingRecruiter] = useState(false);

  // Candidate identity and assessment track are resolved from the server-issued invite.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    const inviteId = params.get("invite");

    if (role === "recruiter") {
      setActiveTab("recruiter");
      const email = params.get("email");
      if (email) setRecruiterEmail(email);
      return;
    }
    if (!inviteId) return;

    setAssessmentInviteId(inviteId);
    setIsLoadingInvite(true);
    fetch(`/api/assessment/invites/${encodeURIComponent(inviteId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "This assessment invitation is unavailable.");
        setCandidateName(data.candidateName);
        setCandidateEmail(data.candidateEmail);
        setAssessmentTrack(data.assessmentTrack);
      })
      .catch((error) => {
        setCandidateError(error instanceof Error ? error.message : "This assessment invitation is unavailable.");
      })
      .finally(() => setIsLoadingInvite(false));
  }, []);

  const handleCandidateContinue = (event: React.FormEvent) => {
    event.preventDefault();
    if (!assessmentInviteId || !assessmentTrack) {
      setCandidateError("Open a valid assessment invitation link to continue.");
      return;
    }

    setCandidateError("");
    onLogin({
      email: candidateEmail,
      name: candidateName,
      role: "candidate",
      loginAt: new Date().toISOString(),
      assessmentTrack,
      assessmentInviteId,
    });
  };

  // Recruiter: Server validates the company domain and exact allowlist.
  const handleRecruiterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = recruiterEmail.trim().toLowerCase();
    if (!/^[^@\s]+@chryselys\.com$/.test(normalizedEmail)) {
      setRecruiterError("Use an approved email address ending in @chryselys.com.");
      return;
    }

    setRecruiterError("");
    setIsLoadingRecruiter(true);
    try {
      const response = await fetch("/api/auth/recruiter-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Recruiter access could not be verified.");
      }
      onLogin(data.user as AuthUser);
    } catch (error) {
      setRecruiterError(error instanceof Error ? error.message : "Recruiter access could not be verified.");
    } finally {
      setIsLoadingRecruiter(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#002838] via-[#003B54] to-[#002230] text-slate-100 flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#D9822B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#0284C7]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6 my-auto px-4 py-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-2.5 px-4 rounded-2xl bg-white shadow-xl border border-white/30 inline-flex items-center">
              <ChryselysLogo size="md" variant="full" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Assessment Portal
            </h1>
            <p className="text-xs text-amber-300/90 font-medium mt-1">
              Master Data Management • SQL & Python L1 Interview (30 Mins)
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/95 text-slate-900 backdrop-blur-md rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Role Segmented Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              id="auth-candidate-tab-btn"
              type="button"
              onClick={() => {
                setActiveTab("candidate");
                setCandidateError("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "candidate"
                  ? "bg-[#003B54] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Candidate Login</span>
            </button>

            <button
              id="auth-recruiter-tab-btn"
              type="button"
              onClick={() => {
                setActiveTab("recruiter");
                setRecruiterError("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "recruiter"
                  ? "bg-[#003B54] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Recruiter Portal</span>
            </button>
          </div>

          {/* TAB 1: CANDIDATE INVITE LOGIN */}
          {activeTab === "candidate" && (
            <div className="space-y-4">
              <form onSubmit={handleCandidateContinue} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Name</label>
                  <input
                    id="candidate-name-input"
                    type="text"
                    value={candidateName}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    id="candidate-email-input"
                    type="email"
                    value={candidateEmail}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-xs"
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  {isLoadingInvite
                    ? "Loading invitation..."
                    : assessmentInviteId && assessmentTrack
                    ? `This ${assessmentTrack === "data_stewardship" ? "Data Stewardship" : "Data Engineering"} invitation expires 24 hours after it was issued.`
                    : "Open the assessment invitation link sent by your recruiter."}
                </p>

                {candidateError && (
                  <div role="alert" className="flex items-center gap-1.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{candidateError}</span>
                  </div>
                )}

                <button
                  id="candidate-invite-continue-btn"
                  type="submit"
                  disabled={isLoadingInvite || !assessmentInviteId || !assessmentTrack}
                  className="w-full py-3 rounded-xl bg-[#003B54] hover:bg-[#002D40] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isLoadingInvite ? "Loading Invitation..." : "Continue"}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: RECRUITER LOGIN (NO PASSWORD REQUIRED) */}
          {activeTab === "recruiter" && (
            <div className="space-y-4">
              <form onSubmit={handleRecruiterLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email
                  </label>
                  <input
                    id="recruiter-email-input"
                    type="email"
                    value={recruiterEmail}
                    onChange={(e) => {
                      setRecruiterEmail(e.target.value);
                      setRecruiterError("");
                    }}
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-[#003B54]"
                  />
                </div>

                {recruiterError && (
                  <div className="flex items-center gap-1.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{recruiterError}</span>
                  </div>
                )}

                <button
                  id="recruiter-login-btn"
                  type="submit"
                  disabled={isLoadingRecruiter}
                  className="w-full py-3 rounded-xl bg-[#003B54] hover:bg-[#002D40] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-amber-300" />
                  <span>{isLoadingRecruiter ? "Verifying Access..." : "Enter Recruiter Portal"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-300/80">
          Proctored Assessment Environment • ISO/IEC 27001 & SOC-2 Compliant
        </div>
      </div>

      {/* Chryselys Footer */}
      <ChryselysFooter className="bg-white/95" />
    </div>
  );
};
