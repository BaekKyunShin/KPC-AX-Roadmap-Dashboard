'use client';

interface StepAdditionalInfoProps {
  customerRequirements: string;
  notes: string;
  onCustomerRequirementsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export default function StepAdditionalInfo({
  customerRequirements,
  notes,
  onCustomerRequirementsChange,
  onNotesChange,
}: StepAdditionalInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h2>
        <p className="text-sm text-gray-600 mb-6">
          기업의 특별 요청사항 및 인터뷰 메모를 입력해주세요.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">기업 요구사항</label>
        <textarea
          rows={4}
          value={customerRequirements}
          onChange={(e) => onCustomerRequirementsChange(e.target.value)}
          placeholder="기업에서 특별히 요청한 사항을 기록하세요.&#10;예: 특정 부서 우선 적용 요청, 특정 업무 자동화 희망 등"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          기업의 특별한 요구사항이나 우선순위가 있으면 기록하세요.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">인터뷰 메모</label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="인터뷰 중 추가로 메모할 내용을 기록하세요.&#10;예: 담당자 연락처, 후속 미팅 일정, 특이사항 등"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          인터뷰 중 기록해야 할 추가 내용을 자유롭게 작성하세요.
        </p>
      </div>

      {/* 완료 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">마지막 단계입니다</h3>
            <p className="mt-1 text-sm text-blue-700">
              모든 정보를 확인한 후 &quot;저장&quot; 버튼을 클릭하여 인터뷰를 완료하세요.
              저장 후에도 언제든지 수정할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
