import { Suspense } from 'react';
import ProjectList from './_components/ProjectList';
import { fetchConsultantProjects, fetchConsultantProjectFilters } from './actions';
import Loading from './loading';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

/**
 * 컨설턴트 담당 프로젝트 목록 페이지.
 *
 * 대시보드의 프로젝트 현황 카드나 외부 링크에서 넘어올 때 URL 쿼리스트링
 * (`?status=FINALIZED` 등)으로 필터가 전달된다. Server Component 단계에서
 * 반드시 searchParams를 읽어 `fetchConsultantProjects`에 전달해야 한다.
 *
 * 주의: `ProjectList`는 `initialData`가 있으면 초기 마운트 fetch를 skip하므로
 * 여기서 파라미터 없이 전체 데이터를 넘기면 URL 필터가 '뱃지만 표시되고
 * 실제 리스트는 전체가 조회'되는 버그가 발생한다(과거 발생 이력).
 */
export default function ConsultantProjectsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ConsultantProjectsPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function ConsultantProjectsPageInner({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? '';
  const status = params.status && params.status !== 'all' ? params.status : '';

  const [initialData, initialFilters] = await Promise.all([
    fetchConsultantProjects({ search, status }),
    fetchConsultantProjectFilters(),
  ]);

  return <ProjectList initialData={initialData} initialFilters={initialFilters} />;
}
