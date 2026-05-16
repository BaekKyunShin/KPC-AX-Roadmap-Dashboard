// ============================================================================
// AssignmentTabSection 유틸리티 함수, 상수, 타입
// ============================================================================

// ============================================================================
// 상수
// ============================================================================

/** 표시 개수 상한 */
export const DISPLAY_COUNTS = {
  MAX_STRENGTHS: 3,
  MAX_NOTES: 2,
} as const;

/** 점수 색상 임계값 (퍼센트) */
export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

/** 추천 근거 파싱용 키워드 */
const NOTE_KEYWORDS = ['부족', '없', '미흡', '제한', '주의', '다만', '그러나', '하지만', '진행 중'] as const;

/** 에러 메시지 */
export const ERROR_MESSAGES = {
  MATCHING_FAILED: '매칭을 실행할 수 없습니다. 잠시 후 다시 시도해주세요.',
  NETWORK: '네트워크 연결을 확인해주세요.',
  DEFAULT: '잠시 후 다시 시도해주세요.',
} as const;

// ============================================================================
// 타입
// ============================================================================

/** 컨설턴트 기본 정보 */
export interface ConsultantInfo {
  id: string;
  name: string;
  email: string;
}

/** 컨설턴트 프로필 */
export interface ConsultantProfile {
  expertise_domains?: string[];
  available_industries?: string[];
  skill_tags?: string[];
  years_of_experience?: number;
}

/** LLM 기반 매칭 추천 근거 */
export interface LLMRationaleData {
  analysis: string;
  strengths: string[];
  considerations: string[];
}

/** DB에 저장된 rationale JSON 구조 (레거시) */
export interface RationaleData {
  strengths?: string[];
  improvements?: string[];
  consultantNote?: string;
}

/** 매칭 추천 */
export interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  score_breakdown?: unknown[]; // 레거시 지원
  rationale?: string | RationaleData | LLMRationaleData | null;
  rank: number;
  candidate?: ConsultantInfo & {
    consultant_profile?: ConsultantProfile[] | Record<string, unknown>;
  };
}

/** 유효한 추천 (candidate 필수) */
export type ValidRecommendation = Recommendation & {
  candidate: ConsultantInfo & {
    consultant_profile?: ConsultantProfile[] | Record<string, unknown>;
  };
};

/** 파싱된 추천 근거 (LLM 형식 지원) */
export interface ParsedRationale {
  analysis?: string;         // LLM 분석 텍스트
  strengths: string[];
  notes: string[];           // considerations 또는 improvements
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 추천에 포함된 컨설턴트 프로필을 안전하게 정규화.
 *
 * `recommendation.candidate.consultant_profile` 은 Supabase 조인 결과에 따라
 * `ConsultantProfile[]` (배열 형식) 또는 `Record<string, unknown>` (단일 객체) 으로
 * 도착할 수 있다 (`ValidRecommendation['candidate']['consultant_profile']`).
 *
 * - undefined → null
 * - 빈 배열 → null
 * - 배열 → 첫 요소
 * - 객체 → 그대로 (빈 객체도 그대로 — 비어있는지 판단은 호출자 책임)
 */
export function getConsultantProfile(
  candidate: ValidRecommendation['candidate'],
): ConsultantProfile | null {
  const raw = candidate.consultant_profile;
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? (raw[0] as ConsultantProfile) : null;
  }
  return raw as ConsultantProfile;
}

/** 점수에 따른 색상 반환 */
export function getScoreColorClass(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'text-emerald-600';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'text-gray-900';
  return 'text-orange-500';
}

/** 점수에 따른 게이지 색상 반환 (hex) */
export function getScoreGaugeColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return '#10b981';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return '#6b7280';
  return '#f97316';
}

/** 추천 근거를 구조화된 데이터로 파싱 (LLM 형식 및 레거시 지원) */
export function parseRationale(rationale: string | RationaleData | LLMRationaleData | null | undefined): ParsedRationale {
  if (!rationale) {
    return { strengths: [], notes: [] };
  }

  // rationale이 이미 객체인 경우 (DB에서 JSON으로 저장된 경우)
  if (typeof rationale === 'object') {
    // LLM 형식 체크 (analysis 필드 존재 여부)
    if ('analysis' in rationale) {
      const llmData = rationale as LLMRationaleData;
      return {
        analysis: llmData.analysis,
        strengths: (llmData.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
        notes: (llmData.considerations || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
      };
    }
    // 레거시 형식
    const data = rationale as RationaleData;
    return {
      strengths: (data.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
      notes: (data.improvements || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
    };
  }

  // rationale이 JSON 문자열인 경우 파싱 시도
  if (typeof rationale === 'string') {
    try {
      const parsed = JSON.parse(rationale);
      // LLM 형식 체크
      if ('analysis' in parsed) {
        return {
          analysis: parsed.analysis,
          strengths: (parsed.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
          notes: (parsed.considerations || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
        };
      }
      // 레거시 형식
      return {
        strengths: (parsed.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
        notes: (parsed.improvements || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
      };
    } catch {
      // JSON 파싱 실패 시 기존 문자열 파싱 로직 사용
    }
  }

  // 일반 문자열인 경우 기존 로직
  const sentences = String(rationale)
    .split(/[.。]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const strengths: string[] = [];
  const notes: string[] = [];

  for (const sentence of sentences) {
    const isNote = NOTE_KEYWORDS.some((keyword) => sentence.includes(keyword));
    if (isNote) {
      notes.push(sentence);
    } else if (sentence.length > 5) {
      strengths.push(sentence);
    }
  }

  // 강점이 없으면 첫 문장을 강점으로 사용
  if (strengths.length === 0 && sentences.length > 0) {
    strengths.push(sentences[0]);
  }

  return {
    strengths: strengths.slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
    notes: notes.slice(0, DISPLAY_COUNTS.MAX_NOTES),
  };
}
