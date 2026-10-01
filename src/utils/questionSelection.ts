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

const DIFFICULTY_QUOTAS = [
  ["Basic", 3],
  ["Intermediate", 2],
  ["Advanced", 1],
] as const;

function sampleTopicByDifficulty(
  questions: ExamQuestion[],
  countPerTopic: number,
  getRandomIndex: RandomIndex
): ExamQuestion[] {
  if (countPerTopic !== 6) {
    throw new Error("Difficulty-stratified topic samples require exactly six questions.");
  }

  return DIFFICULTY_QUOTAS.flatMap(([difficulty, count]) =>
    sampleWithoutReplacement(
      questions.filter((question) => question.difficulty === difficulty),
      count,
      getRandomIndex
    )
  );
}

export function selectSessionQuestions(
  questions: ExamQuestion[],
  countPerTopic = QUESTIONS_PER_TOPIC,
  getRandomIndex: RandomIndex = randomInt
): ExamQuestion[] {
  const mdmQuestions = questions.filter((question) => question.type === "mdm");
  const sqlQuestions = questions.filter(
    (question): question is ScenarioQuestion | Extract<ExamQuestion, { type: "sql-mcq" }> =>
      question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")
  );
  const pythonQuestions = questions.filter(
    (question): question is ScenarioQuestion =>
      question.type === "scenario" && question.language === "python"
  );
  const selected = [
    ...sampleTopicByDifficulty(mdmQuestions, countPerTopic, getRandomIndex),
    ...sampleTopicByDifficulty(sqlQuestions, countPerTopic, getRandomIndex),
    ...sampleTopicByDifficulty(pythonQuestions, countPerTopic, getRandomIndex),
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
    const sqlPool = questions.filter(
      (question): question is ScenarioQuestion | Extract<ExamQuestion, { type: "sql-mcq" }> =>
        question.type === "sql-mcq" || (question.type === "scenario" && question.language === "sql")
    );
    const pythonQuestions = questions.filter(
      (question): question is ScenarioQuestion =>
        question.type === "scenario" && question.language === "python"
    );
    const dataEngineeringQuestions = questions.filter(
      (question): question is Extract<ExamQuestion, { type: "data-engineering-mcq" }> =>
        question.type === "data-engineering-mcq"
    );
    const selected = [
      ...sampleTopicByDifficulty(sqlPool, countPerTopic, getRandomIndex),
      ...sampleTopicByDifficulty(pythonQuestions, countPerTopic, getRandomIndex),
      ...sampleTopicByDifficulty(dataEngineeringQuestions, countPerTopic, getRandomIndex),
    ];
    if (new Set(selected.map((question) => question.id)).size !== selected.length) {
      throw new Error("Question IDs must be unique across the assessment bank.");
    }
    return selected;
  }

  return selectSessionQuestions(questions, countPerTopic, getRandomIndex);
}