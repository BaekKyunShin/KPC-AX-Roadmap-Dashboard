'use client';

import type { JobTask } from '@/lib/schemas/interview';
import { createEmptyJobTask } from '@/lib/schemas/interview';
import FillExampleButton from './FillExampleButton';

// 자동차 부품 품질관리 예시 데이터 (1차 협력사 품질팀 시나리오)
const EXAMPLE_TASKS: Omit<JobTask, 'id'>[] = [
  {
    task_name: '입고 부품 수입검사',
    task_description: `1. 2차 협력사에서 입고되는 원자재/부품의 품질검사 수행
2. CMM(3차원 측정기)으로 치수 측정, 외관 검사, 재질 성적서 확인
3. 검사 결과를 Excel에 수기 입력 후 품질관리 시스템에 등록
4. 불합격 시 부적합 보고서(NCR) 작성 및 2차 협력사에 반품 통보
5. 일 평균 30-50건의 입고 LOT 처리`,
  },
  {
    task_name: '공정 내 품질검사',
    task_description: `1. 프레스, 용접, 도장, 조립 공정별 중간 품질검사 수행
2. SPC(통계적 공정관리) 데이터 기록 및 Cpk 지수 모니터링
3. 검사 항목: 치수, 외관, 토크값, 용접 강도, 도막 두께 등
4. 이상 발생 시 라인 정지 및 원인 분석, 시정조치 실시
5. 검사 데이터를 MES에 입력하고 일일 품질 현황 정리`,
  },
  {
    task_name: '완제품 출하검사',
    task_description: `1. OEM(현대차, 기아 등) 납품 전 최종 품질검사 수행
2. 외관 검사, 기능 검사, 포장 상태 확인
3. 출하검사 성적서 작성 및 품질 보증서 발행
4. 검사 체크리스트 50개 항목 확인 후 합격 판정
5. 불합격 시 재작업 지시 및 재검사 수행`,
  },
  {
    task_name: '품질 데이터 분석 및 보고서 작성',
    task_description: `1. 일간/주간/월간 품질 현황 보고서 작성
2. MES에서 품질 데이터 추출 → Excel로 분석 → PPT 보고서 작성
3. 불량률 추이 분석, 파레토 차트, 4M 원인 분석 수행
4. OEM 품질 회의용 자료 및 경영진 보고용 KPI 대시보드 업데이트
5. 주 1회 품질 현황 보고, 월 1회 품질 실적 보고`,
  },
  {
    task_name: '고객 클레임 대응 및 시정조치',
    task_description: `1. OEM으로부터 접수된 품질 클레임 분석 및 원인 조사
2. 8D 보고서 작성 (문제 정의, 원인 분석, 시정조치, 재발 방지)
3. 클레임 부품 회수 및 분석, 불량 재현 테스트 수행
4. 시정조치 이행 확인 및 유효성 검증
5. OEM 품질 포털에 대응 결과 등록 (기한 내 회신 필수)`,
  },
];

interface StepJobTasksProps {
  jobTasks: JobTask[];
  onJobTasksChange: (tasks: JobTask[]) => void;
}

export default function StepJobTasks({
  jobTasks,
  onJobTasksChange,
}: StepJobTasksProps) {
  const updateTask = (index: number, field: keyof JobTask, value: string | number | undefined) => {
    const updated = [...jobTasks];
    updated[index] = { ...updated[index], [field]: value };
    onJobTasksChange(updated);
  };

  const addTask = () => {
    onJobTasksChange([...jobTasks, createEmptyJobTask()]);
  };

  const removeTask = (index: number) => {
    if (jobTasks.length > 1) {
      onJobTasksChange(jobTasks.filter((_, i) => i !== index));
    }
  };

  const fillExample = (index: number) => {
    const example = EXAMPLE_TASKS[index % EXAMPLE_TASKS.length];
    const updated = [...jobTasks];
    updated[index] = {
      ...updated[index],
      ...example,
    };
    onJobTasksChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">세부업무</h2>
            <p className="text-sm text-gray-600 mt-1">
              AI 교육으로 개선하고자 하는 세부 업무를 입력해주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={addTask}
            className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            업무 추가
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {jobTasks.map((task, index) => (
          <div key={task.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center mr-2">
                  {index + 1}
                </span>
                업무 {index + 1}
              </h3>
              <div className="flex items-center gap-2">
                <FillExampleButton onClick={() => fillExample(index)} />
                {jobTasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    삭제
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* 업무명 */}
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  업무명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={task.task_name}
                  onChange={(e) => updateTask(index, 'task_name', e.target.value)}
                  required
                  placeholder="예: 입고 부품 수입검사"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 업무 설명 */}
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  업무 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={task.task_description}
                  onChange={(e) => updateTask(index, 'task_description', e.target.value)}
                  required
                  placeholder="업무의 상세 내용, 처리하는 데이터, 관련 시스템, 검사 항목 등을 구체적으로 설명해주세요."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 break-keep"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
