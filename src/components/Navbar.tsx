import React from "react";
import {
  Users,
  Building2,
  Timer,
  UserCheck,
  Briefcase,
  LogOut,
  Maximize2,
  ShieldCheck,
} from "lucide-react";
import { AssessmentTrack, AuthUser, ProctoringState } from "../types";
import { ChryselysLogo } from "./ChryselysLogo";

interface NavbarProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  activeRole: "candidate" | "recruiter";
  activeTab: "candidate" | "recruiter" | "keka";
  setActiveTab: (tab: "candidate" | "recruiter" | "keka") => void;
  timeRemainingSeconds: number;
  proctoringState: ProctoringState;
  candidateName: string;
  assessmentTrack?: AssessmentTrack;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  activeRole,
  activeTab,
  setActiveTab,
  timeRemainingSeconds,
  proctoringState,
  candidateName,
  assessmentTrack,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header
      id="main-app-header"
      className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand Identity with Chryselys Logo */}
        <div className="flex items-center gap-3.5">
          <ChryselysLogo size="md" />

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm md:text-base text-[#003B54] tracking-tight">
                L1 Assessment
              </h1>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                  activeRole === "recruiter"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-blue-50 text-[#003B54] border-blue-200"
                }`}
              >
                {activeRole === "recruiter" ? "RECRUITER PORTAL" : "CANDIDATE EXAM"}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Recruiter Navigation (ONLY visible when logged in as Recruiter) */}
        {activeRole === "recruiter" ? (
          <nav className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              id="nav-recruiter-tab"
              onClick={() => setActiveTab("recruiter")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "recruiter"
                  ? "bg-white text-[#003B54] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Candidate Dossiers</span>
            </button>

            <button
              id="nav-keka-tab"
              onClick={() => setActiveTab("keka")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "keka"
                  ? "bg-white text-[#003B54] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>KEKA Sync</span>
            </button>
          </nav>
        ) : (
          /* When candidate is in exam mode: Show proctored session indicator */
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Proctored Session: <strong className="text-slate-900">{candidateName}</strong>
              {assessmentTrack && (
                <span className="ml-2 text-[10px] uppercase text-slate-500">
                  {assessmentTrack === "data_stewardship" ? "Data Stewardship" : "Data Engineering"}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Right: Timer, Proctoring Badge & User Account / Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Live Exam Timer (Candidate view only: 30 minutes allocation) */}
          {activeRole === "candidate" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200 text-[#003B54] text-xs font-mono font-bold shadow-2xs">
              <Timer className="w-3.5 h-3.5 text-[#D9822B]" />
              <span>{formatTime(timeRemainingSeconds)}</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">/ 30:00</span>
            </div>
          )}

          {/* Full-Screen Proctoring Status Pill */}
          {activeRole === "candidate" && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                proctoringState.isFullscreen
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
              }`}
              title={proctoringState.isFullscreen ? "Browser is in secure full-screen mode" : "Full-screen mode is required"}
            >
              {proctoringState.isFullscreen ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Full-Screen Active</span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      document.documentElement.requestFullscreen().catch(() => {});
                    } catch {}
                  }}
                  className="flex items-center gap-1 text-amber-900 font-bold hover:underline cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Enter Full-Screen</span>
                </button>
              )}
            </div>
          )}

          {/* User Session Info Pill */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                  currentUser.role === "recruiter"
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : "bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                {currentUser.role === "recruiter" ? (
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-[#003B54]" />
                )}
                <span className="max-w-[130px] truncate" title={currentUser.email}>
                  {currentUser.name}
                </span>
              </div>

              {/* Sign Out / Switch Button */}
              <button
                id="sign-out-btn"
                onClick={onLogout}
                className="flex items-center gap-1 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-rose-600 text-xs transition-colors cursor-pointer"
                title="Sign Out / Switch User"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
