// matching 모듈 re-export
// 기존 import 경로 호환: import { ... } from '@/lib/services/matching'

export { generateLLMMatchingRecommendations } from './matching-llm';
export type { LLMMatchingRationale, LLMCandidateScore } from './matching-helpers';
