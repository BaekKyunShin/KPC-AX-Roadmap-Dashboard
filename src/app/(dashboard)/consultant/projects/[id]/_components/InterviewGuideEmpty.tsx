import { Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterviewGuideEmptyProps {
  hasSelfAssessment: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function InterviewGuideEmpty({
  hasSelfAssessment,
  isGenerating,
  onGenerate,
}: InterviewGuideEmptyProps) {
  if (!hasSelfAssessment) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-6 py-16">
        <Lock className="h-10 w-10 text-gray-300" />
        <p className="mt-4 text-sm font-medium text-gray-500">
          자가진단 완료 후 이용할 수 있습니다.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          기업의 자가진단 결과를 바탕으로 AI가 인터뷰 준비 가이드를 생성합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-6 py-16">
      <Sparkles className="h-10 w-10 text-purple-400" />
      <p className="mt-4 text-sm font-medium text-gray-700">
        AI 사전 분석 가이드를 생성할 수 있습니다
      </p>
      <p className="mt-1 text-xs text-gray-500">
        자가진단 결과를 분석하여 핵심 파악 포인트와 인터뷰 질문을 추천합니다.
      </p>
      <Button
        className="mt-6"
        onClick={onGenerate}
        disabled={isGenerating}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? '분석 중...' : '가이드 생성하기'}
      </Button>
    </div>
  );
}
