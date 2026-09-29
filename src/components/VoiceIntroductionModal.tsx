import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  FileText,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { VoiceIntroduction } from "../types";

interface VoiceIntroductionModalProps {
  candidateName: string;
  isOpen: boolean;
  onSave: (intro: VoiceIntroduction) => void;
  onClose?: () => void;
  existingIntro?: VoiceIntroduction;
}

export const VoiceIntroductionModal: React.FC<VoiceIntroductionModalProps> = ({
  candidateName,
  isOpen,
  onSave,
  onClose,
  existingIntro,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(existingIntro?.transcript || "");
  const [durationSeconds, setDurationSeconds] = useState(existingIntro?.durationSeconds || 0);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingIntro?.audioDataUrl || null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Click the microphone to start explaining about yourself."
  );

  // Audio recording & Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize SpeechRecognition check
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
      setStatusMessage("Web Speech API not detected in this browser. You can type or use sample audio notes below.");
    }
  }, []);

  // Timer effect during recording
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          if (prev >= 120) {
            // Auto stop at 2 minutes
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

  // Clean up media stream when component unmounts
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
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionDenied(false);
    audioChunksRef.current = [];

    // Attempt to access microphone for audio stream
    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Setup MediaRecorder
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
          console.warn("MediaRecorder could not start in current sandbox:", mrErr);
        }
      }
    } catch (err: any) {
      console.warn("Microphone access could not be established:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermissionDenied(true);
      }
    }

    // Setup Web Speech Recognition
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
            setStatusMessage("Microphone permission denied. You can manually enter or edit your introduction.");
          } else {
            setStatusMessage(`Speech service notice (${event.error}). You can continue speaking or edit text.`);
          }
        };

        recognition.onend = () => {
          // If still marked as recording, restart it (browser speech recognition often pauses on silence)
          if (isRecording) {
            try {
              recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (recErr) {
        console.warn("SpeechRecognition init error:", recErr);
        setStatusMessage("Speech-to-text active. Recording audio and accepting candidate transcription notes.");
      }
    } else {
      setStatusMessage("Recording audio. Please summarize your background in the text area below.");
    }

    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setStatusMessage("Recording completed. Review and refine your transcription below before saving.");

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
      setDurationSeconds(35);
    }
    setStatusMessage("Sample voice introduction loaded. You can modify it or record over it.");
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

    const finalTranscript = transcript.trim();
    if (!finalTranscript && !audioUrl) {
      setStatusMessage("No voice introduction was recorded or entered.");
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
        "Professional Experience",
        "MDM & Data Stewardship",
        "Technical Competencies (SQL & Python)",
      ],
    };

    onSave(voiceData);
  };

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Mic className="w-3 h-3" /> Step 1: Voice Introduction
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                Audited by Recruiter
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Welcome, {candidateName}!
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Before proceeding to the technical assessment, please take 30–60 seconds to explain about yourself, your background, and your experience with Master Data Management (MDM), SQL, or Data Engineering.
            </p>
          </div>
        </div>

        {/* Microphone Recording Centerpiece */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center text-center space-y-4 relative">
          {/* Pulsing Mic Button */}
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <>
                <span className="absolute w-24 h-24 rounded-full bg-red-400/20 animate-ping" />
                <span className="absolute w-20 h-20 rounded-full bg-red-500/30 animate-pulse" />
              </>
            )}
            <button
              id="voice-intro-mic-btn"
              type="button"
              onClick={toggleRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md focus:outline-hidden ${
                isRecording
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200 scale-105"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:scale-105 active:scale-95"
              }`}
              title={isRecording ? "Click to stop recording" : "Click to speak your introduction"}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          {/* Recording Status & Live Timer */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              {isRecording ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  Recording Audio & Transcribing Live...
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  {transcript ? "Microphone Paused (Click to resume/speak more)" : "Click the Microphone button to speak"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Duration: <strong className="text-slate-800 font-bold">{formatTime(durationSeconds)}</strong> / 02:00
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                Words: <strong className="text-slate-800 font-bold">{wordCount}</strong>
              </span>
            </div>

            <p className="text-[11px] text-slate-500 italic max-w-md mx-auto pt-1">
              {statusMessage}
            </p>
          </div>

          {/* Audio Playback pill if recording exists */}
          {audioUrl && !isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-xs">
              <Headphones className="w-3.5 h-3.5 text-indigo-600" />
              <span>Voice captured:</span>
              <button
                type="button"
                onClick={toggleAudioPlayback}
                className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause playback
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Listen back ({formatTime(durationSeconds)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Live Transcription Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Live Transcribed Introduction
            </label>
            <span className="text-[11px] text-slate-500">
              Editable — feel free to correct any MDM terms
            </span>
          </div>

          <div className="relative">
            <textarea
              id="voice-intro-transcript-textarea"
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your spoken words will appear here automatically in real time as you talk... You can also edit or refine this text directly."
              className="w-full text-xs md:text-sm text-slate-800 bg-white border border-slate-200 rounded-xl p-3.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all leading-relaxed shadow-xs"
            />
            {transcript && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute bottom-3 right-3 text-[11px] text-slate-400 hover:text-red-600 flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                title="Clear transcript and restart"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Talking Point Suggestions / Quick Fill */}
        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-900">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Suggested Talking Points for your intro:
            </span>
            <span className="text-[10px] text-indigo-600">Quick prompts</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleLoadSample(
                  `Hi, my name is ${candidateName}. I am a Data and MDM Engineer with over 3 years of experience specializing in Master Data Management architectures. I have worked extensively with Reltio and CRM source systems, designing match rules, data stewardship workflows, and survivorship strategies for Customer 360 and HCP registries. On the engineering side, I leverage SQL window functions and Python for deduplication and automated data quality validation.`
                )
              }
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 text-[11px] font-medium border border-indigo-200 transition-colors text-left flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>💼 Load MDM & Data Engineering Self-Pitch</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleLoadSample(
                  `Hello! I'm ${candidateName}. I have a background in enterprise data engineering and data governance. My core strengths are writing high-performance SQL transformations, building defensive Python deduplication pipelines, and managing master data exceptions as a data steward to ensure golden record accuracy.`
                )
              }
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 text-[11px] font-medium border border-indigo-200 transition-colors text-left flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>📊 Load Foundational L1 Profile</span>
            </button>
          </div>
        </div>

        {/* Audit Notice & Modal Footer */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>This audio introduction will be transcribed and included in your recruiter scorecard.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Dismiss
              </button>
            )}
            <button
              id="voice-intro-confirm-btn"
              type="button"
              onClick={handleSaveAndProceed}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-indigo-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-200" />
              <span>Save & Begin Assessment</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
