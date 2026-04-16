import type { RoadmapResult } from '@/lib/services/roadmap';

// =============================================================================
// 데모용 샘플 데이터 — 산인공 공식 양식 Ⅲ장 4섹션 구조
// =============================================================================

export const SAMPLE_COMPANY = {
  name: '(주)샘플유통',
  industry: '유통·서비스업',
  size: '중소기업 (120명)',
};

// ---------------------------------------------------------------------------
// Ⅲ-1. 역량 모델링
// ---------------------------------------------------------------------------
export const SAMPLE_COMPETENCIES: RoadmapResult['competencies'] = [
  {
    name: 'AI 활용 고객 응대',
    definition: 'ChatGPT 등 생성형 AI 도구를 활용해 고객 문의를 빠르고 일관성 있게 처리하는 능력',
    knowledge: [
      '프롬프트 엔지니어링 원칙',
      '고객 문의 유형 분류 체계',
      'AI 도구 활용 윤리',
    ],
    skills: [
      'ChatGPT로 문의 자동 분류',
      '맞춤 응답 템플릿 작성',
      'Google Sheets 연동 워크플로우 구축',
    ],
    attitudes: ['고객 중심 사고', '지속적 개선 마인드'],
    ncs_used: true,
    ncs_methodology: 'NCS 02020201 "고객불만관리" 능력단위 기반 + AI 활용 요소 추가',
  },
  {
    name: 'AI 콘텐츠 제작',
    definition: '마케팅·홍보 콘텐츠를 생성형 AI로 빠르게 제작하고 브랜드 일관성을 유지하는 능력',
    knowledge: ['카피라이팅 기본', '시각 콘텐츠 디자인 원칙', 'SNS 채널별 특성'],
    skills: ['ChatGPT 콘텐츠 초안 생성', 'Canva AI 디자인', 'Gamma 프레젠테이션 자동화'],
    attitudes: ['창의성', '브랜드 일관성 중시'],
    ncs_used: false,
    ncs_derivation_method: '사내 마케팅 업무 매뉴얼 + 업계 벤치마킹을 통해 도출',
  },
  {
    name: 'AI 기반 업무 자동화',
    definition: '노코드 도구를 활용해 반복 업무를 자동화하고 데이터 기반 의사결정을 지원하는 능력',
    knowledge: ['업무 프로세스 분석 기법', '노코드 자동화 플랫폼(Make, Zapier)', '데이터 구조화'],
    skills: ['반복 업무 식별 및 우선순위화', 'Make 워크플로우 설계', '보고서 자동 생성'],
    attitudes: ['분석적 사고', '자동화 마인드'],
    ncs_used: true,
    ncs_methodology: 'NCS 20010201 "경영기획" 능력단위의 업무 개선 요소와 결합',
  },
];

// ---------------------------------------------------------------------------
// Ⅲ-2. 훈련체계도
// ---------------------------------------------------------------------------
export const SAMPLE_TRAINING_STRUCTURE: RoadmapResult['training_structure'] = [
  {
    competency_name: 'AI 활용 고객 응대',
    level: 'BEGINNER',
    content: 'ChatGPT로 고객 문의 자동 분류하기',
    target_audience: 'CS 담당자, 고객관리팀',
    method: '집체 + 실습',
    goal: '문의 분류 정확도 80% 이상 달성',
  },
  {
    competency_name: 'AI 활용 고객 응대',
    level: 'INTERMEDIATE',
    content: 'AI 챗봇 기반 고객 응대 시스템 구축',
    target_audience: 'CS 리더, IT 담당자',
    method: '혼합',
    goal: '응답 시간 40% 단축',
  },
  {
    competency_name: 'AI 콘텐츠 제작',
    level: 'BEGINNER',
    content: 'AI로 SNS 콘텐츠 빠르게 만들기',
    target_audience: '마케팅 담당자',
    method: '집체 + 실습',
    goal: '콘텐츠 제작 시간 50% 단축',
  },
  {
    competency_name: 'AI 콘텐츠 제작',
    level: 'INTERMEDIATE',
    content: 'AI 활용 마케팅 콘텐츠 제작 심화',
    target_audience: '마케팅 리더',
    method: '집체',
    goal: '월간 발행량 2배 증가',
  },
  {
    competency_name: 'AI 기반 업무 자동화',
    level: 'ADVANCED',
    content: '노코드로 업무 자동화 구축하기',
    target_audience: '경영지원팀, 부서별 업무 리더',
    method: '혼합 + PBL',
    goal: '주 10시간 이상 반복 업무 자동화',
  },
];

// ---------------------------------------------------------------------------
// Ⅲ-3. 연간 훈련계획
// ---------------------------------------------------------------------------
export const SAMPLE_ANNUAL_PLAN: RoadmapResult['annual_plan'] = {
  items: [
    {
      competency_name: 'AI 활용 고객 응대',
      course_name: 'ChatGPT 고객 문의 자동 분류 실무',
      format: '집체',
      hours: 12,
      notes: '1분기',
    },
    {
      competency_name: 'AI 활용 고객 응대',
      course_name: 'AI 챗봇 고객 응대 시스템 구축',
      format: '혼합',
      hours: 20,
      notes: '2분기',
    },
    {
      competency_name: 'AI 콘텐츠 제작',
      course_name: 'AI 활용 마케팅 콘텐츠 제작',
      format: '집체',
      hours: 16,
      notes: '2분기',
    },
    {
      competency_name: 'AI 기반 업무 자동화',
      course_name: '노코드 업무 자동화 PBL',
      format: '혼합',
      hours: 24,
      notes: '3분기',
    },
  ],
  usage_plan:
    '재직자 향상훈련(내일배움카드) 연계 집체·혼합 훈련으로 운영. 분기별 성과 리뷰를 통해 ' +
    '과정 효과성을 검증하고 다음 연도 계획에 반영. CS·마케팅·경영지원 3개 부서 순차 적용.',
};

// ---------------------------------------------------------------------------
// Ⅲ-4. 훈련과정 명세서 (최소 3개)
// ---------------------------------------------------------------------------
export const SAMPLE_COURSE_SPECS: RoadmapResult['course_specs'] = [
  {
    course_name: 'ChatGPT 고객 문의 자동 분류 실무',
    format: '집체 + 실습',
    recommended_program: '재직자 향상훈련',
    goal: '고객 문의 자동 분류 워크플로우를 구축하고 응답 시간 40% 단축',
    main_content:
      'ChatGPT 프롬프트 기초, 고객 문의 유형 분류 체계 설계, Google Sheets 연동, 자동 응답 템플릿 작성',
    target_audience: 'CS 담당자, 고객관리팀',
    subjects: [
      {
        name: 'AI 챗봇과 프롬프트 기초',
        details: 'ChatGPT 기본 사용법, 프롬프트 작성 원칙, 고객 문의 50건 분류 실습',
        hours: 3,
      },
      {
        name: '문의 자동 분류 시스템 구축',
        details: 'Google Sheets 데이터 구조화, 반자동 분류 워크플로우 설계, 정확도 검증',
        hours: 3,
      },
      {
        name: '자동 응답 템플릿 생성',
        details: '유형별 응답 템플릿 작성, 톤앤매너 일관성 유지, 10개 템플릿 완성',
        hours: 3,
      },
      {
        name: '현업 적용 및 성과 측정',
        details: '실무 적용, Before/After 비교, 성과 보고서 작성',
        hours: 3,
      },
    ],
  },
  {
    course_name: 'AI 활용 마케팅 콘텐츠 제작',
    format: '집체',
    recommended_program: '재직자 향상훈련',
    goal: '콘텐츠 제작 시간 60% 단축 및 월간 발행량 2배 증가',
    main_content:
      'ChatGPT 콘텐츠 생성, Canva AI 디자인, Gamma 프레젠테이션 자동화, 월간 콘텐츠 캘린더 구축',
    target_audience: '마케팅 담당자, SNS 운영자',
    subjects: [
      {
        name: 'AI 콘텐츠 생성 기초',
        details: 'ChatGPT로 블로그·SNS 글 작성, 타겟 고객별 톤앤매너, 자사 콘텐츠 5개 생성',
        hours: 4,
      },
      {
        name: 'AI 이미지·디자인 제작',
        details: 'Canva AI 디자인 활용, SNS 배너·카드뉴스·썸네일 제작, 브랜드 일관성 유지',
        hours: 4,
      },
      {
        name: '프레젠테이션·보고서 자동 생성',
        details: 'Gamma 자동 생성, 데이터 시각화, 월간 마케팅 리포트 템플릿',
        hours: 4,
      },
      {
        name: '통합 콘텐츠 전략',
        details: '도구별 활용 시나리오, 월간 콘텐츠 캘린더 자동화, 성과 측정',
        hours: 4,
      },
    ],
  },
  {
    course_name: '노코드 업무 자동화 PBL',
    format: '혼합 + PBL',
    recommended_program: '재직자 향상훈련 (고숙련)',
    goal: '주 10시간 이상 반복 업무 자동화 및 수작업 오류 90% 감소',
    main_content:
      'Make 기반 자동화 설계, 데이터 수집·정리 자동화, 보고서 자동 생성, 멀티 도구 연동',
    target_audience: '경영지원팀, IT 담당자, 각 부서 업무 리더',
    subjects: [
      {
        name: '업무 자동화 설계',
        details: '반복 업무 식별, Make 기본 사용법, 트리거-액션 워크플로우 이해',
        hours: 6,
      },
      {
        name: '데이터 수집·정리 자동화',
        details: 'Sheets + ChatGPT 연동, 이메일·폼 데이터 자동 수집, 정합성 검증',
        hours: 6,
      },
      {
        name: '보고·알림 자동화',
        details: '주간·월간 보고서 자동 생성, 조건별 알림, 대시보드 자동 업데이트',
        hours: 6,
      },
      {
        name: '통합 자동화 및 운영',
        details: '멀티 도구 연동, 오류 처리, 자동화 문서화 및 팀 전파',
        hours: 6,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// 최상위 RoadmapResult (데모 화면에서 통합 사용)
// ---------------------------------------------------------------------------
export const SAMPLE_ROADMAP_RESULT: RoadmapResult = {
  diagnosis_summary:
    `${SAMPLE_COMPANY.name}은 ${SAMPLE_COMPANY.industry} 분야의 ${SAMPLE_COMPANY.size} 기업으로, ` +
    'CS 응답 지연·마케팅 콘텐츠 제작 부담·반복 업무 과다라는 3대 과제를 보유하고 있습니다. ' +
    '생성형 AI와 노코드 자동화를 단계적으로 도입해 업무 효율을 극대화할 수 있는 단계입니다.',
  competencies: SAMPLE_COMPETENCIES,
  training_structure: SAMPLE_TRAINING_STRUCTURE,
  annual_plan: SAMPLE_ANNUAL_PLAN,
  course_specs: SAMPLE_COURSE_SPECS,
};
