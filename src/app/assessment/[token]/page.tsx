import { CircleAlert, Clock } from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';

import PublicAssessmentClient from './PublicAssessmentClient';

// ============================================================================
// 로컬 컴포넌트
// ============================================================================

function StatusMessage({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="flex items-center justify-center mb-4">{icon}</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{message}</p>
    </div>
  );
}

function IconCircle({
  children,
  bgColor,
}: {
  children: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div
      className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 페이지
// ============================================================================

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

  // #005 — 존재하지 않는 토큰: 일반 404 대신 도메인 안내 페이지 노출
  // (이전: notFound() 호출 → 일반 "페이지를 찾을 수 없습니다" 표시로 사용자가
  // 자기 링크가 잘못된 건지 시스템 오류인지 알 수 없었음)
  if (!tokenData) {
    return (
      <StatusMessage
        icon={
          <IconCircle bgColor="bg-amber-100">
            <CircleAlert className="w-8 h-8 text-amber-600" />
          </IconCircle>
        }
        title="유효하지 않은 자가진단 링크"
        message="자가진단 링크가 잘못되었거나 만료된 것으로 보입니다. 담당 컨설턴트에게 새 링크를 요청해 주세요."
      />
    );
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
      <StatusMessage
        icon={
          <IconCircle bgColor="bg-blue-100">
            <CircleAlert className="w-8 h-8 text-blue-600" />
          </IconCircle>
        }
        title="진단 완료"
        message={message}
      />
    );
  }

  // 만료된 링크
  if (new Date(tokenData.expires_at) < new Date()) {
    return (
      <StatusMessage
        icon={
          <IconCircle bgColor="bg-amber-100">
            <Clock className="w-8 h-8 text-amber-600" />
          </IconCircle>
        }
        title="링크 만료"
        message="링크가 만료되었습니다. 담당자에게 새 링크를 요청해 주세요."
      />
    );
  }

  // 이미 사용된 토큰: 실제 제출 vs 무효화(재생성) 구분
  if (tokenData.is_used) {
    const { data: assessmentByToken } = await adminSupabase
      .from('self_assessments')
      .select('id')
      .eq('assessment_token_id', tokenData.id)
      .maybeSingle();

    if (assessmentByToken) {
      return (
        <StatusMessage
          icon={
            <IconCircle bgColor="bg-blue-100">
              <CircleAlert className="w-8 h-8 text-blue-600" />
            </IconCircle>
          }
          title="진단 완료"
          message="이미 진단 결과를 제출하셨습니다."
        />
      );
    }

    return (
      <StatusMessage
        icon={
          <IconCircle bgColor="bg-amber-100">
            <CircleAlert className="w-8 h-8 text-amber-600" />
          </IconCircle>
        }
        title="유효하지 않은 링크"
        message="이 링크는 더 이상 유효하지 않습니다. 담당자에게 새 링크를 요청해 주세요."
      />
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
      <StatusMessage
        icon={
          <IconCircle bgColor="bg-red-100">
            <CircleAlert className="w-8 h-8 text-red-600" />
          </IconCircle>
        }
        title="오류"
        message="진단 정보를 불러올 수 없습니다. 담당자에게 문의해 주세요."
      />
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
