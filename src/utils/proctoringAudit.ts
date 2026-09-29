import type { ProctoringEvent } from "../types";

export interface ProctoringAudit {
  integrityScore: number;
  violationsCount: number;
  tabSwitchCount: number;
  pasteCount: number;
  faceLossCount: number;
  events: ProctoringEvent[];
}

const severityPenalties = {
  low: 2,
  medium: 6,
  high: 12,
} as const;

function isProctoringEvent(value: unknown): value is ProctoringEvent {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof value.type === "string" &&
      "message" in value &&
      typeof value.message === "string"
  );
}

export function calculateProctoringAudit(input: unknown): ProctoringAudit {
  const submittedEvents =
    input && typeof input === "object" && "events" in input && Array.isArray(input.events)
      ? input.events
      : [];
  const events = submittedEvents.filter(isProctoringEvent);
  const violations = events.filter((event) => event.type !== "INFO");
  const penalty = violations.reduce((total, event) => {
    if (event.type === "FULLSCREEN_EXIT") return total + 10;
    if (event.type === "PASTE_DETECTED") return total + (event.severity === "high" ? 10 : 5);
    const severity = event.severity && event.severity in severityPenalties ? event.severity : "medium";
    return total + severityPenalties[severity as keyof typeof severityPenalties];
  }, 0);

  return {
    integrityScore: Math.max(0, 100 - penalty),
    violationsCount: violations.length,
    tabSwitchCount: events.filter((event) => event.type === "TAB_SWITCH").length,
    pasteCount: events.filter((event) => event.type === "PASTE_DETECTED").length,
    faceLossCount: events.filter((event) => event.type === "WEBCAM_LOST").length,
    events,
  };
}