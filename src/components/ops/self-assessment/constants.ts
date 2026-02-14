import type { Question } from './types';

export const CIRCLED_NUMBERS = [
  '①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
  '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳',
  '㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚'
];

export const SCALE_5_LABELS = ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
export const SCALE_5_VALUES = [1, 2, 3, 4, 5] as const;

export const toCircledNumber = (n: number): string => CIRCLED_NUMBERS[n - 1] || n.toString();

export const groupQuestionsByDimension = (questions: Question[]): Record<string, Question[]> => {
  return questions.reduce((acc, q) => {
    if (!acc[q.dimension]) {
      acc[q.dimension] = [];
    }
    acc[q.dimension].push(q);
    return acc;
  }, {} as Record<string, Question[]>);
};
