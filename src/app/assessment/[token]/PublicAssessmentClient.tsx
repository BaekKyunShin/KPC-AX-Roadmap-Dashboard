'use client';

import { useState } from 'react';
import { Building2, CheckCircle2, Clock, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Template } from '@/components/ops/self-assessment';

import PublicSelfAssessmentForm from '@/components/assessment/PublicSelfAssessmentForm';

type Phase = 'intro' | 'form' | 'complete';

interface PublicAssessmentClientProps {
  token: string;
  companyName: string;
  template: Template;
  questionCount: number;
}

export default function PublicAssessmentClient({
  token,
  companyName,
  template,
  questionCount,
}: PublicAssessmentClientProps) {
  const [phase, setPhase] = useState<Phase>('intro');

  if (phase === 'complete') {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          소중한 응답 감사합니다
        </h1>
        <p className="text-gray-600">
          담당 컨설턴트가 결과를 분석하여 연락드리겠습니다.
        </p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            AI 훈련 수준 자가진단
          </h1>
          <p className="text-gray-600">
            귀사의 AI 활용 현황을 파악하기 위한 진단입니다.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">기업명</p>
              <p className="font-medium text-gray-900">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">문항 수</p>
              <p className="font-medium text-gray-900">{questionCount}문항</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">예상 소요시간</p>
              <p className="font-medium text-gray-900">약 5분</p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setPhase('form')}
          className="w-full"
          size="lg"
        >
          진단 시작
        </Button>
      </div>
    );
  }

  // phase === 'form'
  return (
    <PublicSelfAssessmentForm
      token={token}
      template={template}
      onComplete={() => setPhase('complete')}
    />
  );
}
