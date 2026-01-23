'use client';

import type { CompanyDetails } from '@/lib/schemas/interview';

interface StepCompanyDetailsProps {
  companyDetails: CompanyDetails;
  onCompanyDetailsChange: (details: CompanyDetails) => void;
}

export default function StepCompanyDetails({
  companyDetails,
  onCompanyDetailsChange,
}: StepCompanyDetailsProps) {
  const handleChange = (field: keyof CompanyDetails, value: unknown) => {
    onCompanyDetailsChange({ ...companyDetails, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기업 세부 정보</h2>
        <p className="text-sm text-gray-600 mb-6">
          인터뷰 대상 기업의 세부 정보를 입력해주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">부서명</label>
          <input
            type="text"
            value={companyDetails.department || ''}
            onChange={(e) => handleChange('department', e.target.value)}
            placeholder="예: 경영지원팀"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">팀 인원</label>
          <input
            type="number"
            min="1"
            value={companyDetails.team_size || ''}
            onChange={(e) => handleChange('team_size', parseInt(e.target.value) || undefined)}
            placeholder="예: 15"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">주요 사용 시스템</label>
        <input
          type="text"
          placeholder="예: ERP, MES, CRM (쉼표로 구분)"
          value={companyDetails.main_systems?.join(', ') || ''}
          onChange={(e) =>
            handleChange(
              'main_systems',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">쉼표로 구분하여 입력하세요.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">데이터 소스</label>
        <input
          type="text"
          placeholder="예: Oracle DB, Excel, CSV (쉼표로 구분)"
          value={companyDetails.data_sources?.join(', ') || ''}
          onChange={(e) =>
            handleChange(
              'data_sources',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">현재 사용 도구</label>
        <input
          type="text"
          placeholder="예: MS Office, 한글, SAP (쉼표로 구분)"
          value={companyDetails.current_tools?.join(', ') || ''}
          onChange={(e) =>
            handleChange(
              'current_tools',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">AI 도구 사용 경험</label>
        <textarea
          rows={2}
          value={companyDetails.ai_experience || ''}
          onChange={(e) => handleChange('ai_experience', e.target.value)}
          placeholder="예: ChatGPT 업무 활용 경험, 자동화 도구 경험 등"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">교육 이력</label>
        <textarea
          rows={2}
          value={companyDetails.training_history || ''}
          onChange={(e) => handleChange('training_history', e.target.value)}
          placeholder="예: 디지털 전환 교육 수료, Excel 고급 과정 이수 등"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}
