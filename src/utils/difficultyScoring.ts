import { DifficultyScorecard, QuestionLevel } from "../types";

export interface DifficultyScoredSubmission {
  difficultyLevel?: QuestionLevel;
  score: number;
  answered?: boolean;
}

export function computeDifficultyScores(submissions: DifficultyScoredSubmission[]): DifficultyScorecard {
  const levels: QuestionLevel[] = ["Basic", "Intermediate", "Advanced"];
  return Object.fromEntries(levels.map((level) => {
    const levelQuestions = submissions.filter((submission) => submission.difficultyLevel === level);
    const answered = levelQuestions.filter((submission) => submission.answered !== false);
    return [level, {
      score: answered.length
        ? Math.round(answered.reduce((total, submission) => total + submission.score, 0) / answered.length)
        : null,
      answered: answered.length,
      total: levelQuestions.length,
    }];
  })) as DifficultyScorecard;
}