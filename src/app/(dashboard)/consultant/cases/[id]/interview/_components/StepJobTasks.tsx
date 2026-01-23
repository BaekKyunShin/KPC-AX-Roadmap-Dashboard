'use client';

import type { JobTask } from '@/lib/schemas/interview';
import { createEmptyJobTask } from '@/lib/schemas/interview';

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: '매일' },
  { value: 'WEEKLY', label: '매주' },
  { value: 'MONTHLY', label: '매월' },
  { value: 'QUARTERLY', label: '분기별' },
  { value: 'YEARLY', label: '연간' },
  { value: 'AD_HOC', label: '비정기' },
];

interface StepJobTasksProps {
  jobTasks: JobTask[];
  onJobTasksChange: (tasks: JobTask[]) => void;
}

export default function StepJobTasks({
  jobTasks,
  onJobTasksChange,
}: StepJobTasksProps) {
  const updateTask = (index: number, field: keyof JobTask, value: string | number) => {
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">세부업무</h2>
            <p className="text-sm text-gray-600 mt-1">
              인터뷰 대상의 세부 업무를 입력해주세요.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  업무명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={task.task_name}
                  onChange={(e) => updateTask(index, 'task_name', e.target.value)}
                  required
                  placeholder="예: 월간 매출 보고서 작성"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">수행 빈도</label>
                <select
                  value={task.frequency || 'DAILY'}
                  onChange={(e) => updateTask(index, 'frequency', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700">
                  업무 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={task.task_description}
                  onChange={(e) => updateTask(index, 'task_description', e.target.value)}
                  required
                  placeholder="업무의 상세 내용을 설명해주세요."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">현재 산출물</label>
                <input
                  type="text"
                  value={task.current_output || ''}
                  onChange={(e) => updateTask(index, 'current_output', e.target.value)}
                  placeholder="예: 엑셀 보고서, 수기 문서"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">소요 시간 (시간)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={task.time_spent_hours || ''}
                  onChange={(e) => updateTask(index, 'time_spent_hours', parseFloat(e.target.value) || 0)}
                  placeholder="예: 4"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
