'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { FlaskConical, Info, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import TestInputForm from './_components/TestInputForm';
import TestRoadmapResult from './_components/TestRoadmapResult';
import CourseEditModal from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/CourseEditModal';
import { createTestRoadmap, reviseTestRoadmap } from './actions';
import { buildRoadmapMatrixFromCourses, validateCourseClient } from '@/lib/utils/roadmap-client';
import type { TestInputData } from '@/lib/schemas/test-roadmap';
import type { RoadmapResult, ValidationResult, RoadmapCell } from '@/lib/services/roadmap';

// =============================================================================
// 타입 정의
// =============================================================================

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface TestRoadmapClientProps {
  user: UserInfo;
  /** 테스트 로드맵 기능에 접근 가능한지 여부 */
  canAccess: boolean;
  hasProfile: boolean;
}

interface TestRoadmapResultData {
  companyName: string;
  industry: string;
  roadmapResult: RoadmapResult;
  validation: ValidationResult;
}

interface GenerationState {
  isSubmitting: boolean;
  isGenerating: boolean;
  isComplete: boolean;
}

// =============================================================================
// 상수
// =============================================================================

const INITIAL_GENERATION_STATE: GenerationState = {
  isSubmitting: false,
  isGenerating: false,
  isComplete: false,
};

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

// =============================================================================
// 유틸리티 함수
// =============================================================================

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function formatErrorMessage(err: unknown, defaultMessage: string): string {
  if (err instanceof Error) {
    return `오류가 발생했습니다: ${err.message}`;
  }
  return defaultMessage;
}

function getProjectsLink(isOpsAdmin: boolean): { href: string; label: string } {
  return isOpsAdmin
    ? { href: '/ops/projects', label: '프로젝트 관리로 돌아가기' }
    : { href: '/consultant/projects', label: '담당 프로젝트로 돌아가기' };
}

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface PageHeaderProps {
  isOpsAdmin: boolean;
}

function PageHeader({ isOpsAdmin }: PageHeaderProps) {
  const { href, label } = getProjectsLink(isOpsAdmin);

  return (
    <div className="mb-6">
      <Link
        href={href}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {label}
      </Link>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">테스트 로드맵</h1>
          <p className="text-gray-500">시스템 사용법 연습을 위한 테스트 로드맵을 생성합니다.</p>
        </div>
      </div>
    </div>
  );
}

function TestModeNotice() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>테스트 모드 안내</AlertTitle>
      <AlertDescription>
        테스트 로드맵은 실제 기업 진단 결과 없이 입력한 정보만으로 생성됩니다. 실제 컨설팅 시에는
        진단 결과와 현장 인터뷰 데이터를 바탕으로 더 정확한 로드맵이 생성됩니다.
        <strong className="block mt-2 text-amber-700">
          테스트 결과는 저장되지 않으며, 페이지를 떠나면 사라집니다.
        </strong>
      </AlertDescription>
    </Alert>
  );
}

function ProfileWarning() {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTitle>컨설턴트 프로필 미등록</AlertTitle>
      <AlertDescription>
        컨설턴트 프로필이 등록되지 않았습니다. 프로필 정보가 로드맵 생성에 활용되므로 먼저
        프로필을 등록해주세요.
        <Link href="/dashboard/profile" className="ml-2 underline">
          프로필 등록하기
        </Link>
      </AlertDescription>
    </Alert>
  );
}

interface MainContentProps {
  isOpsAdmin: boolean;
  hasProfile: boolean;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (data: TestInputData) => Promise<void>;
}

function MainContent({
  isOpsAdmin,
  hasProfile,
  error,
  isSubmitting,
  onSubmit,
}: MainContentProps) {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <PageHeader isOpsAdmin={isOpsAdmin} />
      <TestModeNotice />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasProfile && <ProfileWarning />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />새 테스트 로드맵
          </CardTitle>
          <CardDescription>
            테스트용 기업 정보와 업무를 입력하여 AI 교육 로드맵을 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestInputForm onSubmit={onSubmit} isLoading={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

export default function TestRoadmapClient({
  user,
  canAccess,
  hasProfile,
}: TestRoadmapClientProps) {
  const isOpsAdmin = isAdminRole(user.role);

  // 기본 상태
  const [error, setError] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>(INITIAL_GENERATION_STATE);
  const [result, setResult] = useState<TestRoadmapResultData | null>(null);

  // 수정 기능을 위한 상태
  const [originalInput, setOriginalInput] = useState<TestInputData | null>(null);
  const [isRevising, setIsRevising] = useState(false);

  // 과정 편집 모달 상태
  const [editingCourse, setEditingCourse] = useState<RoadmapCell | null>(null);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);

  // 로드맵 최초 생성
  const handleSubmit = useCallback(async (data: TestInputData) => {
    setGenerationState({ isSubmitting: true, isGenerating: true, isComplete: false });
    setError(null);

    try {
      const response = await createTestRoadmap(data);

      if (response.success && response.data) {
        setResult({
          companyName: data.company_name,
          industry: data.industry,
          roadmapResult: response.data.result,
          validation: response.data.validation,
        });
        setOriginalInput(data); // 원본 입력 저장
        setGenerationState((prev) => ({ ...prev, isSubmitting: false, isComplete: true }));
        setTimeout(() => {
          setGenerationState(INITIAL_GENERATION_STATE);
        }, COMPLETION_DELAY_MS);
      } else {
        setError(response.error || '로드맵 생성에 실패했습니다.');
        setGenerationState(INITIAL_GENERATION_STATE);
      }
    } catch (err) {
      console.error('[TestRoadmap] 로드맵 생성 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵 생성 중 예기치 않은 오류가 발생했습니다.'));
      setGenerationState(INITIAL_GENERATION_STATE);
    }
  }, []);

  // 수정 요청 (LLM 재호출)
  const handleRevisionRequest = useCallback(async (revisionPrompt: string) => {
    if (!originalInput || !result) return;

    setIsRevising(true);
    setError(null);

    try {
      const response = await reviseTestRoadmap(
        originalInput,
        result.roadmapResult,
        revisionPrompt
      );

      if (response.success && response.data) {
        setResult({
          ...result,
          roadmapResult: response.data.result,
          validation: response.data.validation,
        });
      } else {
        setError(response.error || '로드맵 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('[TestRoadmap] 수정 요청 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵 수정 중 예기치 않은 오류가 발생했습니다.'));
    } finally {
      setIsRevising(false);
    }
  }, [originalInput, result]);

  // 과정 편집 시작
  const handleEditCourse = useCallback((courseIndex: number) => {
    if (!result) return;
    const course = result.roadmapResult.courses[courseIndex];
    if (course) {
      setEditingCourse({ ...course });
      setEditingCourseIndex(courseIndex);
    }
  }, [result]);

  // 과정 편집 저장 (클라이언트 상태만 업데이트)
  const handleSaveCourse = useCallback((updatedCourse: RoadmapCell) => {
    if (!result || editingCourseIndex === null) return;

    // 클라이언트 측 검증
    const validation = validateCourseClient(updatedCourse);
    if (!validation.isValid) {
      setError(validation.errors.join('\n'));
      return;
    }

    // courses 배열 업데이트
    const newCourses = [...result.roadmapResult.courses];
    newCourses[editingCourseIndex] = updatedCourse;

    // roadmap_matrix 재생성
    const newMatrix = buildRoadmapMatrixFromCourses(newCourses);

    // result 업데이트
    setResult({
      ...result,
      roadmapResult: {
        ...result.roadmapResult,
        courses: newCourses,
        roadmap_matrix: newMatrix,
      },
    });

    // 모달 닫기
    setEditingCourse(null);
    setEditingCourseIndex(null);
    setError(null);
  }, [result, editingCourseIndex]);

  // 초기화
  const handleReset = useCallback(() => {
    setResult(null);
    setOriginalInput(null);
    setError(null);
    setEditingCourse(null);
    setEditingCourseIndex(null);
  }, []);

  // 생성 취소
  const handleCancelGeneration = useCallback(() => {
    setGenerationState(INITIAL_GENERATION_STATE);
  }, []);

  // 미승인 사용자 화면
  if (!canAccess) {
    const userRole = user.role === 'USER_PENDING' ? 'CONSULTANT' : 'OPS_ADMIN';
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PendingApprovalCard
          userName={user.name}
          userEmail={user.email}
          userRole={userRole}
          hasProfile={hasProfile}
        />
      </div>
    );
  }

  // 결과 화면
  if (result) {
    return (
      <>
        <div className="max-w-5xl mx-auto py-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <TestRoadmapResult
            result={result.roadmapResult}
            validation={result.validation}
            companyName={result.companyName}
            industry={result.industry}
            onReset={handleReset}
            onRevisionRequest={handleRevisionRequest}
            onEditCourse={handleEditCourse}
            isRevising={isRevising}
          />
        </div>

        {/* 과정 편집 모달 */}
        <CourseEditModal
          isOpen={!!editingCourse}
          course={editingCourse}
          onClose={() => {
            setEditingCourse(null);
            setEditingCourseIndex(null);
          }}
          onSave={handleSaveCourse}
        />

        {/* 수정 요청 중 로딩 오버레이 */}
        {isRevising && (
          <RoadmapLoadingOverlay
            isTestMode={true}
            profileHref="/consultant/profile"
            onCancel={() => setIsRevising(false)}
            isCompleted={false}
          />
        )}
      </>
    );
  }

  // 메인 화면
  return (
    <>
      <MainContent
        isOpsAdmin={isOpsAdmin}
        hasProfile={hasProfile}
        error={error}
        isSubmitting={generationState.isSubmitting}
        onSubmit={handleSubmit}
      />

      {generationState.isGenerating && (
        <RoadmapLoadingOverlay
          isTestMode={true}
          profileHref="/consultant/profile"
          onCancel={handleCancelGeneration}
          isCompleted={generationState.isComplete}
        />
      )}
    </>
  );
}
