import ProjectList from './_components/ProjectList';
import { fetchConsultantProjects, fetchConsultantProjectFilters } from './actions';

export default async function ConsultantProjectsPage() {
  // 인증/역할 검증은 consultant/layout.tsx에서 일괄 처리

  // Server Component에서 데이터 프리페치 — 클라이언트 useEffect 워터폴 제거
  const [initialData, initialFilters] = await Promise.all([
    fetchConsultantProjects(),
    fetchConsultantProjectFilters(),
  ]);

  return <ProjectList initialData={initialData} initialFilters={initialFilters} />;
}
