import type { SelfAssessmentQuestion } from '@/types/database';

/**
 * 질문 배열이 변경되었는지 비교합니다.
 * 보수적 비교: 의심스러우면 true(변경됨) 반환하여 안전한 방향(복제)으로 동작합니다.
 */
export function hasQuestionsChanged(
  existing: SelfAssessmentQuestion[],
  updated: SelfAssessmentQuestion[]
): boolean {
  if (existing.length !== updated.length) return true;

  const sortByOrder = (a: SelfAssessmentQuestion, b: SelfAssessmentQuestion) =>
    a.order - b.order;
  const sortedExisting = [...existing].sort(sortByOrder);
  const sortedUpdated = [...updated].sort(sortByOrder);

  for (let i = 0; i < sortedExisting.length; i++) {
    const e = sortedExisting[i];
    const u = sortedUpdated[i];
    if (
      e.id !== u.id ||
      e.order !== u.order ||
      e.dimension !== u.dimension ||
      e.question_text !== u.question_text ||
      e.weight !== u.weight
    ) {
      return true;
    }
  }

  return false;
}
