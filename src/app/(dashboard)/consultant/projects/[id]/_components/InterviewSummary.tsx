import { SeverityBadge } from '@/components/interview/SummaryComponents';

// =============================================================================
// 타입 정의 (Supabase JSON 컬럼에서 캐스팅된 데이터)
// =============================================================================

interface CompanyDetailsData {
  systems_and_tools?: string[];
  ai_experience?: string;
}

interface JobTaskData {
  task_name: string;
  task_description: string;
}

interface PainPointData {
  description: string;
  severity: string;
}

interface ImprovementGoalData {
  goal_description: string;
  kpi?: string;
  target_value?: string;
}

interface ConstraintData {
  description: string;
}

export interface InterviewSummaryProps {
  interviewDate: string;
  companyDetails: CompanyDetailsData | null;
  jobTasks: JobTaskData[];
  painPoints: PainPointData[];
  improvementGoals: ImprovementGoalData[];
  constraints: ConstraintData[];
  notes: string | null;
  customerRequirements: string | null;
}

// =============================================================================
// 상수
// =============================================================================

const SEVERITY_CARD_STYLES: Record<string, string> = {
  HIGH: 'border-l-red-400 bg-red-50/60',
  MEDIUM: 'border-l-yellow-400 bg-yellow-50/60',
  LOW: 'border-l-green-400 bg-green-50/60',
};

// =============================================================================
// 컴포넌트
// =============================================================================

export function InterviewSummary({
  interviewDate,
  companyDetails,
  jobTasks,
  painPoints,
  improvementGoals,
  constraints,
  notes,
  customerRequirements,
}: InterviewSummaryProps) {
  const hasCompanyDetails =
    (companyDetails?.systems_and_tools?.length ?? 0) > 0 || !!companyDetails?.ai_experience;
  const firstConstraintDesc = constraints[0]?.description || null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">인터뷰 정보</h2>
        <span className="text-sm text-gray-500">
          {new Date(interviewDate).toLocaleDateString('ko-KR')} 인터뷰
        </span>
      </div>

      <div className="space-y-5">
        {/* 시스템/AI 활용 경험 */}
        {hasCompanyDetails && companyDetails && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">시스템/AI 활용 경험</h3>
            <div className="space-y-3">
              {companyDetails.systems_and_tools && companyDetails.systems_and_tools.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">주요 사용 시스템/도구</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {companyDetails.systems_and_tools.map((item) => (
                      <span key={item} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {companyDetails.ai_experience && (
                <div>
                  <span className="text-xs text-gray-500">AI 도구 사용 경험</span>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-line break-keep break-words">
                    {companyDetails.ai_experience}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 세부업무 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">세부업무</h3>
          <ul className="space-y-2.5">
            {jobTasks.map((task, idx) => (
              <li key={idx} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600 flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{task.task_name}</p>
                    {task.task_description && (
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-line break-keep break-words">
                        {task.task_description}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 페인포인트 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">페인포인트</h3>
          <ul className="space-y-2.5">
            {painPoints.map((point, idx) => (
              <li
                key={idx}
                className={`rounded-lg border-l-[3px] p-3 ${SEVERITY_CARD_STYLES[point.severity] ?? 'border-l-gray-300 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line break-keep break-words">
                    {point.description}
                  </p>
                  <SeverityBadge severity={point.severity} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 개선 목표 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">개선 목표</h3>
          {improvementGoals.map((goal, idx) => (
            <div key={idx} className="bg-green-50/60 p-3 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-line break-keep break-words">
                {goal.goal_description}
              </p>
              {goal.kpi && (
                <span className="mt-1.5 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  KPI: {goal.kpi} {goal.target_value && `→ ${goal.target_value}`}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 제약사항 */}
        {firstConstraintDesc && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">제약사항</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-line break-keep break-words">
                {firstConstraintDesc}
              </p>
            </div>
          </div>
        )}

        {/* 메모 */}
        {notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">메모</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 whitespace-pre-line break-keep break-words">
                {notes}
              </p>
            </div>
          </div>
        )}
      </div>

      {customerRequirements && (
        <div className="mt-5 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">기업 요구사항</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line break-keep break-words">
            {customerRequirements}
          </p>
        </div>
      )}
    </div>
  );
}
