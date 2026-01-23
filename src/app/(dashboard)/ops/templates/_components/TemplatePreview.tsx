'use client';

import type { SelfAssessmentTemplate, SelfAssessmentQuestion } from '@/types/database';

interface TemplatePreviewProps {
  template: SelfAssessmentTemplate;
}

// 차원별로 질문 그룹화
function groupByDimension(questions: SelfAssessmentQuestion[]) {
  const groups: Record<string, SelfAssessmentQuestion[]> = {};
  questions.forEach((q) => {
    if (!groups[q.dimension]) {
      groups[q.dimension] = [];
    }
    groups[q.dimension].push(q);
  });
  return groups;
}

export default function TemplatePreview({ template }: TemplatePreviewProps) {
  const groupedQuestions = groupByDimension(template.questions || []);
  const dimensions = Object.keys(groupedQuestions);

  // 최대 점수 계산
  const maxScore = (template.questions || []).reduce((sum, q) => {
    const maxValue = q.question_type === 'SCALE_10' ? 10 : 5;
    return sum + maxValue * q.weight;
  }, 0);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
        {template.description && (
          <p className="mt-1 text-sm text-gray-500">{template.description}</p>
        )}
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>총 {template.questions?.length || 0}문항</span>
          <span>|</span>
          <span>최대 점수: {maxScore.toFixed(1)}점</span>
          <span>|</span>
          <span>{dimensions.length}개 차원</span>
        </div>
      </div>

      {/* 질문 미리보기 */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {dimensions.map((dimension) => (
          <div key={dimension} className="p-4">
            <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2" />
              {dimension} ({groupedQuestions[dimension].length}문항)
            </h4>
            <div className="space-y-3">
              {groupedQuestions[dimension]
                .sort((a, b) => a.order - b.order)
                .map((question) => (
                  <div
                    key={question.id}
                    className="bg-gray-50 rounded-md p-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 flex-1">
                        <span className="text-gray-400 mr-2">#{question.order}</span>
                        {question.question_text}
                      </p>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className="text-xs text-gray-400">
                          가중치: {question.weight}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <QuestionTypePreview question={question} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* 점수 계산 방식 안내 */}
      <div className="bg-blue-50 px-6 py-4 border-t border-blue-100">
        <h4 className="text-sm font-medium text-blue-800 mb-2">점수 계산 방식</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 총점 = 각 응답값 x 가중치의 합</li>
          <li>• 차원별 점수 = 해당 차원 응답값 x 가중치의 합</li>
          <li>• 5점 척도: 1~5점, 10점 척도: 1~10점</li>
        </ul>
      </div>
    </div>
  );
}

function QuestionTypePreview({ question }: { question: SelfAssessmentQuestion }) {
  switch (question.question_type) {
    case 'SCALE_5':
      return (
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled
              className="w-8 h-8 rounded-full border border-gray-300 text-xs text-gray-500 bg-white"
            >
              {n}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">(5점 척도)</span>
        </div>
      );
    case 'SCALE_10':
      return (
        <div className="flex items-center space-x-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              disabled
              className="w-6 h-6 rounded border border-gray-300 text-xs text-gray-500 bg-white"
            >
              {n}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">(10점 척도)</span>
        </div>
      );
    case 'MULTIPLE_CHOICE':
      return (
        <div className="space-y-1">
          {(question.options || ['옵션 1', '옵션 2', '옵션 3']).map((opt, i) => (
            <div key={i} className="flex items-center">
              <input
                type="radio"
                disabled
                className="w-3 h-3 text-blue-600 border-gray-300"
              />
              <span className="ml-2 text-xs text-gray-500">{opt}</span>
            </div>
          ))}
          <span className="text-xs text-gray-400">(객관식)</span>
        </div>
      );
    case 'TEXT':
      return (
        <div>
          <textarea
            disabled
            rows={2}
            className="w-full text-xs border border-gray-300 rounded-md bg-gray-100 p-2"
            placeholder="서술형 응답"
          />
          <span className="text-xs text-gray-400">(서술형)</span>
        </div>
      );
    default:
      return null;
  }
}
