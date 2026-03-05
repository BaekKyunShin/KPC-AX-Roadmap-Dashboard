import { notFound } from 'next/navigation';

import { createAdminClient } from '@/lib/supabase/admin';

import PublicAssessmentClient from './PublicAssessmentClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicAssessmentPage({ params }: PageProps) {
  const { token } = await params;
  const adminSupabase = createAdminClient();

  // 토큰 조회
  const { data: tokenData } = await adminSupabase
    .from('assessment_tokens')
    .select('id, project_id, expires_at, is_used')
    .eq('token', token)
    .single();

  // 존재하지 않는 토큰 → 404
  if (!tokenData) {
    notFound();
  }

  const projectId = tokenData.project_id;

  // 기존 진단 확인
  const { data: existingAssessment } = await adminSupabase
    .from('self_assessments')
    .select('id, assessment_token_id')
    .eq('project_id', projectId)
    .single();

  // 이미 진단 완료된 경우
  if (existingAssessment) {
    const message = existingAssessment.assessment_token_id
      ? '이미 진단 결과를 제출하셨습니다.'
      : '진단 결과를 이미 KPC 운영 담당자가 입력 완료했습니다.';

    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          진단 완료
        </h1>
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  // 만료된 링크
  if (new Date(tokenData.expires_at) < new Date()) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          링크 만료
        </h1>
        <p className="text-gray-600">
          링크가 만료되었습니다. 담당자에게 새 링크를 요청해 주세요.
        </p>
      </div>
    );
  }

  // 이미 사용된 토큰 (다른 경로로 사용됨)
  if (tokenData.is_used) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          진단 완료
        </h1>
        <p className="text-gray-600">이미 진단 결과를 제출하셨습니다.</p>
      </div>
    );
  }

  // 프로젝트 + 활성 템플릿 조회
  const [{ data: project }, { data: template }] = await Promise.all([
    adminSupabase
      .from('projects')
      .select('id, company_name')
      .eq('id', projectId)
      .single(),
    adminSupabase
      .from('self_assessment_templates')
      .select('id, name, version, questions')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (!project || !template) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          오류
        </h1>
        <p className="text-gray-600">
          진단 정보를 불러올 수 없습니다. 담당자에게 문의해 주세요.
        </p>
      </div>
    );
  }

  return (
    <PublicAssessmentClient
      token={token}
      companyName={project.company_name}
      template={{
        id: template.id,
        name: template.name,
        version: template.version,
        questions: template.questions,
      }}
      questionCount={template.questions.length}
    />
  );
}
