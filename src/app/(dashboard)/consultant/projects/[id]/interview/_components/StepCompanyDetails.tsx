'use client';

import { useState } from 'react';
import type { CompanyDetails } from '@/lib/schemas/interview';
import { SYSTEM_TOOL_PRESETS } from '@/lib/schemas/interview';

interface StepCompanyDetailsProps {
  companyDetails: CompanyDetails;
  onCompanyDetailsChange: (details: CompanyDetails) => void;
}

// 예시 데이터 (자동차 부품 1차 협력사 품질팀 시나리오)
const EXAMPLE_COMPANY_DETAILS: CompanyDetails = {
  systems_and_tools: [
    'MS Office (Excel, Word, PPT)',
    'MES (제조실행시스템)',
    'ERP (더존 Smart A)',
    '그룹웨어 (하이웍스)',
    '전자결재',
    'CAD (AutoCAD)',
  ],
  ai_experience: `• 경험 없음 - 품질팀 내 AI 도구 사용 경험 없음
• 일부 직원이 개인적으로 ChatGPT 사용해본 적 있으나, 회사 업무에는 보안 문제로 사용 금지`,
};

// 태그 입력 컴포넌트
function TagInput({
  label,
  tags,
  presets,
  placeholder,
  onChange,
}: {
  label: string;
  tags: string[];
  presets: readonly string[];
  placeholder: string;
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const availablePresets = presets.filter((p) => !tags.includes(p));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {/* 선택된 태그 표시 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1.5 hover:text-blue-600"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {/* 입력 필드 */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowPresets(true)}
          onBlur={() => setTimeout(() => setShowPresets(false), 200)}
          placeholder={placeholder}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* 프리셋 드롭다운 */}
        {showPresets && availablePresets.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            <div className="p-2">
              <p className="text-xs text-gray-500 mb-2">자주 사용하는 항목:</p>
              <div className="flex flex-wrap gap-1.5">
                {availablePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(preset);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Enter 키로 추가하거나 위의 프리셋을 클릭하세요.
      </p>
    </div>
  );
}

export default function StepCompanyDetails({
  companyDetails,
  onCompanyDetailsChange,
}: StepCompanyDetailsProps) {
  const handleChange = (field: keyof CompanyDetails, value: unknown) => {
    onCompanyDetailsChange({ ...companyDetails, [field]: value });
  };

  const fillExample = () => {
    onCompanyDetailsChange(EXAMPLE_COMPANY_DETAILS);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">시스템/AI 활용 경험</h2>
          <p className="text-sm text-gray-600">
            기업에서 사용 중인 시스템/도구와 AI 활용 경험을 입력해주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={fillExample}
          className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          title="예시 데이터로 채우기"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          예시 채우기
        </button>
      </div>

      {/* 주요 사용 시스템/도구 */}
      <TagInput
        label="주요 사용 시스템/도구"
        tags={companyDetails.systems_and_tools || []}
        presets={SYSTEM_TOOL_PRESETS}
        placeholder="시스템 또는 도구 이름 입력 후 Enter"
        onChange={(tags) => handleChange('systems_and_tools', tags)}
      />

      {/* AI 도구 사용 경험 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI 도구 사용 경험 <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={6}
          value={companyDetails.ai_experience || ''}
          onChange={(e) => handleChange('ai_experience', e.target.value)}
          required
          placeholder="예:
• 경험 없음 - AI 도구를 사용해본 적 없음
• ChatGPT: 주간보고서 요약, 회의록 초안 작성, 이메일 초안 작성
• Copilot: 매출 데이터 분석 및 시각화
• 뤼튼/클로바X: 회의록 정리, 마케팅 자료 제작"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 break-keep"
        />
      </div>
    </div>
  );
}
