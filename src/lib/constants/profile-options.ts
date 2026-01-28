/**
 * 컨설턴트 프로필 폼에서 사용하는 선택지 옵션
 * CONSULTANT_PROFILE_SPEC.md와 동기화 필요
 */

// AI 훈련 가능 산업 옵션
export const INDUSTRIES = [
  '제조업',
  '서비스업',
  '유통/물류',
  'IT/소프트웨어',
  '금융/보험',
  '건설/부동산',
  '의료/헬스케어',
  '에너지/환경',
  '농업/식품',
  '교육',
  '공공/정부',
] as const;

// AI 적용 가능 업무 옵션
export const EXPERTISE_DOMAINS = [
  '생산/제조',
  '품질관리',
  '설비/시설관리',
  '연구개발(R&D)',
  '구매/SCM',
  '물류/유통',
  '영업/마케팅/홍보',
  '인사/총무',
  '기획/전략',
  '법무/계약',
  '재무/회계',
  'IT/시스템',
  '고객서비스',
  '디자인/콘텐츠',
  '문서/보고서 작성',
  '데이터 수집/분석',
] as const;

// 교육 대상 수준 옵션
export const TEACHING_LEVELS = [
  { value: 'BEGINNER', label: '입문', description: 'AI 개념 이해, 비사용자 대상 기초 교육' },
  { value: 'INTERMEDIATE', label: '실무', description: 'AI 도구 활용, 현업 적용, 프롬프트 설계' },
  { value: 'ADVANCED', label: '심화', description: '워크플로우 구축, 자동화 도구 제작' },
  { value: 'LEADER', label: '리더', description: 'AI 전략 수립, 조직 내재화' },
] as const;

// 선호 교육 방식 옵션
export const COACHING_METHODS = [
  { value: 'PBL', label: 'PBL (프로젝트 기반)' },
  { value: 'WORKSHOP', label: '워크숍' },
  { value: 'MENTORING', label: '코칭/멘토링' },
  { value: 'LECTURE', label: '강의' },
  { value: 'HYBRID', label: '혼합형' },
] as const;

// 보유 역량 옵션
export const SKILL_TAGS = [
  '생성형 AI 활용 (ChatGPT, Claude, Gemini 등)',
  '프롬프트 엔지니어링',
  'AI 코딩 도구 (클로드코드, 코덱스, 안티그래비티, 커서AI 등)',
  '협업 도구 AI 활용 (Notion AI, Copilot for M365, Slack AI 등)',
  'AI 디자인 도구 활용 (Midjourney, Canva AI, Figma AI 등)',
  '업무 자동화 (RPA/노코드)',
  '워크플로우 설계',
  '데이터 수집/정제',
  '데이터 시각화',
  '문서/보고서 작성',
  '품질/통계 분석',
  '프로세스 개선',
  '변화관리/내재화',
  'AI 전략/거버넌스',
  '보안/컴플라이언스',
] as const;

// 텍스트 필드 placeholder
export const PROFILE_PLACEHOLDERS = {
  representative_experience: `예:
• 삼성전자 품질관리팀 5년 (AI 기반 불량 예측 시스템 구축)
• 현대자동차 생산기술팀 3년
• 프리랜서 AI 컨설턴트 2년`,
  portfolio: `예:
• '생성형 AI 업무 활용 기초' (8시간)
• '프롬프트 엔지니어링 실무' (16시간)
• 'A기업 품질팀 AI 컨설팅' (3개월)`,
  strengths_constraints: `예:
• 비전공자 대상 실습 중심 교육에 강점
• 제조업 품질/생산 분야 AI 컨설팅 경험 다수
• Make, n8n을 활용한 업무 자동화 컨설팅 다수 수행`,
} as const;
