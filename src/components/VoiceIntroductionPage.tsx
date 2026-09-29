import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Clock,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Headphones,
  Check,
  Volume2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { VoiceIntroduction } from "../types";
import { ChryselysLogo } from "./ChryselysLogo";

interface VoiceIntroductionPageProps {
  candidateName: string;
  candidateEmail: string;
  existingIntro?: VoiceIntroduction | null;
  isStartingAssessment?: boolean;
  onComplete: (intro: VoiceIntroduction) => void;
  onSkip?: () => void;
}

export const VoiceIntroductionPage: React.FC<VoiceIntroductionPageProps> = ({
  candidateName,
  candidateEmail,
  existingIntro,
  isStartingAssessment = false,
  onComplete,
  onSkip,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(existingIntro?.transcript || "");
  const [durationSeconds, setDurationSeconds] = useState(existingIntro?.durationSeconds || 0);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingIntro?.audioDataUrl || null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Click the microphone to start recording your voice introduction."
  );

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize SpeechRecognition support check
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
      setStatusMessage("Web Speech API not detected in this browser. You can type your introduction or load a sample pitch below.");
    }
  }, []);

  // Timer effect during recording
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Clean up media streams
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionDenied(false);
    audioChunksRef.current = [];

    // Attempt audio capture via MediaDevices
    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        try {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          mediaRecorder.onstop = () => {
            if (audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
              const url = URL.createObjectURL(audioBlob);
              setAudioUrl(url);
            }
          };
          mediaRecorder.start(250);
        } catch (mrErr) {
          console.warn("MediaRecorder unavailable:", mrErr);
        }
      }
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermissionDenied(true);
      }
    }

    // Setup Web Speech Recognition for live text conversion
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        let currentSessionTranscript = transcript ? transcript + " " : "";

        recognition.onstart = () => {
          setStatusMessage("Listening... Speak clearly into your microphone.");
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript) {
            currentSessionTranscript += finalTranscript + " ";
          }
          setTranscript((currentSessionTranscript + interimTranscript).trim());
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setMicPermissionDenied(true);
            setStatusMessage("Microphone permission denied. You can manually enter or edit your introduction below.");
          } else {
            setStatusMessage(`Speech recognition notice (${event.error}). You can continue speaking or edit the text.`);
          }
        };

        recognition.onend = () => {
          if (isRecording) {
            try {
              recognition.start();
            } catch {
              // Ignore
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (recErr) {
        console.warn("SpeechRecognition init error:", recErr);
        setStatusMessage("Recording audio. Please review and type your transcription below.");
      }
    } else {
      setStatusMessage("Recording audio. Please enter your introduction details below.");
    }

    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setStatusMessage("Recording finished. Review and edit your transcript below before starting the assessment.");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClear = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscript("");
    setDurationSeconds(0);
    setAudioUrl(null);
    setStatusMessage("Cleared. Click the microphone to record a fresh introduction.");
  };

  const handleLoadSample = (sampleText: string) => {
    setTranscript(sampleText);
    if (durationSeconds === 0) {
      setDurationSeconds(42);
    }
    setStatusMessage("Sample voice introduction loaded. You can modify it or speak over it.");
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audioPlayerRef.current = audio;
    }

    if (audioPlayerRef.current) {
      if (isPlayingAudio) {
        audioPlayerRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleSaveAndProceed = () => {
    if (isRecording) {
      stopRecording();
    }

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignored
    }

    const finalTranscript = transcript.trim();
    if (!finalTranscript && !audioUrl) {
      setStatusMessage("Voice introduction skipped. No introduction was saved.");
      onSkip?.();
      return;
    }
    const words = finalTranscript.split(/\s+/).filter(Boolean);

    const voiceData: VoiceIntroduction = {
      transcript: finalTranscript,
      durationSeconds,
      recordedAt: new Date().toISOString(),
      wordCount: words.length,
      audioRecorded: !!audioUrl,
      audioDataUrl: audioUrl || undefined,
      topicsCovered: [
        "Professional Background",
        "Work Experience and Key Skill Sets",
        "Current Project, Roles, and Responsibilities",
      ],
    };

    onComplete(voiceData);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div id="voice-introduction-page" className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb & Step Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003B54] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#D9822B] uppercase tracking-wider">
                Step 1 of 2
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-800">
                Candidate Voice Introduction
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            Interview Duration: 30 Mins Total
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Welcome Header */}
        <div className="space-y-2 border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#003B54] text-xs font-bold uppercase tracking-wider">
            <Mic className="w-3.5 h-3.5 text-[#003B54]" />
            <span>Oral Verification & Self Introduction</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome, <span className="text-[#003B54]">{candidateName}</span>!
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Please take <strong>1 to 2 minutes</strong> to introduce yourself. Tell us about your <strong>professional background, work experience, key skill sets, and a brief overview of your current project, including your roles and responsibilities.</strong>
          </p>
        </div>

        {/* Central Audio Recording Studio */}
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center text-center space-y-5 relative shadow-inner">
          {/* Big Mic Button with Pulsing Wave */}
          <div className="relative flex items-center justify-center my-2">
            {isRecording && (
              <>
                <span className="absolute w-28 h-28 rounded-full bg-red-400/25 animate-ping" />
                <span className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-pulse" />
              </>
            )}
            <button
              id="voice-page-mic-button"
              type="button"
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-hidden cursor-pointer ${
                isRecording
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-red-300 scale-105"
                  : "bg-[#003B54] text-white hover:bg-[#002D40] shadow-blue-200 hover:scale-105 active:scale-95"
              }`}
              title={isRecording ? "Click to stop recording" : "Click to start recording voice"}
            >
              {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </button>
          </div>

          {/* Recording Status & Live Metrics */}
          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2">
              {isRecording ? (
                <span className="flex items-center gap-2 text-sm font-bold text-red-600 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  Recording Audio & Transcribing in Real Time...
                </span>
              ) : (
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-[#003B54]" />
                  {transcript ? "Microphone Paused (Click to speak more or edit text)" : "Click the Microphone button to start speaking"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-mono pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Duration: <strong className="text-slate-800 font-bold">{formatTime(durationSeconds)}</strong> / 02:00
              </span>
            </div>

            <p className="text-xs text-slate-500 italic pt-1">
              {statusMessage}
            </p>
          </div>

          {/* Audio Playback Pill */}
          {audioUrl && !isRecording && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-sm animate-in fade-in">
              <Headphones className="w-4 h-4 text-[#003B54]" />
              <span>Voice recorded:</span>
              <button
                type="button"
                onClick={toggleAudioPlayback}
                className="flex items-center gap-1.5 font-bold text-[#003B54] hover:text-[#D9822B] transition-colors cursor-pointer"
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause Audio
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Listen Back ({formatTime(durationSeconds)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Live Transcription Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D9822B]" />
              <span>Live Transcribed Introduction</span>
            </label>
            <span className="text-xs text-slate-500">
              Editable transcript
            </span>
          </div>

          <div className="relative">
            <textarea
              id="voice-page-transcript-input"
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-800 bg-white border border-slate-300 rounded-2xl p-4 focus:outline-hidden focus:ring-2 focus:ring-[#003B54]/20 focus:border-[#003B54] transition-all leading-relaxed shadow-xs"
            />
            {transcript && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute bottom-3 right-3 text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
                title="Clear transcript and restart"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Sample Pitch Templates & Guide */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#003B54]" />
              Need inspiration? Click a sample pitch to customize:
            </span>
            <span className="text-[11px] text-[#D9822B] font-semibold">Quick Starters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                handleLoadSample(
                  `Hi, I'm ${candidateName}. I am a Data and MDM Engineer with over 2.5 years of experience in enterprise master data management. I specialize in designing deterministic and probabilistic match rules, data stewardship exception queues, and attribute-level survivorship strategies. In my day-to-day engineering work, I write SQL window functions for deduplication and defensive Python scripts for data quality and string standardization.`
                )
              }
              className="p-3 rounded-xl bg-white hover:bg-blue-50/60 text-slate-700 text-xs font-medium border border-slate-200 hover:border-blue-300 transition-all text-left flex items-start gap-2 shadow-2xs cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#003B54] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                1
              </div>
              <div>
                <strong className="block text-slate-900 text-xs mb-0.5">MDM & Match/Merge Specialist</strong>
                <span className="text-[11px] text-slate-500 leading-snug block">
                  Highlights data stewardship, survivorship, SQL deduplication, and Python normalization.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handleLoadSample(
                  `Hello! My name is ${candidateName}. I have a solid background in data governance and analytical engineering. My focus is ensuring high integrity across customer and healthcare provider golden records. I am proficient in SQL aggregations, ranking, and writing clean, modular Python functions to handle missing attributes and format variations.`
                )
              }
              className="p-3 rounded-xl bg-white hover:bg-amber-50/60 text-slate-700 text-xs font-medium border border-slate-200 hover:border-amber-300 transition-all text-left flex items-start gap-2 shadow-2xs cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-[#D9822B] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                2
              </div>
              <div>
                <strong className="block text-slate-900 text-xs mb-0.5">Analytical & Governance Engineer</strong>
                <span className="text-[11px] text-slate-500 leading-snug block">
                  Emphasizes golden record integrity, SQL analytical queries, and defensive programming.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons & Bottom Notice */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Your voice introduction will be recorded and attached to your recruiter scorecard.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onSkip && (
              <button
                type="button"
                onClick={() => {
                  try {
                    if (document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  } catch {
                    // Ignored
                  }
                  onSkip();
                }}
                className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Skip Voice Intro
              </button>
            )}

            <button
              id="voice-page-start-assessment-btn"
              type="button"
              disabled={isStartingAssessment}
              onClick={handleSaveAndProceed}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-[#003B54] hover:bg-[#002D40] disabled:opacity-60 disabled:cursor-wait text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isStartingAssessment ? "Starting Assessment..." : "Save & Begin 30-Min Assessment"}</span>
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
