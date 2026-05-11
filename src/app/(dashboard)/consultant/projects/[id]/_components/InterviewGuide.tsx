'use client';

import { useState } from 'react';
import { RefreshCw, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import { formatDateKR } from '@/lib/utils/date';
import type { GuideData, GuideQuestion } from '@/lib/schemas/interview-guide';
import { InterviewGuideEmpty } from './InterviewGuideEmpty';
import { GuideKeyPoints } from './GuideKeyPoints';
import { GuideQuestions } from './GuideQuestions';
import { GuideCautions } from './GuideCautions';
import { AnalysisProgress } from './AnalysisProgress';
import { generateInterviewGuide } from '../actions';

interface InterviewGuideProps {
  projectId: string;
  hasSelfAssessment: boolean;
  guideData: unknown | null;
  guideCreatedAt: string | null;
}

export function InterviewGuide({
  projectId,
  hasSelfAssessment,
  guideData: initialGuideData,
  guideCreatedAt,
}: InterviewGuideProps) {
  const [guideData, setGuideData] = useState<GuideData | null>(
    initialGuideData as GuideData | null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (guideData && !confirm('기존 분석 결과가 새 결과로 덮어써집니다. 계속하시겠습니까?')) {
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateInterviewGuide(projectId);
      if (result.success) {
        setGuideData(result.data);
        showSuccessToast('가이드 생성 완료', '사전 분석 가이드가 생성되었습니다.');
      } else {
        showErrorToast('생성 실패', result.error);
      }
    } catch {
      showErrorToast('생성 실패', TOAST_ERROR.NETWORK);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleQuestionsChange(updatedQuestions: GuideQuestion[]) {
    if (!guideData) return;
    setGuideData({ ...guideData, questions: updatedQuestions });
  }

  async function handleExportPDF() {
    if (!guideData) return;

    try {
      const { generateInterviewGuidePDF } = await import(
        '@/lib/services/export-interview-guide-pdf'
      );
      const blob = await generateInterviewGuidePDF(guideData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `사전분석_가이드.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showErrorToast('PDF 다운로드 실패', 'PDF 다운로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  // 가이드 미생성 상태
  if (!guideData) {
    return (
      <>
        {isGenerating && <AnalysisProgress />}
        <InterviewGuideEmpty
          hasSelfAssessment={hasSelfAssessment}
          onGenerate={handleGenerate}
        />
      </>
    );
  }

  return (
    <>
      {isGenerating && <AnalysisProgress />}

      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">인터뷰 사전 분석</h2>
            {guideCreatedAt && (
              <span className="text-xs text-gray-400">
                {formatDateKR(guideCreatedAt)} 생성
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              분석 재생성
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>

        {/* 기업 현황 요약 */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">기업 현황 요약</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{guideData.company_summary}</p>
        </div>

        {/* 핵심 파악 포인트 */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">핵심 파악 포인트</h3>
          <GuideKeyPoints keyPoints={guideData.key_points} />
        </div>

        {/* 추천 질문 */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            추천 질문 ({guideData.questions.length}개)
          </h3>
          <GuideQuestions
            projectId={projectId}
            questions={guideData.questions}
            onQuestionsChange={handleQuestionsChange}
          />
        </div>

        {/* 주의사항 */}
        <div className="rounded-lg border bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">인터뷰 시 주의사항</h3>
          <GuideCautions cautions={guideData.cautions} />
        </div>
      </div>
    </>
  );
}
