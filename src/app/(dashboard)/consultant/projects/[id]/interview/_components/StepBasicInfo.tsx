'use client';

import type { InterviewParticipant } from '@/lib/schemas/interview';
import { createEmptyParticipant } from '@/lib/schemas/interview';

interface StepBasicInfoProps {
  interviewDate: string;
  participants: InterviewParticipant[];
  onInterviewDateChange: (date: string) => void;
  onParticipantsChange: (participants: InterviewParticipant[]) => void;
}

export default function StepBasicInfo({
  interviewDate,
  participants,
  onInterviewDateChange,
  onParticipantsChange,
}: StepBasicInfoProps) {
  const updateParticipant = (index: number, field: keyof InterviewParticipant, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    onParticipantsChange(updated);
  };

  const addParticipant = () => {
    onParticipantsChange([...participants, createEmptyParticipant()]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      onParticipantsChange(participants.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <p className="text-sm text-gray-600 mb-6">
          인터뷰 날짜와 참석자 정보를 입력해주세요.
        </p>
      </div>

      {/* 인터뷰 날짜 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          인터뷰 날짜 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={interviewDate}
          onChange={(e) => onInterviewDateChange(e.target.value)}
          required
          className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-2 text-xs text-gray-500">
          현장 인터뷰가 진행된 날짜를 선택하세요.
        </p>
      </div>

      {/* 인터뷰 참석자 */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              인터뷰 참석자 <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              인터뷰에 참석한 기업 담당자 정보를 입력하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={addParticipant}
            className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            참석자 추가
          </button>
        </div>

        <div className="space-y-3">
          {participants.map((participant, index) => (
            <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                    placeholder="이름"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={participant.position || ''}
                    onChange={(e) => updateParticipant(index, 'position', e.target.value)}
                    placeholder="직급/직책 (예: 대표이사, 팀장)"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParticipant(index)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title="삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
