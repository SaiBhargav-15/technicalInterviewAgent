import { ExamQuestion, ScenarioQuestion } from "../types";
import { MDM_QUESTIONS } from "./mdmQuestions";
import { SQL_QUESTIONS } from "./sqlQuestions";
import { PYTHON_QUESTIONS } from "./pythonQuestions";
import { DATA_ENGINEERING_QUESTIONS } from "./dataEngineeringQuestions";

export { DATA_ENGINEERING_QUESTIONS, MDM_QUESTIONS, PYTHON_QUESTIONS, SQL_QUESTIONS };

export const SCENARIO_QUESTIONS: ScenarioQuestion[] = [
  ...SQL_QUESTIONS.filter((question): question is ScenarioQuestion => question.type === "scenario"),
  ...PYTHON_QUESTIONS,
];

export const ALL_EXAM_QUESTIONS: ExamQuestion[] = [
  ...MDM_QUESTIONS,
  ...SQL_QUESTIONS,
  ...PYTHON_QUESTIONS,
  ...DATA_ENGINEERING_QUESTIONS,
];
