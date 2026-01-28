import { FlaskConical, Info, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/Skeleton';

// ============================================================================
// 로컬 헬퍼 컴포넌트
// ============================================================================

/**
 * 입력 필드 스켈레톤
 */
function InputSkeleton() {
  return <Skeleton className="h-10 w-full" />;
}

/**
 * 폼 카드 스켈레톤 - 제목과 설명 포함
 */
function FormCardSkeleton({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-lg font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ============================================================================
// 섹션별 스켈레톤 컴포넌트
// ============================================================================

/**
 * 기업 기본정보 카드 스켈레톤
 */
function CompanyInfoSkeleton() {
  return (
    <FormCardSkeleton
      title={
        <>
          <Skeleton className="h-5 w-5" />
          기업 기본정보
        </>
      }
      description="테스트용 기업 정보를 입력하세요."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <InputSkeleton />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <InputSkeleton />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <InputSkeleton />
        </div>
      </div>
    </FormCardSkeleton>
  );
}

/**
 * 세부 업무 카드 스켈레톤
 */
function JobTasksSkeleton() {
  return (
    <FormCardSkeleton
      title={
        <>
          <Skeleton className="h-5 w-5" />
          세부 업무
        </>
      }
      description="AI 교육이 필요한 업무를 입력하세요. (최소 1개)"
    >
      <div className="space-y-4">
        <div className="flex gap-3 items-start">
          <div className="flex-1 grid gap-3 md:grid-cols-2">
            <InputSkeleton />
            <InputSkeleton />
          </div>
          <Skeleton className="h-10 w-10 shrink-0" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </FormCardSkeleton>
  );
}

/**
 * 페인포인트 카드 스켈레톤
 */
function PainPointsSkeleton() {
  return (
    <FormCardSkeleton
      title={
        <>
          <Skeleton className="h-5 w-5" />
          페인포인트
        </>
      }
      description="현재 업무에서 겪는 어려움이나 병목을 입력하세요. (최소 1개)"
    >
      <div className="space-y-4">
        <div className="flex gap-3 items-start">
          <div className="flex-1 grid gap-3 md:grid-cols-[1fr_auto]">
            <InputSkeleton />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <Skeleton className="h-10 w-10 shrink-0" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    </FormCardSkeleton>
  );
}

/**
 * 개선 목표 카드 스켈레톤
 */
function ImprovementGoalsSkeleton() {
  return (
    <FormCardSkeleton
      title={
        <>
          <Skeleton className="h-5 w-5" />
          개선 목표
        </>
      }
      description="AI 교육을 통해 달성하고자 하는 목표를 입력하세요. (최소 1개)"
    >
      <div className="space-y-4">
        <div className="flex gap-3 items-start">
          <InputSkeleton />
          <Skeleton className="h-10 w-10 shrink-0" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </FormCardSkeleton>
  );
}

/**
 * 추가 요구사항 카드 스켈레톤
 */
function AdditionalRequirementsSkeleton() {
  return (
    <FormCardSkeleton
      title="추가 요구사항 (선택)"
      description="기타 참고할 사항이 있으면 입력하세요."
    >
      <Skeleton className="h-20 w-full" />
    </FormCardSkeleton>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * 테스트 로드맵 페이지 로딩 스켈레톤
 */
export default function TestRoadmapLoading() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 flex items-center mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <Skeleton className="h-4 w-36" />
        </div>
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

      {/* 안내 */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>테스트 모드 안내</AlertTitle>
        <AlertDescription>
          테스트 로드맵은 실제 기업 진단 결과 없이 입력한 정보만으로 생성됩니다. 실제 컨설팅 시에는
          진단 결과와 현장 인터뷰 데이터를 바탕으로 더 정확한 로드맵이 생성됩니다.
        </AlertDescription>
      </Alert>

      {/* 탭 */}
      <Tabs defaultValue="create">
        <TabsList className="mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2" disabled>
            <FlaskConical className="h-4 w-4" />새 테스트
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" disabled>
            <Skeleton className="h-4 w-4 rounded-full" />
            테스트 기록
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 폼 스켈레톤 */}
      <div className="space-y-6">
        <CompanyInfoSkeleton />
        <JobTasksSkeleton />
        <PainPointsSkeleton />
        <ImprovementGoalsSkeleton />
        <AdditionalRequirementsSkeleton />

        {/* 제출 버튼 */}
        <div className="flex justify-end">
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    </div>
  );
}
