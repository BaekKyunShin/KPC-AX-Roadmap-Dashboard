import { MAX_SCALE } from '@/lib/constants/self-assessment';

/**
 * 자가진단 점수 계산 (5점 척도 고정)
 */
export function calculateScores(
  answers: { question_id: string; answer_value: string | number }[],
  questions: { id: string; dimension: string; weight: number }[]
) {
  const dimensionScores: Record<string, { score: number; max: number }> = {};

  for (const question of questions) {
    const answer = answers.find((a) => a.question_id === question.id);
    const answerValue =
      typeof answer?.answer_value === 'number'
        ? answer.answer_value
        : parseInt((answer?.answer_value as string) || '0', 10);

    if (!dimensionScores[question.dimension]) {
      dimensionScores[question.dimension] = { score: 0, max: 0 };
    }

    dimensionScores[question.dimension].score += answerValue * question.weight;
    dimensionScores[question.dimension].max += MAX_SCALE * question.weight;
  }

  const totalScore = Object.values(dimensionScores).reduce((sum, d) => sum + d.score, 0);
  const maxPossibleScore = Object.values(dimensionScores).reduce((sum, d) => sum + d.max, 0);

  return {
    total_score: totalScore,
    max_possible_score: maxPossibleScore,
    dimension_scores: Object.entries(dimensionScores).map(([dimension, { score, max }]) => ({
      dimension,
      score,
      max_score: max,
    })),
  };
}
