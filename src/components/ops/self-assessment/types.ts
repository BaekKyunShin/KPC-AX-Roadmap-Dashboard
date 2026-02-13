export interface Question {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: 'SCALE_5' | 'SCALE_10' | 'MULTIPLE_CHOICE' | 'TEXT';
  options?: string[];
  weight: number;
}

export interface Template {
  id: string;
  version: number;
  name: string;
  questions: Question[];
}
