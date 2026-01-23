'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { saveInterview, getInterview } from './actions';
import {
  type JobTask,
  type PainPoint,
  type Constraint,
  type ImprovementGoal,
  type CompanyDetails,
  createEmptyJobTask,
  createEmptyPainPoint,
  createEmptyConstraint,
  createEmptyImprovementGoal,
} from '@/lib/schemas/interview';

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: '매일' },
  { value: 'WEEKLY', label: '매주' },
  { value: 'MONTHLY', label: '매월' },
  { value: 'QUARTERLY', label: '분기별' },
  { value: 'YEARLY', label: '연간' },
  { value: 'AD_HOC', label: '비정기' },
];

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

const CONSTRAINT_TYPE_OPTIONS = [
  { value: 'DATA', label: '데이터' },
  { value: 'SYSTEM', label: '시스템' },
  { value: 'SECURITY', label: '보안' },
  { value: 'PERMISSION', label: '권한' },
  { value: 'OTHER', label: '기타' },
];

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    department: '',
    team_size: undefined,
    main_systems: [],
    data_sources: [],
    current_tools: [],
    ai_experience: '',
    training_history: '',
  });
  const [jobTasks, setJobTasks] = useState<JobTask[]>([createEmptyJobTask()]);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([createEmptyPainPoint()]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [improvementGoals, setImprovementGoals] = useState<ImprovementGoal[]>([createEmptyImprovementGoal()]);
  const [notes, setNotes] = useState('');
  const [customerRequirements, setCustomerRequirements] = useState('');

  // 기존 인터뷰 데이터 로드
  useEffect(() => {
    async function loadInterview() {
      const data = await getInterview(caseId);
      if (data) {
        setInterviewDate(data.interview_date);
        setCompanyDetails(data.company_details as CompanyDetails || {});
        setJobTasks((data.job_tasks as JobTask[]) || [createEmptyJobTask()]);
        setPainPoints((data.pain_points as PainPoint[]) || [createEmptyPainPoint()]);
        setConstraints((data.constraints as Constraint[]) || []);
        setImprovementGoals((data.improvement_goals as ImprovementGoal[]) || [createEmptyImprovementGoal()]);
        setNotes(data.notes || '');
        setCustomerRequirements(data.customer_requirements || '');
      }
      setIsFetching(false);
    }
    loadInterview();
  }, [caseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await saveInterview(caseId, {
      interview_date: interviewDate,
      company_details: companyDetails,
      job_tasks: jobTasks,
      pain_points: painPoints,
      constraints: constraints.length > 0 ? constraints : undefined,
      improvement_goals: improvementGoals,
      notes,
      customer_requirements: customerRequirements,
    });

    if (result.success) {
      router.push(`/consultant/cases/${caseId}`);
      router.refresh();
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }

    setIsLoading(false);
  }

  // Helper functions for array management
  function updateJobTask(index: number, field: keyof JobTask, value: string | number) {
    const updated = [...jobTasks];
    updated[index] = { ...updated[index], [field]: value };
    setJobTasks(updated);
  }

  function updatePainPoint(index: number, field: keyof PainPoint, value: string | number) {
    const updated = [...painPoints];
    updated[index] = { ...updated[index], [field]: value };
    setPainPoints(updated);
  }

  function updateConstraint(index: number, field: keyof Constraint, value: string) {
    const updated = [...constraints];
    updated[index] = { ...updated[index], [field]: value };
    setConstraints(updated);
  }

  function updateGoal(index: number, field: keyof ImprovementGoal, value: string) {
    const updated = [...improvementGoals];
    updated[index] = { ...updated[index], [field]: value };
    setImprovementGoals(updated);
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/consultant/cases/${caseId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 케이스로 돌아가기
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">현장 인터뷰 입력</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 인터뷰 날짜 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">인터뷰 날짜 *</label>
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              required
              className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* 기업 세부 정보 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기업 세부 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">부서명</label>
              <input
                type="text"
                value={companyDetails.department || ''}
                onChange={(e) => setCompanyDetails({ ...companyDetails, department: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">팀 인원</label>
              <input
                type="number"
                min="1"
                value={companyDetails.team_size || ''}
                onChange={(e) => setCompanyDetails({ ...companyDetails, team_size: parseInt(e.target.value) || undefined })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">주요 사용 시스템</label>
              <input
                type="text"
                placeholder="예: ERP, MES, CRM (쉼표로 구분)"
                value={companyDetails.main_systems?.join(', ') || ''}
                onChange={(e) => setCompanyDetails({
                  ...companyDetails,
                  main_systems: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">AI 도구 사용 경험</label>
              <textarea
                rows={2}
                value={companyDetails.ai_experience || ''}
                onChange={(e) => setCompanyDetails({ ...companyDetails, ai_experience: e.target.value })}
                placeholder="예: ChatGPT 업무 활용 경험, 자동화 도구 경험 등"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* 세부업무 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">세부업무 *</h2>
            <button
              type="button"
              onClick={() => setJobTasks([...jobTasks, createEmptyJobTask()])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + 업무 추가
            </button>
          </div>
          <div className="space-y-4">
            {jobTasks.map((task, index) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">업무 {index + 1}</span>
                  {jobTasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setJobTasks(jobTasks.filter((_, i) => i !== index))}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500">업무명 *</label>
                    <input
                      type="text"
                      value={task.task_name}
                      onChange={(e) => updateJobTask(index, 'task_name', e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">수행 빈도</label>
                    <select
                      value={task.frequency || 'DAILY'}
                      onChange={(e) => updateJobTask(index, 'frequency', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500">업무 설명 *</label>
                    <textarea
                      rows={2}
                      value={task.task_description}
                      onChange={(e) => updateJobTask(index, 'task_description', e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">현재 산출물</label>
                    <input
                      type="text"
                      value={task.current_output || ''}
                      onChange={(e) => updateJobTask(index, 'current_output', e.target.value)}
                      placeholder="예: 엑셀 보고서, 수기 문서"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">소요 시간 (시간)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={task.time_spent_hours || ''}
                      onChange={(e) => updateJobTask(index, 'time_spent_hours', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 페인포인트 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">페인포인트 *</h2>
            <button
              type="button"
              onClick={() => setPainPoints([...painPoints, createEmptyPainPoint()])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + 페인포인트 추가
            </button>
          </div>
          <div className="space-y-4">
            {painPoints.map((point, index) => (
              <div key={point.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">페인포인트 {index + 1}</span>
                  {painPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPainPoints(painPoints.filter((_, i) => i !== index))}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500">설명 *</label>
                    <input
                      type="text"
                      value={point.description}
                      onChange={(e) => updatePainPoint(index, 'description', e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">심각도</label>
                    <select
                      value={point.severity}
                      onChange={(e) => updatePainPoint(index, 'severity', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {SEVERITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">우선순위 (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={point.priority}
                      onChange={(e) => updatePainPoint(index, 'priority', parseInt(e.target.value) || 5)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500">영향도</label>
                    <input
                      type="text"
                      value={point.impact || ''}
                      onChange={(e) => updatePainPoint(index, 'impact', e.target.value)}
                      placeholder="예: 월 10시간 추가 소요"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 제약사항 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">데이터/시스템 제약</h2>
            <button
              type="button"
              onClick={() => setConstraints([...constraints, createEmptyConstraint()])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + 제약사항 추가
            </button>
          </div>
          {constraints.length > 0 ? (
            <div className="space-y-4">
              {constraints.map((constraint, index) => (
                <div key={constraint.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-700">제약사항 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setConstraints(constraints.filter((_, i) => i !== index))}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500">유형</label>
                      <select
                        value={constraint.type}
                        onChange={(e) => updateConstraint(index, 'type', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {CONSTRAINT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">심각도</label>
                      <select
                        value={constraint.severity}
                        onChange={(e) => updateConstraint(index, 'severity', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {SEVERITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs text-gray-500">설명 *</label>
                      <input
                        type="text"
                        value={constraint.description}
                        onChange={(e) => updateConstraint(index, 'description', e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">제약사항이 없으면 비워두세요.</p>
          )}
        </div>

        {/* 개선 목표 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">개선 목표 *</h2>
            <button
              type="button"
              onClick={() => setImprovementGoals([...improvementGoals, createEmptyImprovementGoal()])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + 목표 추가
            </button>
          </div>
          <div className="space-y-4">
            {improvementGoals.map((goal, index) => (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">개선 목표 {index + 1}</span>
                  {improvementGoals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setImprovementGoals(improvementGoals.filter((_, i) => i !== index))}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500">목표 *</label>
                    <input
                      type="text"
                      value={goal.goal_description}
                      onChange={(e) => updateGoal(index, 'goal_description', e.target.value)}
                      required
                      placeholder="예: 보고서 작성 시간 50% 단축"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">KPI 지표</label>
                    <input
                      type="text"
                      value={goal.kpi || ''}
                      onChange={(e) => updateGoal(index, 'kpi', e.target.value)}
                      placeholder="예: 보고서 작성 시간"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">측정 방법</label>
                    <input
                      type="text"
                      value={goal.measurement_method || ''}
                      onChange={(e) => updateGoal(index, 'measurement_method', e.target.value)}
                      placeholder="예: 타임 트래킹"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Before 수치</label>
                    <input
                      type="text"
                      value={goal.before_value || ''}
                      onChange={(e) => updateGoal(index, 'before_value', e.target.value)}
                      placeholder="예: 주 10시간"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">목표 수치</label>
                    <input
                      type="text"
                      value={goal.target_value || ''}
                      onChange={(e) => updateGoal(index, 'target_value', e.target.value)}
                      placeholder="예: 주 5시간"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 기업 요구사항 & 메모 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">기업 요구사항</label>
              <textarea
                rows={3}
                value={customerRequirements}
                onChange={(e) => setCustomerRequirements(e.target.value)}
                placeholder="기업에서 특별히 요청한 사항을 기록하세요."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">메모</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="인터뷰 중 추가로 메모할 내용을 기록하세요."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/consultant/cases/${caseId}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
