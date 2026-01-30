'use client';

import { useState, useRef } from 'react';
import type { SttInsights } from '@/lib/schemas/interview';
import {
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
  ALLOWED_STT_FILE_EXTENSIONS,
} from '@/lib/constants/stt';

// ============================================================================
// 타입 정의
// ============================================================================

interface StepAdditionalInfoProps {
  customerRequirements: string;
  notes: string;
  sttInsights: SttInsights | null;
  onCustomerRequirementsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSttFileUpload: (text: string) => Promise<void>;
  onSttInsightsDelete: () => Promise<void>;
  isProcessingStt: boolean;
}

// ============================================================================
// 인사이트 표시 헬퍼
// ============================================================================

/** 인사이트 항목 존재 여부 확인 */
function hasInsightItems(items: string[] | undefined): items is string[] {
  return Array.isArray(items) && items.length > 0;
}

/** 인사이트 요약 항목 */
interface InsightSummaryItem {
  key: keyof SttInsights;
  label: string;
  isArray: boolean;
}

const INSIGHT_SUMMARY_ITEMS: InsightSummaryItem[] = [
  { key: '추가_업무', label: '추가 업무', isArray: true },
  { key: '추가_페인포인트', label: '추가 페인포인트', isArray: true },
  { key: '숨은_니즈', label: '숨은 니즈', isArray: true },
  { key: '조직_맥락', label: '조직 맥락', isArray: false },
  { key: 'AI_태도', label: 'AI 도입 태도', isArray: false },
  { key: '주요_인용', label: '주요 인용', isArray: true },
];

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/** 인사이트 요약 표시 */
function InsightsSummary({ insights }: { insights: SttInsights }) {
  return (
    <div className="mt-2 text-sm text-green-700 space-y-1">
      {INSIGHT_SUMMARY_ITEMS.map(({ key, label, isArray }) => {
        const value = insights[key];
        if (isArray) {
          const items = value as string[] | undefined;
          if (!hasInsightItems(items)) return null;
          return <p key={key}>• {label}: {items.length}개</p>;
        } else {
          if (!value) return null;
          return <p key={key}>• {label}: 확인됨</p>;
        }
      })}
    </div>
  );
}

/** 인사이트 상세 표시 */
function InsightsDetail({ insights }: { insights: SttInsights }) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      {hasInsightItems(insights.추가_업무) && (
        <InsightListSection title="추가 업무" items={insights.추가_업무} />
      )}
      {hasInsightItems(insights.추가_페인포인트) && (
        <InsightListSection title="추가 페인포인트" items={insights.추가_페인포인트} />
      )}
      {hasInsightItems(insights.숨은_니즈) && (
        <InsightListSection title="숨은 니즈" items={insights.숨은_니즈} />
      )}
      {insights.조직_맥락 && (
        <InsightTextSection title="조직 맥락" text={insights.조직_맥락} />
      )}
      {insights.AI_태도 && (
        <InsightTextSection title="AI 도입 태도" text={insights.AI_태도} />
      )}
      {hasInsightItems(insights.주요_인용) && (
        <InsightQuotesSection quotes={insights.주요_인용} />
      )}
    </div>
  );
}

/** 리스트 형태 인사이트 섹션 */
function InsightListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="font-medium text-gray-700">{title}</h5>
      <ul className="mt-1 list-disc list-inside text-gray-600">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** 텍스트 형태 인사이트 섹션 */
function InsightTextSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h5 className="font-medium text-gray-700">{title}</h5>
      <p className="mt-1 text-gray-600">{text}</p>
    </div>
  );
}

/** 인용문 섹션 */
function InsightQuotesSection({ quotes }: { quotes: string[] }) {
  return (
    <div>
      <h5 className="font-medium text-gray-700">주요 인용</h5>
      <ul className="mt-1 space-y-1 text-gray-600">
        {quotes.map((quote, i) => (
          <li key={i} className="italic">{quote}</li>
        ))}
      </ul>
    </div>
  );
}

/** 파일 업로드 영역 */
function FileUploadArea({
  isProcessing,
  fileInputRef,
  onFileChange,
}: {
  isProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center space-x-3">
      <label className="flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_STT_FILE_EXTENSIONS.join(',')}
          onChange={onFileChange}
          disabled={isProcessing}
          className="hidden"
        />
        <div className={`flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isProcessing
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}>
          {isProcessing ? (
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
              <span>txt 파일을 클릭하여 업로드</span>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

/** 인사이트 완료 카드 */
function InsightsCompletedCard({
  insights,
  fileName,
  onDelete,
}: {
  insights: SttInsights;
  fileName: string | null;
  onDelete: () => void;
}) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-green-800">
              인사이트 추출 완료
              {fileName && <span className="font-normal text-green-600 ml-2">({fileName})</span>}
            </h4>
            <InsightsSummary insights={insights} />
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-green-600 hover:text-red-600 transition-colors"
          title="삭제"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <details className="mt-4">
        <summary className="text-sm text-green-700 cursor-pointer hover:text-green-800">
          상세 내용 보기
        </summary>
        <InsightsDetail insights={insights} />
      </details>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function StepAdditionalInfo({
  customerRequirements,
  notes,
  sttInsights,
  onCustomerRequirementsChange,
  onNotesChange,
  onSttFileUpload,
  onSttInsightsDelete,
  isProcessingStt,
}: StepAdditionalInfoProps) {
  const [sttError, setSttError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSttError(null);

    // 파일 형식 체크
    const hasValidExtension = ALLOWED_STT_FILE_EXTENSIONS.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      setSttError('txt 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 체크
    if (file.size > MAX_STT_FILE_SIZE_BYTES) {
      const currentSizeKB = Math.round(file.size / 1024);
      setSttError(`파일 크기가 너무 큽니다. 최대 ${MAX_STT_FILE_SIZE_KB}KB까지 업로드 가능합니다. (현재: ${currentSizeKB}KB)`);
      return;
    }

    try {
      const text = await file.text();
      setFileName(file.name);
      await onSttFileUpload(text);
    } catch {
      setSttError('파일을 읽는 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    await onSttInsightsDelete();
    setFileName(null);
    setSttError(null);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h2>
        <p className="text-sm text-gray-600 mb-6">
          기업의 특별 요청사항 및 인터뷰 메모를 입력해주세요.
        </p>
      </div>

      {/* 기업 요구사항 */}
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

      {/* 인터뷰 메모 */}
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

      {/* STT 파일 업로드 섹션 */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            인터뷰 녹취록 (선택)
          </label>
          <span className="text-xs text-gray-500">최대 {MAX_STT_FILE_SIZE_KB}KB</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          인터뷰 녹음을 STT로 변환한 텍스트 파일을 업로드하면, AI가 추가 인사이트를 추출하여 로드맵 생성에 활용합니다.
        </p>

        {sttError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {sttError}
          </div>
        )}

        {!sttInsights ? (
          <FileUploadArea
            isProcessing={isProcessingStt}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
          />
        ) : (
          <InsightsCompletedCard
            insights={sttInsights}
            fileName={fileName}
            onDelete={handleDelete}
          />
        )}
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
