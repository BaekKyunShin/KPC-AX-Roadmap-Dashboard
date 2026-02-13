'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import RoadmapLoadingOverlay from '@/components/roadmap/RoadmapLoadingOverlay';
import TestRoadmapResult from './_components/TestRoadmapResult';
import TestRoadmapNavigation from './_components/TestRoadmapNavigation';
import CourseEditModal from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/CourseEditModal';
import { INTERVIEW_STEPS } from '@/lib/constants/interview-steps';
import { useTestRoadmapForm } from './_hooks/useTestRoadmapForm';
import { useStepValidator } from './_hooks/useStepValidator';
import { useTestRoadmapActions } from './_hooks/useTestRoadmapActions';

// Step 컴포넌트들 - InterviewStepper는 공통 컴포넌트 사용
import InterviewStepper from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper';
import TestStepBasicInfo from './_components/TestStepBasicInfo';
import StepCompanyDetails from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepCompanyDetails';
import StepJobTasks from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepJobTasks';
import StepPainPoints from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepPainPoints';
import StepConstraintsGoals from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepConstraintsGoals';
import TestStepSummary from './_components/TestStepSummary';

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
  canAccess: boolean;
  hasProfile: boolean;
}

// =============================================================================
// 상수
// =============================================================================

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

// =============================================================================
// 유틸리티 함수
// =============================================================================

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function getProjectsLink(isOpsAdmin: boolean): { href: string; label: string } {
  return isOpsAdmin
    ? { href: '/ops/projects', label: '프로젝트 관리로 돌아가기' }
    : { href: '/consultant/projects', label: '담당 프로젝트로 돌아가기' };
}

// =============================================================================
// 하위 컴포넌트
// =============================================================================

function TestPageHeader({ isOpsAdmin }: { isOpsAdmin: boolean }) {
  const { href, label } = getProjectsLink(isOpsAdmin);

  return (
    <div className="mb-6">
      <PageHeader
        title="테스트 로드맵"
        description="시스템 사용법 연습을 위한 테스트 로드맵을 생성합니다."
        backLink={{ href, label }}
      />
    </div>
  );
}

function TestModeNotice() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>테스트 모드 안내</AlertTitle>
      <AlertDescription>
        이 화면의 UI/UX는 실제 현장 인터뷰 화면과 동일합니다. 테스트를 통해 인터뷰 진행 방법을 연습하세요.
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
        <Link href="/consultant/profile" className="ml-2 underline">
          프로필 등록하기
        </Link>
      </AlertDescription>
    </Alert>
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
  const [error, setError] = useState<string | null>(null);

  // ===== 커스텀 훅 =====
  const form = useTestRoadmapForm({ setError });

  const { validateStep, isAllRequiredStepsValid, incompleteRequiredSteps } = useStepValidator({
    companyName: form.companyName,
    industry: form.industry,
    companySize: form.companySize,
    interviewDate: form.interviewDate,
    participants: form.participants,
    companyDetails: form.companyDetails,
    jobTasks: form.jobTasks,
    painPoints: form.painPoints,
    improvementGoals: form.improvementGoals,
  });

  const actions = useTestRoadmapActions({
    setError,
    buildInputData: form.buildInputData,
    incompleteRequiredSteps,
    setCurrentStep: form.setCurrentStep,
  });

  // ===== 스텝 클릭 (폼 + 검증 브릿지) =====
  const handleStepClick = (step: number) => {
    if (validateStep(form.currentStep) && !form.completedSteps.includes(form.currentStep)) {
      form.setCompletedSteps([...form.completedSteps, form.currentStep]);
    }
    form.setCurrentStep(step);
  };

  // ===== 스텝 렌더링 =====
  const renderStepContent = () => {
    switch (form.currentStep) {
      case 1:
        return (
          <TestStepBasicInfo
            companyName={form.companyName}
            industry={form.industry}
            subIndustries={form.subIndustries}
            companySize={form.companySize}
            onCompanyNameChange={form.setCompanyName}
            onIndustryChange={form.setIndustry}
            onSubIndustriesChange={form.setSubIndustries}
            onCompanySizeChange={form.setCompanySize}
            interviewDate={form.interviewDate}
            participants={form.participants}
            onInterviewDateChange={form.setInterviewDate}
            onParticipantsChange={form.setParticipants}
          />
        );
      case 2:
        return (
          <StepCompanyDetails
            companyDetails={form.companyDetails}
            onCompanyDetailsChange={form.setCompanyDetails}
          />
        );
      case 3:
        return (
          <StepJobTasks
            jobTasks={form.jobTasks}
            onJobTasksChange={form.setJobTasks}
          />
        );
      case 4:
        return (
          <StepPainPoints
            painPoints={form.painPoints}
            onPainPointsChange={form.setPainPoints}
          />
        );
      case 5:
        return (
          <StepConstraintsGoals
            constraints={form.constraints}
            improvementGoals={form.improvementGoals}
            notes={form.notes}
            sttInsights={form.sttInsights}
            onConstraintsChange={form.setConstraints}
            onImprovementGoalsChange={form.setImprovementGoals}
            onNotesChange={form.setNotes}
            onSttFileUpload={form.handleSttFileUpload}
            onSttInsightsDelete={form.handleSttInsightsDelete}
            isProcessingStt={form.isProcessingStt}
          />
        );
      case 6:
        return (
          <TestStepSummary
            companyName={form.companyName}
            industry={form.industry}
            subIndustries={form.subIndustries}
            companySize={form.companySize}
            interviewDate={form.interviewDate}
            participants={form.participants}
            companyDetails={form.companyDetails}
            jobTasks={form.jobTasks}
            painPoints={form.painPoints}
            constraints={form.constraints}
            improvementGoals={form.improvementGoals}
            notes={form.notes}
            sttInsights={form.sttInsights}
            onEditStep={handleStepClick}
          />
        );
      default:
        return null;
    }
  };

  // ===== 미승인 사용자 화면 =====
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

  // ===== 결과 화면 =====
  if (actions.result) {
    return (
      <>
        <div className="max-w-5xl mx-auto py-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <TestRoadmapResult
            result={actions.result.roadmapResult}
            validation={actions.result.validation}
            companyName={actions.result.companyName}
            industry={actions.result.industry}
            onReset={actions.handleReset}
            onRevisionRequest={actions.handleRevisionRequest}
            onEditCourse={actions.handleEditCourse}
            isRevising={actions.isRevising}
          />
        </div>

        <CourseEditModal
          isOpen={!!actions.editingCourse}
          course={actions.editingCourse}
          onClose={() => {
            actions.setEditingCourse(null);
            actions.setEditingCourseIndex(null);
          }}
          onSave={actions.handleSaveCourse}
        />

        {actions.isRevising && (
          <RoadmapLoadingOverlay
            isTestMode={true}
            profileHref="/consultant/profile"
            onCancel={() => {
              actions.setIsRevising(false);
              actions.setIsRevisionComplete(false);
            }}
            isCompleted={actions.isRevisionComplete}
          />
        )}
      </>
    );
  }

  // ===== 메인 폼 화면 =====
  return (
    <>
      <div className="max-w-4xl mx-auto py-6 pb-24">
        <TestPageHeader isOpsAdmin={isOpsAdmin} />
        <TestModeNotice />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!hasProfile && <ProfileWarning />}

        {/* 스테퍼 */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <InterviewStepper
            steps={[...INTERVIEW_STEPS]}
            currentStep={form.currentStep}
            onStepClick={handleStepClick}
            completedSteps={form.completedSteps}
            validateStep={validateStep}
          />
        </div>

        {/* 스텝 컨텐츠 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6 min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* 네비게이션 버튼 */}
        <TestRoadmapNavigation
          currentStep={form.currentStep}
          goToNextStep={form.goToNextStep}
          goToPrevStep={form.goToPrevStep}
          handleSubmit={actions.handleSubmit}
          generationState={actions.generationState}
          isAllRequiredStepsValid={isAllRequiredStepsValid}
          incompleteRequiredSteps={incompleteRequiredSteps}
          isOpsAdmin={isOpsAdmin}
        />
      </div>

      {actions.generationState.isGenerating && (
        <RoadmapLoadingOverlay
          isTestMode={true}
          profileHref="/consultant/profile"
          onCancel={actions.handleCancelGeneration}
          isCompleted={actions.generationState.isComplete}
        />
      )}
    </>
  );
}
