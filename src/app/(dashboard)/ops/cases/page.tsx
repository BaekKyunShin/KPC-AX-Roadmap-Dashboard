import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: '신규', color: 'bg-gray-100 text-gray-800' },
  DIAGNOSED: { label: '진단완료', color: 'bg-blue-100 text-blue-800' },
  MATCH_RECOMMENDED: { label: '매칭추천', color: 'bg-purple-100 text-purple-800' },
  ASSIGNED: { label: '배정완료', color: 'bg-green-100 text-green-800' },
  INTERVIEWED: { label: '인터뷰완료', color: 'bg-yellow-100 text-yellow-800' },
  ROADMAP_DRAFTED: { label: '로드맵초안', color: 'bg-orange-100 text-orange-800' },
  FINALIZED: { label: '최종확정', color: 'bg-emerald-100 text-emerald-800' },
};

export default async function OPSCasesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 현재 사용자 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    redirect('/dashboard');
  }

  // 케이스 목록 조회
  const { data: cases } = await supabase
    .from('cases')
    .select(`
      *,
      assigned_consultant:users!cases_assigned_consultant_id_fkey(id, name, email),
      created_by_user:users!cases_created_by_fkey(id, name)
    `)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">케이스 관리</h1>
          <p className="mt-1 text-sm text-gray-500">기업 케이스를 생성하고 관리합니다.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/ops/cases/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            새 케이스 생성
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기업명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                업종
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                배정 컨설턴트
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases?.map((caseItem) => {
              const statusInfo = STATUS_LABELS[caseItem.status] || {
                label: caseItem.status,
                color: 'bg-gray-100 text-gray-800',
              };
              return (
                <tr key={caseItem.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{caseItem.company_name}</div>
                    <div className="text-sm text-gray-500">{caseItem.contact_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.industry}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.assigned_consultant?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/ops/cases/${caseItem.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!cases || cases.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  등록된 케이스가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
