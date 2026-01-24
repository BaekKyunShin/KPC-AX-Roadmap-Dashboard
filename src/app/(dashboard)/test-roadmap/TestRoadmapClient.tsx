'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FlaskConical, Info, History, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import TestInputForm from './_components/TestInputForm';
import TestRoadmapResult from './_components/TestRoadmapResult';
import TestHistoryList from './_components/TestHistoryList';
import { createTestRoadmap, getTestHistory, getTestRoadmap, deleteTestCase } from './actions';
import type { TestInputData } from '@/lib/schemas/test-roadmap';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';

interface TestRoadmapClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  isApprovedConsultant: boolean;
  hasProfile: boolean;
}

interface TestHistoryItem {
  id: string;
  company_name: string;
  industry: string;
  company_size: string;
  created_at: string;
  roadmap_count: number;
}

/**
 * 에러 객체를 사용자 친화적 메시지로 변환
 */
function formatErrorMessage(err: unknown, defaultMessage: string): string {
  if (err instanceof Error) {
    return `오류가 발생했습니다: ${err.message}`;
  }
  return defaultMessage;
}

export default function TestRoadmapClient({
  user,
  isApprovedConsultant,
  hasProfile,
}: TestRoadmapClientProps) {
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 결과 상태
  const [result, setResult] = useState<{
    companyName: string;
    industry: string;
    roadmapResult: RoadmapResult;
    validation: ValidationResult;
  } | null>(null);

  // 테스트 기록
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 테스트 기록 로드
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await getTestHistory();
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (err) {
      console.error('[TestRoadmap] 기록 로드 중 오류:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 초기 기록 로드
  useEffect(() => {
    if (isApprovedConsultant) {
      loadHistory();
    }
  }, [isApprovedConsultant]);

  // 테스트 로드맵 생성
  const handleSubmit = async (data: TestInputData) => {
    setIsLoading(true);
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
        loadHistory();
      } else {
        setError(response.error || '로드맵 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('[TestRoadmap] 로드맵 생성 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵 생성 중 예기치 않은 오류가 발생했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 기록에서 로드맵 보기
  const handleViewHistory = async (caseId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getTestRoadmap(caseId);

      if (response.success && response.data && response.data.roadmap) {
        const { roadmap } = response.data;
        setResult({
          companyName: response.data.case.company_name,
          industry: response.data.case.industry,
          roadmapResult: {
            diagnosis_summary: roadmap.diagnosis_summary,
            roadmap_matrix: roadmap.roadmap_matrix as RoadmapResult['roadmap_matrix'],
            pbl_course: roadmap.pbl_course as RoadmapResult['pbl_course'],
            courses: roadmap.courses as RoadmapResult['courses'],
          },
          validation: {
            isValid: roadmap.free_tool_validated && roadmap.time_limit_validated,
            errors: [],
            warnings: [],
          },
        });
      } else {
        setError(response.error || '로드맵을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('[TestRoadmap] 로드맵 조회 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵을 불러오는 중 예기치 않은 오류가 발생했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 기록 삭제
  const handleDeleteHistory = async (caseId: string) => {
    try {
      const response = await deleteTestCase(caseId);
      if (response.success) {
        setHistory((prev) => prev.filter((item) => item.id !== caseId));
      } else {
        setError(response.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('[TestRoadmap] 삭제 중 오류:', err);
      setError(formatErrorMessage(err, '삭제 중 예기치 않은 오류가 발생했습니다.'));
    }
  };

  // 리셋
  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  // 미승인 사용자 화면 - PendingApprovalCard 재사용
  if (!isApprovedConsultant) {
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
      <div className="max-w-5xl mx-auto py-6">
        <TestRoadmapResult
          result={result.roadmapResult}
          validation={result.validation}
          companyName={result.companyName}
          industry={result.industry}
          onReset={handleReset}
        />
      </div>
    );
  }

  // 메인 화면
  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href="/consultant/projects"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          배정된 프로젝트로 돌아가기
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

      {/* 안내 */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>테스트 모드 안내</AlertTitle>
        <AlertDescription>
          테스트 로드맵은 실제 기업 진단 결과 없이 입력한 정보만으로 생성됩니다. 실제 컨설팅 시에는
          진단 결과와 현장 인터뷰 데이터를 바탕으로 더 정확한 로드맵이 생성됩니다.
        </AlertDescription>
      </Alert>

      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 프로필 미등록 경고 */}
      {!hasProfile && (
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
      )}

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />새 테스트
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            테스트 기록 ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <TestInputForm onSubmit={handleSubmit} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>테스트 기록</CardTitle>
              <CardDescription>최근 생성한 테스트 로드맵 기록입니다. (최대 10개)</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              ) : (
                <TestHistoryList
                  items={history}
                  onView={handleViewHistory}
                  onDelete={handleDeleteHistory}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
