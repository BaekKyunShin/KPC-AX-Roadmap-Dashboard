'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, FlaskConical, Info, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';

// =============================================================================
// 타입 정의
// =============================================================================

interface TestRoadmapResultProps {
  result: RoadmapResult;
  validation: ValidationResult;
  companyName: string;
  industry: string;
  onReset: () => void;
  onRevisionRequest?: (revisionPrompt: string) => Promise<void>;
  onEditCourse?: (courseIndex: number) => void;
  isRevising?: boolean;
}

interface ValidationNotesSectionProps {
  validation: ValidationResult;
}

interface RevisionRequestSectionProps {
  onRevisionRequest: (revisionPrompt: string) => Promise<void>;
  isRevising: boolean;
}

type MatrixLevel = 'beginner' | 'intermediate' | 'advanced';

// =============================================================================
// 상수
// =============================================================================

const REVISION_PLACEHOLDER =
  '예: 초급 과정에 Python 기초 내용을 추가해주세요. / 고급 과정의 시간을 30시간으로 줄여주세요.';

// =============================================================================
// 하위 컴포넌트: 테스트 모드 배너
// =============================================================================

function TestModeBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <FlaskConical className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <h3 className="font-medium text-amber-800">테스트 로드맵</h3>
        <p className="text-sm text-amber-700 mt-1">
          이 로드맵은 테스트 목적으로 생성되었습니다. 실제 기업 진단 결과가 아닌 입력된 정보만을
          기반으로 생성되었으므로 참고용으로만 활용하세요.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 검토 필요 사항 섹션
// =============================================================================

function ValidationNotesSection({ validation }: ValidationNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalCount = validation.errors.length + validation.warnings.length;
  const allItems = [...validation.errors, ...validation.warnings];

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 text-amber-600">
          <Info className="h-4 w-4" />
          <span className="text-sm font-medium">검토 필요 사항({totalCount}건)</span>
        </div>
        <ChevronIcon className="h-4 w-4 text-gray-400" />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <ul className="space-y-1">
            {allItems.map((item, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 수정 요청 섹션
// =============================================================================

function RevisionRequestSection({ onRevisionRequest, isRevising }: RevisionRequestSectionProps) {
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = revisionPrompt.trim();
    if (!trimmedPrompt) {
      setError('수정 요청 내용을 입력해주세요.');
      return;
    }
    setError(null);
    await onRevisionRequest(trimmedPrompt);
    setRevisionPrompt('');
  }, [revisionPrompt, onRevisionRequest]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRevisionPrompt(e.target.value);
  }, []);

  const isSubmitDisabled = isRevising || !revisionPrompt.trim();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          수정 요청
        </CardTitle>
        <CardDescription>
          로드맵 수정이 필요하면 요청 내용을 입력하세요. AI가 수정 사항을 반영하여 새 로드맵을
          생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          value={revisionPrompt}
          onChange={handleChange}
          placeholder={REVISION_PLACEHOLDER}
          rows={3}
          disabled={isRevising}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isRevising ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                수정 중...
              </>
            ) : (
              '수정 요청 반영'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * 테스트 로드맵 결과 컴포넌트
 * - 테스트 목적으로 생성된 로드맵을 표시
 * - 공통 컴포넌트(RoadmapMatrix, CoursesList, PBLCourseView)를 사용
 */
export default function TestRoadmapResult({
  result,
  validation,
  companyName,
  industry,
  onReset,
  onRevisionRequest,
  onEditCourse,
  isRevising = false,
}: TestRoadmapResultProps) {
  const hasValidationNotes = validation.errors.length > 0 || validation.warnings.length > 0;
  const canEdit = !!onEditCourse;
  const canRevise = !!onRevisionRequest;

  /**
   * RoadmapMatrix의 onEditCourse 콜백을 courseIndex로 변환하는 어댑터
   * - RoadmapMatrix는 (rowIndex, level)을 전달
   * - 상위 컴포넌트는 courseIndex를 기대
   */
  const handleEditMatrixCourse = useCallback(
    (rowIndex: number, level: MatrixLevel) => {
      if (!onEditCourse) return;

      const row = result.roadmap_matrix[rowIndex];
      if (!row) return;

      const levelCourses = row[level];
      if (!levelCourses || levelCourses.length === 0) return;

      // 첫 번째 과정의 이름으로 전체 과정 목록에서 index 찾기
      const courseName = levelCourses[0].course_name;
      const courseIndex = result.courses.findIndex((c) => c.course_name === courseName);

      if (courseIndex !== -1) {
        onEditCourse(courseIndex);
      }
    },
    [onEditCourse, result.roadmap_matrix, result.courses]
  );

  return (
    <div className="space-y-6 break-keep">
      <TestModeBanner />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{companyName}</h2>
          <p className="text-gray-500">{industry}</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          새 테스트 시작
        </Button>
      </div>

      {/* 진단 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>진단 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{result.diagnosis_summary}</p>
        </CardContent>
      </Card>

      {/* 로드맵 탭 */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">과정 체계도</TabsTrigger>
          <TabsTrigger value="courses">과정 상세</TabsTrigger>
          <TabsTrigger value="pbl">PBL 과정</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>업무별 교육 로드맵 매트릭스</CardTitle>
              <CardDescription>
                세부업무별 초급/중급/고급 교육 과정을 확인하세요.
                {canEdit && ' 과정을 클릭하여 편집할 수 있습니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoadmapMatrix
                matrix={result.roadmap_matrix}
                canEdit={canEdit}
                onEditCourse={handleEditMatrixCourse}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <CoursesList courses={result.courses} canEdit={canEdit} onEditCourse={onEditCourse} />
        </TabsContent>

        <TabsContent value="pbl">
          <Card>
            <CardHeader>
              <CardTitle>PBL 과정</CardTitle>
              <CardDescription>프로젝트 기반 학습(PBL) 과정 상세 정보</CardDescription>
            </CardHeader>
            <CardContent>
              <PBLCourseView course={result.pbl_course} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {hasValidationNotes && <ValidationNotesSection validation={validation} />}

      {canRevise && (
        <RevisionRequestSection onRevisionRequest={onRevisionRequest!} isRevising={isRevising} />
      )}
    </div>
  );
}
