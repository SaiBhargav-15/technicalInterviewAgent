import { randomInt } from "node:crypto";
import { AssessmentTrack, ExamQuestion, ScenarioQuestion } from "../types";

export const QUESTIONS_PER_TOPIC = 6;

type RandomIndex = (max: number) => number;

function sampleWithoutReplacement<T>(
  items: T[],
  count: number,
  getRandomIndex: RandomIndex
): T[] {
  if (items.length < count) {
    throw new Error(`Question pool has ${items.length} items; ${count} are required.`);
  }

  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

export function selectSessionQuestions(
  questions: ExamQuestion[],
  countPerTopic = QUESTIONS_PER_TOPIC,
  getRandomIndex: RandomIndex = randomInt
): ExamQuestion[] {
  const mdmQuestions = questions.filter((question) => question.type === "mdm");
  const sqlQuestions = questions.filter(
    (question): question is ScenarioQuestion =>
      question.type === "scenario" && question.language === "sql"
  );
  const pythonQuestions = questions.filter(
    (question): question is ScenarioQuestion =>
      question.type === "scenario" && question.language === "python"
  );

  const selected = [
    ...sampleWithoutReplacement(mdmQuestions, countPerTopic, getRandomIndex),
    ...sampleWithoutReplacement(sqlQuestions, countPerTopic, getRandomIndex),
    ...sampleWithoutReplacement(pythonQuestions, countPerTopic, getRandomIndex),
  ];

  if (new Set(selected.map((question) => question.id)).size !== selected.length) {
    throw new Error("Question IDs must be unique across the assessment bank.");
  }

  return selected;
}

export function selectQuestionsForTrack(
  questions: ExamQuestion[],
  track: AssessmentTrack,
  countPerTopic = QUESTIONS_PER_TOPIC,
  getRandomIndex: RandomIndex = randomInt
): ExamQuestion[] {
  if (track === "data_engineering") {
    throw new Error("Data Engineering assessments are unavailable until the third topic question bank is added.");
  }

  return selectSessionQuestions(questions, countPerTopic, getRandomIndex);
}