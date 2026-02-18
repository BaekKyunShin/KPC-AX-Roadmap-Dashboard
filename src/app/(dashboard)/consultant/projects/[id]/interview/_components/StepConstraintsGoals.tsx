'use client';

import { useState, useRef } from 'react';
import type { Constraint, ImprovementGoal, SttInsights } from '@/lib/schemas/interview';
import { createEmptyConstraint, createEmptyImprovementGoal } from '@/lib/schemas/interview';
import {
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
  ALLOWED_STT_FILE_EXTENSIONS,
} from '@/lib/constants/stt';
import FillExampleButton from './FillExampleButton';

// 일반 사무/서비스 기업 개선 목표 예시 텍스트 (중소 유통 기업 시나리오)
const EXAMPLE_GOALS_TEXT = `1. 고객 문의 응답 시간 40% 단축 (현재 평균 4시간 → 목표 2시간). 반복 문의는 AI로 자동 분류하고 응답 템플릿 자동 생성.
2. 월간 매출 보고서 작성 시간 70% 단축 (현재 2~3일 → 목표 반나절). 데이터 수집 → 분석 → 보고서 작성까지 반복 작업 자동화.
3. SNS 콘텐츠 제작 시간 50% 단축 (카드뉴스 2시간 → 1시간, 블로그 3시간 → 1.5시간). AI로 초안 생성 후 수정하는 방식으로 전환.
4. 회의록 작성 및 공유 시간 80% 단축 (현재 회의당 1시간 → 목표 10분). AI로 회의 내용 요약 및 Action Item 자동 정리.`;

// 일반 사무/서비스 기업 제약사항 예시 텍스트 (중소 유통 기업 시나리오)
const EXAMPLE_CONSTRAINTS_TEXT = `1. 고객 개인정보(이름, 연락처, 주소 등)를 외부 AI 서비스에 직접 입력 금지. 개인정보보호법 준수 필요.
2. 월 IT 예산 한정으로 유료 소프트웨어 추가 도입이 어려움. 무료 또는 기존 구독 중인 도구 범위 내에서 활용 희망.
3. 직원 대부분이 비개발자로, 코딩이 필요한 도구는 사용이 어려움. 클릭 기반의 쉬운 도구 위주로 교육 필요.`;

interface StepConstraintsGoalsProps {
  constraints: Constraint[];
  improvementGoals: ImprovementGoal[];
  notes: string;
  sttInsights: SttInsights | null;
  onConstraintsChange: (constraints: Constraint[]) => void;
  onImprovementGoalsChange: (goals: ImprovementGoal[]) => void;
  onNotesChange: (value: string) => void;
  onSttFileUpload: (text: string) => Promise<void>;
  onSttInsightsDelete: () => Promise<void>;
  isProcessingStt: boolean;
}

export default function StepConstraintsGoals({
  constraints,
  improvementGoals,
  notes,
  sttInsights,
  onConstraintsChange,
  onImprovementGoalsChange,
  onNotesChange,
  onSttFileUpload,
  onSttInsightsDelete,
  isProcessingStt,
}: StepConstraintsGoalsProps) {
  const [sttError, setSttError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Goal handlers - 첫 번째 항목만 사용
  const goalsText = improvementGoals[0]?.goal_description || '';

  const updateGoalsText = (value: string) => {
    if (improvementGoals.length === 0) {
      onImprovementGoalsChange([{ ...createEmptyImprovementGoal(), goal_description: value }]);
    } else {
      const updated = [...improvementGoals];
      updated[0] = { ...updated[0], goal_description: value };
      onImprovementGoalsChange(updated);
    }
  };

  const fillGoalExample = () => {
    updateGoalsText(EXAMPLE_GOALS_TEXT);
  };

  // Constraint handlers - 첫 번째 항목만 사용
  const constraintsText = constraints[0]?.description || '';

  const updateConstraintsText = (value: string) => {
    if (value === '') {
      onConstraintsChange([]);
    } else if (constraints.length === 0) {
      onConstraintsChange([{ ...createEmptyConstraint(), description: value }]);
    } else {
      const updated = [...constraints];
      updated[0] = { ...updated[0], description: value };
      onConstraintsChange(updated);
    }
  };

  const fillConstraintExample = () => {
    updateConstraintsText(EXAMPLE_CONSTRAINTS_TEXT);
  };

  // STT handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSttError(null);

    const hasValidExtension = ALLOWED_STT_FILE_EXTENSIONS.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      setSttError('txt 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > MAX_STT_FILE_SIZE_BYTES) {
      const currentSizeKB = Math.round(file.size / 1024);
      setSttError(`파일 크기가 너무 큽니다. 최대 ${MAX_STT_FILE_SIZE_KB}KB (현재: ${currentSizeKB}KB)`);
      return;
    }

    try {
      const text = await file.text();
      setFileName(file.name);
      await onSttFileUpload(text);
    } catch {
      setSttError('파일을 읽는 중 오류가 발생했습니다.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSttDelete = async () => {
    await onSttInsightsDelete();
    setFileName(null);
    setSttError(null);
  };

  return (
    <div className="space-y-8">
      {/* 개선 목표 섹션 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              개선 목표 <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              AI 도입을 통해 달성하고자 하는 목표를 입력해주세요.
            </p>
          </div>
          <FillExampleButton onClick={fillGoalExample} />
        </div>

        <textarea
          rows={6}
          value={goalsText}
          onChange={(e) => updateGoalsText(e.target.value)}
          required
          placeholder={`1. 고객 문의 응답 시간 40% 단축 (현재 평균 4시간 → 목표 2시간)
2. 월간 보고서 작성 시간 70% 단축 (현재 2~3일 → 목표 반나절)
3. SNS 콘텐츠 제작 시간 50% 단축 (카드뉴스 2시간 → 1시간)`}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y break-keep"
        />
      </div>

      <div className="border-t border-gray-200" />

      {/* 제약사항 섹션 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">제약사항</h2>
            <p className="text-sm text-gray-600 mt-1">
              AI 도입 시 고려해야 할 제약사항을 입력해주세요. (선택)
            </p>
          </div>
          <FillExampleButton onClick={fillConstraintExample} />
        </div>

        <textarea
          rows={6}
          value={constraintsText}
          onChange={(e) => updateConstraintsText(e.target.value)}
          placeholder={`1. 고객 개인정보를 외부 AI 서비스에 직접 입력 금지
2. 유료 소프트웨어 추가 도입 예산 없음, 무료 도구 위주 활용
3. 직원 대부분 비개발자, 코딩 필요 없는 도구만 가능`}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y break-keep"
        />
      </div>

      <div className="border-t border-gray-200" />

      {/* 추가 정보 섹션 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h2>

        {/* 추가 메모 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">메모</label>
          <textarea
            rows={6}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="기업 요구사항, 담당자 성향, 조직 분위기, 후속 미팅 일정 등 추가로 기록할 내용을 입력하세요."
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y break-keep"
          />
        </div>

        {/* STT 파일 업로드 */}
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">
              인터뷰 녹취록 (선택)
            </label>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            인터뷰 녹음을 STT로 변환한 텍스트 파일을 업로드하면, AI가 추가 인사이트를 추출합니다.
          </p>

          {sttError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {sttError}
            </div>
          )}

          {!sttInsights ? (
            <label className="block">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_STT_FILE_EXTENSIONS.join(',')}
                onChange={handleFileChange}
                disabled={isProcessingStt}
                className="hidden"
              />
              <div className={`flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isProcessingStt
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}>
                {isProcessingStt ? (
                  <div className="flex items-center text-gray-500">
                    <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>AI가 인사이트를 추출하는 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>클릭하여 txt 파일을 업로드 (최대 {MAX_STT_FILE_SIZE_KB}KB)</span>
                  </div>
                )}
              </div>
            </label>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-green-800">
                      인사이트 추출 완료
                      {fileName && <span className="font-normal text-green-600 ml-1">({fileName})</span>}
                    </p>
                    <div className="mt-1 text-xs text-green-700">
                      {sttInsights.추가_업무 && sttInsights.추가_업무.length > 0 && (
                        <span className="mr-2">• 추가 업무 {sttInsights.추가_업무.length}개</span>
                      )}
                      {sttInsights.숨은_니즈 && sttInsights.숨은_니즈.length > 0 && (
                        <span className="mr-2">• 숨은 니즈 {sttInsights.숨은_니즈.length}개</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSttDelete}
                  className="text-green-600 hover:text-red-600 transition-colors"
                  title="삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
