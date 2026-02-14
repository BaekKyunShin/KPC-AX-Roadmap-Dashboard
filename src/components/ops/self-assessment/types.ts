export interface Question {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  weight: number;
}

export interface Template {
  id: string;
  version: number;
  name: string;
  questions: Question[];
}
