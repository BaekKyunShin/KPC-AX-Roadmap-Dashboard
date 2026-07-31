'use client';

import { cn } from '@/lib/utils';
import {
  getConsultantProfile,
  getScoreColorClass,
  getScoreGaugeColor,
  parseRationale,
} from './utils';
import type { ValidRecommendation } from './utils';

/** 산업 칩 최대 노출 개수 (H6 — 한눈에 비교 가능한 범위 유지) */
const MAX_INDUSTRY_CHIPS = 3;

/** 컨설턴트 프로필에서 산업/도메인 칩을 추출. available_industries 우선, fallback expertise_domains. */
function pickIndustryChips(profile: ReturnType<typeof getConsultantProfile>): string[] {
  if (!profile) return [];
  const industries = Array.isArray(profile.available_industries)
    ? profile.available_industries
    : [];
  if (industries.length > 0) return industries.slice(0, MAX_INDUSTRY_CHIPS);
  const expertise = Array.isArray(profile.expertise_domains) ? profile.expertise_domains : [];
  return expertise.slice(0, MAX_INDUSTRY_CHIPS);
}

interface SelectableCardProps {
  recommendation: ValidRecommendation;
  isSelected: boolean;
  onSelect: () => void;
}

/** 선택 가능한 컨설턴트 카드 (LLM 매칭용) */
export default function SelectableCard({
  recommendation,
  isSelected,
  onSelect,
}: SelectableCardProps) {
  // LLM은 이미 0-100 점수를 반환하므로 직접 사용 (정수로 반올림)
  const score = Math.round(Math.max(0, Math.min(100, recommendation.total_score)));
  const isTopRank = recommendation.rank === 1;
  const parsedRationale = recommendation.rationale
    ? parseRationale(recommendation.rationale)
    : null;
  const scoreColor = getScoreColorClass(score);
  const gaugeColor = getScoreGaugeColor(score);

  // 컨설턴트 프로필 (H6 — 운영자가 추천 카드에서 핵심 객관 정보를 한눈에 비교)
  const consultantProfile = getConsultantProfile(recommendation.candidate);
  const industryChips = pickIndustryChips(consultantProfile);
  const yearsOfExperience =
    typeof consultantProfile?.years_of_experience === 'number' &&
    consultantProfile.years_of_experience > 0
      ? consultantProfile.years_of_experience
      : null;
  const hasProfileInfo = industryChips.length > 0 || yearsOfExperience !== null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full h-full text-left p-4 rounded-xl border-2 transition-all duration-200 ease-out',
        'flex flex-col',
        'hover:-translate-y-0.5 hover:shadow-lg',
        'active:translate-y-0 active:shadow-md active:scale-[0.99]',
        isSelected && 'border-blue-500 shadow-lg shadow-blue-100/50 hover:border-blue-500 bg-white',
        !isSelected && isTopRank && 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400',
        !isSelected && !isTopRank && 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      {/* 헤더: 순위 + 이름 + 추천 뱃지 + 점수 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              isSelected
                ? 'bg-blue-500 text-white'
                : isTopRank
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 text-gray-600'
            )}
          >
            {recommendation.rank}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">
                {recommendation.candidate.name}
              </span>
              {isTopRank && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium whitespace-nowrap">
                  AI 추천
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 truncate block">
              {recommendation.candidate.email}
            </span>
          </div>
        </div>
        {/* 점수 표시 (원형 게이지) */}
        <div className="shrink-0 flex flex-col items-center">
          <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(${gaugeColor} ${score * 3.6}deg, #f3f4f6 0deg)` }}
          >
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <span className={cn('text-base font-bold', scoreColor)}>{score}</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">점</span>
        </div>
      </div>

      {/* 컨설턴트 프로필 요약 (H6 — 산업 칩 + 연차) */}
      {hasProfileInfo && (
        <div className="mb-3 space-y-1.5">
          {industryChips.length > 0 && (
            <div className="flex flex-wrap gap-1" data-testid="consultant-industries">
              {industryChips.map((industry) => (
                <span
                  key={industry}
                  className="inline-flex items-center text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium"
                >
                  {industry}
                </span>
              ))}
            </div>
          )}
          {yearsOfExperience !== null && (
            <p className="text-xs text-gray-500">경력 {yearsOfExperience}년</p>
          )}
        </div>
      )}

      {/* AI 분석 텍스트 */}
      {parsedRationale?.analysis && (
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{parsedRationale.analysis}</p>
      )}

      {/* 강점 / 고려사항 */}
      <div className="space-y-3 mb-4">
        {parsedRationale?.strengths && parsedRationale.strengths.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedRationale.strengths.map((strength, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full"
              >
                <span className="text-emerald-500">✓</span>
                {strength}
              </span>
            ))}
          </div>
        )}
        {parsedRationale?.notes && parsedRationale.notes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedRationale.notes.map((note, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-full"
              >
                <span className="text-orange-400">!</span>
                {note}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 선택 인디케이터 - mt-auto로 항상 하단 고정 */}
      <div
        className={cn(
          'mt-auto pt-3 border-t text-center text-xs font-medium transition-all',
          isSelected
            ? 'text-blue-600 border-blue-100 bg-blue-50/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-xl'
            : 'text-gray-400 border-gray-100'
        )}
      >
        {isSelected ? '✓ 선택됨' : '이 컨설턴트 선택하기'}
      </div>
    </button>
  );
}
