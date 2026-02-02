'use client';

import type {
  InterviewParticipant,
  CompanyDetails,
  JobTask,
  PainPoint,
  Constraint,
  ImprovementGoal,
  SttInsights,
} from '@/lib/schemas/interview';

interface StepSummaryProps {
  interviewDate: string;
  participants: InterviewParticipant[];
  companyDetails: CompanyDetails;
  jobTasks: JobTask[];
  painPoints: PainPoint[];
  constraints: Constraint[];
  improvementGoals: ImprovementGoal[];
  notes: string;
  sttInsights: SttInsights | null;
  onEditStep: (step: number) => void;
}

// 헬퍼 함수
function getSeverityBadge(severity: string) {
  const styles = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };
  const labels = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[severity as keyof typeof styles] || 'bg-gray-100'}`}>
      {labels[severity as keyof typeof labels] || severity}
    </span>
  );
}

// 섹션 컴포넌트
function SummarySection({
  title,
  onEdit,
  children,
  isEmpty = false,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          수정
        </button>
      </div>
      <div className={`p-4 ${isEmpty ? 'text-gray-400 text-sm' : ''}`}>
        {isEmpty ? '입력된 내용 없음' : children}
      </div>
    </div>
  );
}

export default function StepSummary({
  interviewDate,
  participants,
  companyDetails,
  jobTasks,
  painPoints,
  constraints,
  improvementGoals,
  notes,
  sttInsights,
  onEditStep,
}: StepSummaryProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">입력 내용 확인</h2>
        <p className="text-sm text-gray-600">
          입력하신 내용을 확인해주세요. 수정이 필요하면 각 섹션의 &quot;수정&quot; 버튼을 클릭하세요.
        </p>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{participants.length}</div>
          <div className="text-xs text-blue-600">참석자</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">{jobTasks.length}</div>
          <div className="text-xs text-indigo-600">세부업무</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{painPoints.length}</div>
          <div className="text-xs text-red-600">페인포인트</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{improvementGoals.length}</div>
          <div className="text-xs text-green-600">개선목표</div>
        </div>
      </div>

      {/* Step 1: 기본 정보 */}
      <SummarySection title="기본 정보"  onEdit={() => onEditStep(1)}>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500">인터뷰 날짜</span>
            <p className="text-sm font-medium">{formatDate(interviewDate)}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">참석자</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {participants.map((p) => (
                <span key={p.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-sm bg-gray-100">
                  {p.name}
                  {p.position && <span className="text-gray-500 ml-1">({p.position})</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SummarySection>

      {/* Step 2: 시스템/AI 활용 경험 */}
      <SummarySection
        title="시스템/AI 활용 경험"
                onEdit={() => onEditStep(2)}
        isEmpty={!companyDetails.systems_and_tools?.length && !companyDetails.ai_experience}
      >
        <div className="space-y-3">
          {companyDetails.systems_and_tools && companyDetails.systems_and_tools.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">주요 사용 시스템/도구</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {companyDetails.systems_and_tools.map((item) => (
                  <span key={item} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {companyDetails.ai_experience && (
            <div>
              <span className="text-xs text-gray-500">AI 도구 사용 경험</span>
              <p className="text-sm whitespace-pre-line break-keep">{companyDetails.ai_experience}</p>
            </div>
          )}
        </div>
      </SummarySection>

      {/* Step 3: 세부업무 */}
      <SummarySection title="세부업무"  onEdit={() => onEditStep(3)}>
        <div className="space-y-3">
          {jobTasks.map((task, idx) => (
            <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{task.task_name}</span>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-keep">{task.task_description}</p>
              </div>
            </div>
          ))}
        </div>
      </SummarySection>

      {/* Step 4: 페인포인트 */}
      <SummarySection title="페인포인트"  onEdit={() => onEditStep(4)}>
        <div className="space-y-2">
          {painPoints.map((point, idx) => (
            <div key={point.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm break-keep">{point.description}</p>
                  {getSeverityBadge(point.severity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SummarySection>

      {/* Step 5: 목표/제약/추가정보 */}
      <SummarySection title="목표 및 제약사항"  onEdit={() => onEditStep(5)}>
        <div className="space-y-4">
          {/* 개선 목표 */}
          {improvementGoals[0]?.goal_description && (
            <div>
              <span className="text-xs text-gray-500 block mb-2">개선 목표</span>
              <p className="text-sm bg-green-50 p-3 rounded-lg whitespace-pre-line break-keep">
                {improvementGoals[0].goal_description}
              </p>
            </div>
          )}

          {/* 제약사항 */}
          {constraints[0]?.description && (
            <div>
              <span className="text-xs text-gray-500 block mb-2">제약사항</span>
              <p className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-line break-keep">
                {constraints[0].description}
              </p>
            </div>
          )}

          {/* 메모 */}
          {notes && (
            <div>
              <span className="text-xs text-gray-500 block mb-1">메모</span>
              <p className="text-sm bg-gray-50 p-2 rounded whitespace-pre-line break-keep">{notes}</p>
            </div>
          )}

          {/* STT 인사이트 */}
          {sttInsights && (
            <div>
              <span className="text-xs text-gray-500 block mb-1">STT 인사이트</span>
              <div className="text-sm bg-purple-50 p-2 rounded text-purple-700">
                ✓ AI 분석 완료
                {sttInsights.추가_업무 && sttInsights.추가_업무.length > 0 && (
                  <span className="ml-2">• 추가 업무 {sttInsights.추가_업무.length}개</span>
                )}
                {sttInsights.숨은_니즈 && sttInsights.숨은_니즈.length > 0 && (
                  <span className="ml-2">• 숨은 니즈 {sttInsights.숨은_니즈.length}개</span>
                )}
              </div>
            </div>
          )}
        </div>
      </SummarySection>

      {/* 최종 확인 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">저장 준비 완료</h3>
            <p className="mt-1 text-sm text-blue-700">
              모든 내용을 확인하셨다면 &quot;저장&quot; 버튼을 클릭하여 인터뷰를 완료하세요.
              저장 후에도 언제든지 수정할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
