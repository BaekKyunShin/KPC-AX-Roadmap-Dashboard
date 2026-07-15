import { InterviewFormSkeleton } from '@/components/ui/Skeleton';

/**
 * 인터뷰 페이지 로딩 스켈레톤.
 *
 * Roadmap 트랙(v2 8 스텝)과 PBL 트랙(10 스텝)이 다른 스텝 수를 가지므로,
 * URL `?track=PBL` 쿼리로 트랙을 식별해 적절한 stepCount 를 전달한다.
 * page.tsx 도 동일 searchParams 로 분기하므로 일관됨.
 */
export default async function InterviewLoading({
  searchParams,
}: {
  searchParams?: Promise<{ track?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const stepCount = sp.track === 'PBL' ? 10 : 8;
  return <InterviewFormSkeleton stepCount={stepCount} />;
}
