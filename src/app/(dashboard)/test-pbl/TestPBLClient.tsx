'use client';

import Link from 'next/link';
import { FlaskConical, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import { TestPBLSampleSummary } from './_components/TestPBLSampleSummary';
import { useTestPBLActions } from './_hooks/useTestPBLActions';
import type { PBLInterviewSample } from '../../../../e2e/fixtures/pbl-interview-sample';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface TestPBLClientProps {
  user: UserInfo;
  canAccess: boolean;
  sampleData: PBLInterviewSample;
}

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function getBackLink(isOpsAdmin: boolean) {
  return isOpsAdmin
    ? { href: '/ops/projects', label: '프로젝트 관리로 돌아가기' }
    : { href: '/consultant/projects', label: '담당 프로젝트로 돌아가기' };
}

export default function TestPBLClient({ user, canAccess, sampleData }: TestPBLClientProps) {
  const isOpsAdmin = isAdminRole(user.role);
  const backLink = getBackLink(isOpsAdmin);

  const actions = useTestPBLActions({ sampleData });

  if (!canAccess) {
    const userRole = user.role === 'USER_PENDING' ? 'CONSULTANT' : 'OPS_ADMIN';
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PendingApprovalCard
          userName={user.name}
          userEmail={user.email}
          userRole={userRole}
          hasProfile={true}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 pb-24 space-y-6">
      <PageHeader
        title="PBL 테스트"
        description="샘플 PBL 인터뷰 데이터로 PBL 보고서 초안 생성을 연습합니다."
        backLink={{ ...backLink, useBack: true }}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>테스트 모드 안내</AlertTitle>
        <AlertDescription>
          아래 샘플 데이터를 LLM에 전달해 PBL 보고서(양식 2번 Ⅳ·Ⅴ장) 초안을 생성합니다. 결과는
          <code className="mx-1 bg-muted px-1 py-0.5 rounded text-xs">is_test_mode=true</code>
          로 표시된 테스트 프로젝트에 저장되어 실제 운영 프로젝트와 격리됩니다.
          <strong className="block mt-2 text-amber-700">
            생성 결과는 생성자 본인만 조회할 수 있으며, 운영 통계·갤러리에는 노출되지 않습니다.
          </strong>
        </AlertDescription>
      </Alert>

      {actions.error && (
        <Alert variant="destructive">
          <AlertTitle>PBL 생성 실패</AlertTitle>
          <AlertDescription>{actions.error}</AlertDescription>
        </Alert>
      )}

      {actions.result ? (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <AlertTitle className="text-emerald-800">PBL 보고서 초안 생성 완료</AlertTitle>
          <AlertDescription className="text-emerald-700 space-y-3">
            <p>테스트 프로젝트에 PBL DRAFT 버전이 저장되었습니다.</p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/consultant/projects/${actions.result.projectId}/pbl`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
              >
                생성된 PBL 보고서 보기
              </Link>
              <Button variant="outline" size="sm" onClick={actions.handleReset}>
                다시 테스트
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <TestPBLSampleSummary sample={sampleData} />

          <div className="flex justify-end gap-2">
            <Button
              onClick={actions.handleGenerate}
              disabled={actions.isGenerating}
              className="min-w-[160px]"
              data-testid="test-pbl-generate-button"
            >
              {actions.isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  PBL 생성 중...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" />
                  PBL 보고서 생성
                </>
              )}
            </Button>
            {actions.isGenerating && (
              <Button variant="outline" onClick={actions.handleCancel}>
                취소
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
