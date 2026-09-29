import { ExamQuestion, ScenarioQuestion } from "../types";
import { MDM_QUESTIONS } from "./mdmQuestions";
import { SQL_QUESTIONS } from "./sqlQuestions";
import { PYTHON_QUESTIONS } from "./pythonQuestions";

export { MDM_QUESTIONS, PYTHON_QUESTIONS, SQL_QUESTIONS };

export const SCENARIO_QUESTIONS: ScenarioQuestion[] = [
  ...SQL_QUESTIONS,
  ...PYTHON_QUESTIONS,
];

export const ALL_EXAM_QUESTIONS: ExamQuestion[] = [
  ...MDM_QUESTIONS,
  ...SCENARIO_QUESTIONS,
];
