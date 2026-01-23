'use client';

interface StepBasicInfoProps {
  interviewDate: string;
  onInterviewDateChange: (date: string) => void;
}

export default function StepBasicInfo({
  interviewDate,
  onInterviewDateChange,
}: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <p className="text-sm text-gray-600 mb-6">
          인터뷰 기본 정보를 입력해주세요.
        </p>
      </div>

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
    </div>
  );
}
