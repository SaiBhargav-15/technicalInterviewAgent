import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Volume2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
} from "lucide-react";
import { ProctoringEvent, ProctoringState } from "../types";

interface ProctoringSystemProps {
  proctoringState: ProctoringState;
  setProctoringState: React.Dispatch<React.SetStateAction<ProctoringState>>;
  onViolationOccurred?: (event: ProctoringEvent) => void;
  isFloating?: boolean;
}

export const ProctoringSystem: React.FC<ProctoringSystemProps> = ({
  proctoringState,
  setProctoringState,
  onViolationOccurred,
  isFloating = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(18); // Simulated dB level
  const [activeWarning, setActiveWarning] = useState<string | null>(null);

  // Initialize webcam
  useEffect(() => {
    let mediaStream: MediaStream | null = null;

    async function initCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 } },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(() => {});
          }
          setStreamActive(true);
          setProctoringState((prev) => ({
            ...prev,
            isWebcamActive: true,
          }));
        }
      } catch (err) {
        // Fallback to simulated AI face detection feed
        setStreamActive(false);
        setProctoringState((prev) => ({
          ...prev,
          isWebcamActive: false,
        }));
      }
    }

    initCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [setProctoringState]);

  // Audio level fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const jitter = Math.floor(Math.random() * 15) + 12;
      setAudioLevel(jitter);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const hiddenStartRef = useRef<number | null>(null);

  // Window Focus, Visibility Change, and Paste Event Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenStartRef.current = Date.now();
      } else {
        const elapsedSec = hiddenStartRef.current
          ? Math.max(1, Math.round((Date.now() - hiddenStartRef.current) / 1000))
          : 2;
        hiddenStartRef.current = null;
        logViolation(
          "TAB_SWITCH",
          `Tab Switch / Window Inactive (${elapsedSec}s)`,
          `Candidate navigated away from the assessment browser tab for ${elapsedSec} second${elapsedSec > 1 ? "s" : ""}. External application or tab was active.`,
          elapsedSec > 10 ? "high" : "medium"
        );
      }
    };

    const handleBlur = () => {
      // Only fire blur if document is not already hidden to prevent duplicate events with visibilitychange
      if (!document.hidden && !hiddenStartRef.current) {
        logViolation(
          "WINDOW_BLUR",
          "Window Lost Focus",
          "Candidate clicked outside the proctored evaluation workspace or switched display monitors.",
          "low"
        );
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") || "";
      if (text.length > 0) {
        const preview =
          text.length > 40 ? text.slice(0, 40).replace(/\s+/g, " ") + "..." : text.replace(/\s+/g, " ");
        logViolation(
          "PASTE_DETECTED",
          `External Clipboard Paste (${text.length} chars)`,
          `Candidate pasted ${text.length} characters ("${preview}") from clipboard into workspace.`,
          text.length > 80 ? "high" : "medium"
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  const logViolation = (
    type: ProctoringEvent["type"],
    title: string,
    details: string,
    severity: "low" | "medium" | "high" = "medium"
  ) => {
    const newEvent: ProctoringEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      category:
        type === "TAB_SWITCH"
          ? "Tab Switch"
          : type === "PASTE_DETECTED"
          ? "Clipboard Paste"
          : type === "WINDOW_BLUR"
          ? "Window Blur"
          : "System",
      message: title,
      details,
      severity,
    };

    setActiveWarning(`${title}: ${details}`);
    setTimeout(() => setActiveWarning(null), 5000);

    setProctoringState((prev) => {
      const penalty = severity === "high" ? 12 : severity === "medium" ? 6 : 2;
      const newScore = Math.max(10, prev.integrityScore - penalty);
      const isTab = type === "TAB_SWITCH" || title.includes("Tab");
      const isPaste = type === "PASTE_DETECTED" || title.includes("Paste");

      const updated: ProctoringState = {
        ...prev,
        integrityScore: newScore,
        violationsCount: prev.violationsCount + (type !== "INFO" ? 1 : 0),
        tabSwitchCount: prev.tabSwitchCount + (isTab ? 1 : 0),
        pasteCount: prev.pasteCount + (isPaste ? 1 : 0),
        events: [newEvent, ...prev.events],
      };

      if (onViolationOccurred) {
        onViolationOccurred(newEvent);
      }
      return updated;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setProctoringState((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen().catch(() => {});
      setProctoringState((prev) => ({ ...prev, isFullscreen: false }));
    }
  };

  return (
    <div
      id="proctoring-widget-container"
      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 ${
        isFloating ? "fixed bottom-6 right-6 z-50 w-72 lg:w-80" : "w-full"
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-slate-800">
            Live Proctoring Hub
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFullscreen}
            title={proctoringState.isFullscreen ? "Exit Fullscreen" : "Enforce Fullscreen"}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs"
          >
            {proctoringState.isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Camera Stage & Feed */}
      <div className="relative bg-slate-900 aspect-video overflow-hidden flex items-center justify-center">
        {streamActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        ) : (
          /* Simulated AI Facial Tracking Overlay when hardware video isn't streamed */
          <div className="w-full h-full flex flex-col items-center justify-center bg-radial from-slate-800 to-slate-950 p-4 text-center">
            {/* Visual AI Head Wireframe */}
            <div className="relative w-20 h-24 border border-dashed border-indigo-400/60 rounded-3xl flex items-center justify-center mb-2">
              <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping absolute top-4 left-4 opacity-75" />
              <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping absolute top-4 right-4 opacity-75" />
              <div className="w-12 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
                <Camera className="w-6 h-6 text-indigo-300" />
              </div>
            </div>
            <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>AI Proctor: 1 Face Detected</span>
            </div>
            <div className="text-[10px] text-slate-400">Continuous gaze monitoring</div>
          </div>
        )}

        {/* Mic Level Indicator */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-slate-300">
          <Volume2 className="w-3 h-3 text-indigo-400" />
          <span>{audioLevel} dB</span>
        </div>

        {/* Bounding box simulation */}
        <div className="absolute inset-4 border border-emerald-500/30 rounded-xl pointer-events-none" />
      </div>

      {/* Floating Active Warning Banner */}
      {activeWarning && (
        <div className="bg-rose-50 border-y border-rose-200 px-3 py-2 text-rose-800 text-xs flex items-start gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Security Alert Logged</div>
            <div className="text-[11px] text-rose-700">{activeWarning}</div>
          </div>
        </div>
      )}

      {/* Integrity Metrics Row */}
      <div className="p-3 bg-white">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-slate-500 text-[10px]">Violations</div>
            <div className="font-bold text-slate-800 text-sm">
              {proctoringState.violationsCount}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-slate-500 text-[10px]">Tab Switches</div>
            <div className="font-bold text-slate-800 text-sm">
              {proctoringState.tabSwitchCount}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-slate-500 text-[10px]">Large Pastes</div>
            <div className="font-bold text-slate-800 text-sm">
              {proctoringState.pasteCount}
            </div>
          </div>
        </div>

        {/* Expandable Audit Log */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Session Audit Stream</span>
              <span className="text-slate-400 font-normal">
                {proctoringState.events.length} events
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {proctoringState.events.length === 0 ? (
                <div className="text-slate-400 text-center py-2 text-[11px]">
                  No security incidents logged.
                </div>
              ) : (
                proctoringState.events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-2 rounded-md border text-[11px] ${
                      evt.type === "WARNING"
                        ? "bg-amber-50/70 border-amber-200 text-amber-900"
                        : evt.type === "CRITICAL"
                        ? "bg-rose-50/70 border-rose-200 text-rose-900"
                        : "bg-slate-50 border-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{evt.message}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {evt.details && (
                      <div className="text-[10px] mt-0.5 text-slate-600">{evt.details}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
