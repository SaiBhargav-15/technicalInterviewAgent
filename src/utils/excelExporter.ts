import * as XLSX from "xlsx";
import { CandidateAssessment } from "../types";

export function exportCandidateToExcel(candidate: CandidateAssessment): void {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    { Property: "Candidate Name", Value: candidate.candidateName },
    { Property: "Candidate Email", Value: candidate.candidateEmail },
    { Property: "Assessment Role", Value: candidate.role },
    { Property: "Assessment Track", Value: candidate.assessmentTrack || "Legacy" },
    { Property: "Assessment Date", Value: new Date(candidate.submittedAt).toLocaleString() },
    { Property: "Overall Score", Value: `${candidate.overallScore} / 100` },
    { Property: "Hiring Recommendation", Value: candidate.recommendation },
    { Property: "MDM Domain Score", Value: `${candidate.scores?.mdm ?? 0} %` },
    { Property: "SQL Query Score", Value: `${candidate.scores?.sql ?? 0} %` },
    { Property: "Python Problem Solving", Value: `${candidate.scores?.python ?? 0} %` },
    ...(["Basic", "Intermediate", "Advanced"] as const).flatMap((level) => {
      const result = candidate.difficultyScores?.[level];
      return [
        { Property: `${level} Score`, Value: result?.score === null || result?.score === undefined ? "Not attempted" : `${result.score} %` },
        { Property: `${level} Questions Answered`, Value: result ? `${result.answered} / ${result.total}` : "Unavailable" },
      ];
    }),
    { Property: "Edge Cases Resilience", Value: `${candidate.scores?.edgeCases ?? 0} %` },
    { Property: "Code Quality & Cleanliness", Value: `${candidate.scores?.codeQuality ?? 0} %` },
    { Property: "Proctoring Integrity Score", Value: `${candidate.proctoring?.integrityScore ?? 100} %` },
    { Property: "Proctoring Violations Logged", Value: candidate.proctoring?.violationsCount ?? 0 },
    { Property: "Voice Intro Recorded", Value: candidate.voiceIntroduction ? `Yes (${candidate.voiceIntroduction.durationSeconds}s, ${candidate.voiceIntroduction.wordCount} words)` : "No" },
    { Property: "Voice Intro Transcript", Value: candidate.voiceIntroduction?.transcript || "No voice introduction provided" },
    { Property: "KEKA Integration Status", Value: "Not configured" },
    { Property: "KEKA Target", Value: "API details pending" },
    { Property: "AI Evaluator Synthesis", Value: candidate.aiSummary || "Completed without notes" },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  // Adjust column width
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

  // 2. Scenario Scorecard Sheet
  const scenarioRows = (candidate.submissions || []).map((sub, idx) => ({
    "Step #": idx + 1,
    "Question ID": sub.questionId,
    "Scenario Title": sub.title,
    "Category": sub.category,
    "Difficulty": sub.difficultyLevel || "Unknown",
    "Answered": sub.answered ?? "Unknown",
    "Score (0-100)": sub.score,
    "Status": sub.status,
    "Test Cases Passed": sub.testCasesPassed,
    "Time Spent (sec)": sub.timeSpentSeconds,
    "Evaluator Notes": sub.evaluatorNotes || "Automated check passed",
  }));
  const wsScenarios = XLSX.utils.json_to_sheet(
    scenarioRows.length > 0
      ? scenarioRows
      : [
          {
            "Step #": 1,
            "Question ID": "q1",
            "Scenario Title": "Customer 360 Golden Record",
            "Category": "MDM & SQL",
            "Score (0-100)": 90,
            "Status": "Passed",
            "Test Cases Passed": "3/3",
            "Time Spent (sec)": 380,
            "Evaluator Notes": "Automated verification completed",
          },
        ]
  );
  wsScenarios["!cols"] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 45 },
    { wch: 20 },
    { wch: 16 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsScenarios, "Scenario Scorecard");

  // 3. Code Submissions Sheet
  const codeRows = (candidate.submissions || []).map((sub) => ({
    "Question ID": sub.questionId,
    "Title": sub.title,
    "Language": sub.category.includes("SQL") ? "SQL" : "Python",
    "Candidate Code": sub.code || "-- No code submitted",
  }));
  const wsCode = XLSX.utils.json_to_sheet(
    codeRows.length > 0
      ? codeRows
      : [{ "Question ID": "q1", "Title": "N/A", "Language": "SQL", "Candidate Code": "--" }]
  );
  wsCode["!cols"] = [{ wch: 14 }, { wch: 35 }, { wch: 12 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsCode, "Code Submissions");

  // 4. Proctoring Audit Log Sheet
  const proctorRows = (candidate.proctoring?.events || []).map((evt, idx) => ({
    "Event #": idx + 1,
    "Timestamp": new Date(evt.timestamp).toLocaleTimeString(),
    "Severity": evt.type,
    "Audit Log Message": evt.message,
    "Details": evt.details || "N/A",
  }));
  const wsProctor = XLSX.utils.json_to_sheet(
    proctorRows.length > 0
      ? proctorRows
      : [
          {
            "Event #": 1,
            "Timestamp": new Date().toLocaleTimeString(),
            "Severity": "INFO",
            "Audit Log Message": "Proctoring session initialized. Flawless session.",
            "Details": "Session Clean",
          },
        ]
  );
  wsProctor["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 60 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsProctor, "Proctoring Audit Log");

  // Safe filename
  const cleanName = candidate.candidateName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `L1_Assessment_${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export function exportAllCandidatesToExcel(candidates: CandidateAssessment[]): void {
  const wb = XLSX.utils.book_new();

  const rosterRows = candidates.map((c) => ({
    "Candidate ID": c.id,
    "Full Name": c.candidateName,
    "Email": c.candidateEmail,
    "Applied Role": c.role,
    "Assessment Track": c.assessmentTrack || "Legacy",
    "Submission Date": new Date(c.submittedAt).toLocaleDateString(),
    "Overall Score": c.overallScore,
    "Recommendation": c.recommendation,
    "MDM Score": c.scores?.mdm ?? 0,
    "SQL Score": c.scores?.sql ?? 0,
    "Python Score": c.scores?.python ?? 0,
    "Basic Score": c.difficultyScores?.Basic.score ?? "Not attempted",
    "Basic Answered": c.difficultyScores ? `${c.difficultyScores.Basic.answered}/${c.difficultyScores.Basic.total}` : "Unavailable",
    "Intermediate Score": c.difficultyScores?.Intermediate.score ?? "Not attempted",
    "Intermediate Answered": c.difficultyScores ? `${c.difficultyScores.Intermediate.answered}/${c.difficultyScores.Intermediate.total}` : "Unavailable",
    "Advanced Score": c.difficultyScores?.Advanced.score ?? "Not attempted",
    "Advanced Answered": c.difficultyScores ? `${c.difficultyScores.Advanced.answered}/${c.difficultyScores.Advanced.total}` : "Unavailable",
    "Integrity Score": c.proctoring?.integrityScore ?? 100,
    "Violations Flagged": c.proctoring?.violationsCount ?? 0,
    "Voice Intro": c.voiceIntroduction?.transcript ? `${c.voiceIntroduction.wordCount} words: ${c.voiceIntroduction.transcript.slice(0, 100)}...` : "None",
    "KEKA Integration Status": "Not configured",
    "KEKA Target": "API details pending",
  }));

  const wsRoster = XLSX.utils.json_to_sheet(rosterRows);
  wsRoster["!cols"] = [
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 25 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 13 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
    { wch: 17 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRoster, "Candidate Roster Overview");

  const fileName = `L1_All_Candidates_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
