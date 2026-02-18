'use client';

import type { JobTask } from '@/lib/schemas/interview';
import { createEmptyJobTask } from '@/lib/schemas/interview';
import FillExampleButton from './FillExampleButton';

// 일반 사무/서비스 기업 예시 데이터 (중소 유통 기업 시나리오)
const EXAMPLE_TASKS: Omit<JobTask, 'id'>[] = [
  {
    task_name: '고객 문의 응대 및 분류',
    task_description: `1. 카카오톡 채널, 전화, 이메일로 접수되는 고객 문의 응대
2. 문의 유형별 분류 (배송, 교환/반품, 제품 문의, 불만 등)
3. 자주 묻는 질문은 복사-붙여넣기로 응답, 특이 건은 담당자에게 전달
4. 문의 내역을 Excel에 수기로 기록하고 주간 현황 정리
5. 일 평균 40-60건 문의 처리`,
  },
  {
    task_name: '월간 매출 보고서 작성',
    task_description: `1. 쇼핑몰 관리자와 ERP에서 매출 데이터 추출
2. Excel로 채널별(자사몰, 쿠팡, 네이버) 매출 정리 및 전월 대비 분석
3. 피벗테이블로 상품별/기간별 매출 분석 후 차트 생성
4. PPT로 월간 매출 보고서 작성 (경영진 보고용)
5. 매월 초 3일간 보고서 작성에 집중`,
  },
  {
    task_name: 'SNS 마케팅 콘텐츠 제작',
    task_description: `1. 인스타그램, 블로그 등 채널별 콘텐츠 기획 및 작성
2. 신제품 소개, 프로모션 안내, 고객 후기 콘텐츠 제작
3. 상품 사진 편집 및 카드뉴스/배너 이미지 디자인
4. 주 3-4회 콘텐츠 발행, 댓글/DM 관리
5. 월간 콘텐츠 캘린더 작성 및 성과(조회수, 참여율) 정리`,
  },
  {
    task_name: '거래처 발주 및 재고 관리',
    task_description: `1. 거래처별 발주서 작성 및 이메일/팩스 발송
2. 입고 확인 후 Excel 재고 대장 업데이트
3. 주 1회 재고 실사 및 시스템 데이터 대조
4. 재고 부족 시 긴급 발주 처리
5. 월말 재고 현황 보고서 작성`,
  },
  {
    task_name: '내부 회의록 작성 및 업무 공유',
    task_description: `1. 주간 팀 회의, 월간 전체 회의 참석 및 회의록 작성
2. 회의 중 수기 메모 → 회의 후 Word로 정리 → 그룹웨어에 공유
3. 회의 결정사항 및 Action Item 추적 관리
4. 부서 간 업무 요청/공유 사항 정리 및 전달
5. 주 2-3회 회의, 회의록 작성에 회의당 30분-1시간 소요`,
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
                  placeholder="예: 고객 문의 응대 및 분류"
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
