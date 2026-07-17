import type { RoadmapResult } from '@/lib/services/roadmap';
import type { PBLOperationPlan } from '@/lib/services/pbl/pbl-types';
import { PBL_EVALUATION_SCALE_DESCRIPTION } from '@/lib/services/pbl/pbl-types';

// =============================================================================
// 데모용 샘플 데이터 — 산인공 공식 양식 v2 (2026-07-13 개정)
// -----------------------------------------------------------------------------
//   Ⅰ-1. 수립 배경        → setup_necessity
//   Ⅰ-3. 수립 주요 결과    → outcome_summary
//   Ⅲ.   훈련실시 계획 제안 → course_specs (훈련과정 명세서 6개)
//
// v1 샘플(역량 모델링·훈련체계도·연간 훈련계획)은 양식에서 삭제되어 함께 제거.
// =============================================================================

export const SAMPLE_COMPANY = {
  name: '(주)샘플유통',
  industry: '유통·서비스업',
  size: '중소기업 (120명)',
};

// ---------------------------------------------------------------------------
// Ⅲ. 훈련과정 명세서 (6개 — 초급 2 · 중급 2 · 고급 2, 분기별 순차 운영)
// ---------------------------------------------------------------------------
export const SAMPLE_COURSE_SPECS: RoadmapResult['course_specs'] = [
  {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: '생성형 AI 업무 활용 입문',
    training_method: '집체 + 실습',
    recommended_program: '재직자 향상훈련',
    goal: '전 직원이 생성형 AI 도구를 일상 업무에 안전하게 활용할 수 있는 기초 역량 확보',
    main_content:
      '생성형 AI 기본 개념, 프롬프트 작성 원칙, 사내 데이터 보안 수칙, 부서별 활용 사례 실습',
    target_audience: '전 직원 (신입~관리자)',
    subjects: [
      {
        name: '생성형 AI 이해',
        details: 'LLM 동작 원리, 도구별 특징 비교(ChatGPT·Claude·Gemini), 한계와 오남용 사례',
        hours: 3,
      },
      {
        name: '프롬프트 작성 기초',
        details: '역할·맥락·제약 3요소 프롬프트 설계, 업무 이메일·보고서 초안 작성 실습',
        hours: 3,
      },
      {
        name: 'AI 활용 보안·윤리',
        details: '사내 정보 입력 금지 기준, 저작권·개인정보 유의사항, 결과물 검증 체크리스트',
        hours: 2,
      },
    ],
  },
  {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: 'ChatGPT 고객 문의 자동 분류 실무',
    training_method: '집체 + 실습',
    recommended_program: '재직자 향상훈련',
    goal: '고객 문의 분류·응답 워크플로우를 구축해 1차 응답 시간 40% 단축',
    main_content: '고객 문의 유형 분류 체계 설계, Google Sheets 연동, 유형별 자동 응답 템플릿 작성',
    target_audience: 'CS 담당자, 고객관리팀',
    subjects: [
      {
        name: '문의 유형 분류 체계 설계',
        details: '최근 3개월 문의 데이터 분석, 유형 taxonomy 정의, 실제 문의 50건 분류 실습',
        hours: 4,
      },
      {
        name: '반자동 분류 워크플로우 구축',
        details: 'Google Sheets 데이터 구조화, ChatGPT 연동 분류, 분류 정확도 검증',
        hours: 4,
      },
      {
        name: '자동 응답 템플릿 작성',
        details: '유형별 응답 템플릿 10종 완성, 톤앤매너 일관성 유지, 현업 적용 및 성과 측정',
        hours: 4,
      },
    ],
  },
  {
    training_period: '2026년 2분기',
    training_level: 'INTERMEDIATE',
    course_name: 'AI 활용 마케팅 콘텐츠 제작',
    training_method: '집체',
    recommended_program: '재직자 향상훈련',
    goal: '콘텐츠 제작 시간 60% 단축 및 월간 발행량 2배 증가',
    main_content:
      'AI 콘텐츠 생성, Canva AI 디자인, Gamma 프레젠테이션 자동화, 월간 콘텐츠 캘린더 구축',
    target_audience: '마케팅 담당자, SNS 운영자',
    subjects: [
      {
        name: 'AI 콘텐츠 생성 실무',
        details: '블로그·SNS 글 작성, 타겟 고객별 톤앤매너 설계, 자사 콘텐츠 5건 생성',
        hours: 4,
      },
      {
        name: 'AI 이미지·디자인 제작',
        details: 'Canva AI 활용 배너·카드뉴스·썸네일 제작, 브랜드 가이드 일관성 유지',
        hours: 4,
      },
      {
        name: '콘텐츠 캘린더 자동화',
        details: 'Gamma 리포트 자동 생성, 월간 콘텐츠 캘린더 구축, 채널별 성과 측정',
        hours: 4,
      },
    ],
  },
  {
    training_period: '2026년 2분기',
    training_level: 'INTERMEDIATE',
    course_name: 'AI 챗봇 고객 응대 시스템 구축',
    training_method: '혼합',
    recommended_program: '재직자 향상훈련',
    goal: 'FAQ 챗봇을 자체 구축해 반복 문의 처리율 60% 달성',
    main_content: 'FAQ 지식베이스 설계, 노코드 챗봇 빌더 활용, 상담원 이관 시나리오 설계',
    target_audience: 'CS 리더, IT 담당자',
    subjects: [
      {
        name: 'FAQ 지식베이스 설계',
        details: '문의 데이터 기반 FAQ 30종 정리, 답변 구조화, 지식베이스 업데이트 체계',
        hours: 5,
      },
      {
        name: '노코드 챗봇 구축',
        details: '챗봇 빌더 시나리오 설계, 사내 FAQ 연동, 응답 품질 테스트',
        hours: 5,
      },
      {
        name: '상담원 이관·운영',
        details: '이관 조건 설계, 대화 로그 분석, 운영 KPI 대시보드 구성',
        hours: 4,
      },
    ],
  },
  {
    training_period: '2026년 3분기',
    training_level: 'ADVANCED',
    course_name: '노코드 업무 자동화 PBL',
    training_method: '혼합 + PBL',
    recommended_program: '재직자 향상훈련 (고숙련)',
    goal: '주 10시간 이상 반복 업무 자동화 및 수작업 오류 90% 감소',
    main_content:
      'Make 기반 자동화 설계, 데이터 수집·정리 자동화, 보고서 자동 생성, 멀티 도구 연동',
    target_audience: '경영지원팀, IT 담당자, 부서별 업무 리더',
    subjects: [
      {
        name: '업무 자동화 설계',
        details: '반복 업무 식별·우선순위화, Make 트리거-액션 워크플로우 설계',
        hours: 6,
      },
      {
        name: '데이터 수집·정리 자동화',
        details: 'Sheets + AI 연동, 이메일·폼 데이터 자동 수집, 정합성 검증 로직',
        hours: 6,
      },
      {
        name: '통합 자동화 PBL',
        details: '부서별 과제 선정 → 자동화 구현 → 오류 처리 → 문서화 및 팀 전파',
        hours: 8,
      },
    ],
  },
  {
    training_period: '2026년 4분기',
    training_level: 'ADVANCED',
    course_name: 'AI 데이터 기반 의사결정·성과관리',
    training_method: '혼합 + PBL',
    recommended_program: '재직자 향상훈련 (고숙련)',
    goal: '주요 KPI 대시보드를 자동화해 경영 의사결정 리드타임 50% 단축',
    main_content: '지표 체계 설계, AI 데이터 분석, 자동 대시보드 구축, AI 도입 성과 측정',
    target_audience: '경영진, 팀장급 리더',
    subjects: [
      {
        name: 'KPI 지표 체계 설계',
        details: '부서별 핵심 지표 정의, 데이터 소스 매핑, 수집 주기 설계',
        hours: 5,
      },
      {
        name: 'AI 데이터 분석·시각화',
        details: '매출·CS·마케팅 데이터 분석, AI 인사이트 도출, 대시보드 자동 갱신',
        hours: 6,
      },
      {
        name: 'AI 도입 성과관리',
        details: '훈련 전후 Before/After 비교, ROI 산정, 차년도 AI 로드맵 수립',
        hours: 5,
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
  setup_necessity:
    '반복 CS 업무 및 콘텐츠 제작에 투입되는 시간을 절감하고, ' +
    '사내 AI 활용 문화를 안착시키기 위해 단계별 교육 로드맵이 필요합니다.',
  outcome_summary: {
    ai_competency_level: 'INTERMEDIATE',
    selected_tasks: '고객 응대 자동화, AI 콘텐츠 제작, 반복 업무 자동화',
    main_content:
      '초급·중급·고급 3단계 훈련과정 명세서 6개를 분기별로 순차 운영. ' +
      '초급은 전 직원 공통 소양, 중급은 CS·마케팅 실무자, 고급은 리더·경영진 대상 PBL로 구성.',
  },
  course_specs: SAMPLE_COURSE_SPECS,
};

// =============================================================================
// PBL 데모 샘플 — 산인공 PBL 양식 2번 Ⅳ장 (제조업 케이스)
// -----------------------------------------------------------------------------
// 로드맵 샘플((주)샘플유통·유통서비스업)과 별개의 독립 예시로, PBL 트랙을 보여주기
// 위한 제조업 현장 케이스다. 랜딩 데모(DemoSection)의 [PBL] 운영계획 슬라이드에서
// training_goal · outcome_metrics · ai_tool_usage_plan · 교과목 요약만 렌더링하며,
// training_plan/evaluation_plan 은 PBLOperationPlan 타입을 만족시키기 위한 값이다.
// =============================================================================
export const SAMPLE_PBL_OPERATION: PBLOperationPlan = {
  training_goal:
    '생산 현장의 설비·품질 데이터를 AI로 분석해 불량 원인을 조기에 진단하고, ' +
    '숙련 기술자의 노하우를 표준 작업 매뉴얼로 형식지화하여 불량률과 설비 비가동 시간을 함께 줄인다.',
  outcome_metrics: {
    selected_goals: ['불량률 감소', '공정 최적화', '기술 매뉴얼 개발'],
    quantitative:
      '훈련 후 3개월 내 공정 불량률 12% → 7% 이하로 감소, 설비 이상 대응 리드타임 30% 단축',
    qualitative:
      '현장 작업자가 AI 분석 리포트를 스스로 해석·활용하는 데이터 기반 문제해결 문화 정착, 숙련 노하우의 매뉴얼화',
  },
  ai_tool_usage_plan: [
    {
      stage: '1단계',
      main_activity: '데이터 수집·전처리',
      ai_tools: ['ChatGPT', 'Claude', 'Python(Pandas)'],
      utilized_data: '설비 센서 로그, 일별 생산·불량 집계표, 품질 검사 기록',
      purpose: '흩어진 현장 데이터를 분석 가능한 형태로 통합하고 결측·이상치를 식별한다.',
      specific_method:
        'AI에 데이터 스키마와 표본을 제시해 전처리 스크립트 초안을 생성하고, ' +
        '불량 코드 체계를 표준화한 뒤 분석용 데이터셋으로 통합한다.',
    },
    {
      stage: '2단계',
      main_activity: '불량 원인 분석',
      ai_tools: ['Claude', 'Julius AI', 'Google Sheets'],
      utilized_data: '통합 불량 데이터셋, 공정 조건(온도·압력·속도) 이력',
      purpose: '불량 유형별 핵심 원인 변수를 도출하고 공정 조건과의 상관관계를 파악한다.',
      specific_method:
        '자연어로 분석을 요청해 불량 유형별 상관·회귀 결과를 얻고, ' +
        'AI가 제안한 가설을 현장 엔지니어가 검증해 핵심 관리 변수를 선정한다.',
    },
    {
      stage: '3단계',
      main_activity: '개선안 도출·표준화',
      ai_tools: ['ChatGPT', 'Gamma', 'Notion AI'],
      utilized_data: '원인 분석 결과, 기존 작업표준서(SOP)',
      purpose: '분석 결과를 현장 개선안과 표준 작업 매뉴얼로 전환한다.',
      specific_method:
        '개선안을 AI와 함께 SOP 문서·교육 자료로 구조화하고, ' +
        'Gamma로 현장 공유용 요약 리포트를 자동 생성해 전 작업조에 배포한다.',
    },
  ],
  training_plan: {
    overview: {
      course_name: 'AI 기반 스마트 품질관리 실무',
      training_period: { start: '2026-03-02', end: '2026-03-27' },
    },
    learning_group: {
      instructors: [
        {
          type: '외부',
          role: '팀장',
          affiliation: 'KPC AI 컨설팅',
          position: '수석 컨설턴트',
          name: '김현우',
        },
        {
          type: '내부',
          role: '팀원',
          affiliation: '생산기술팀',
          position: '팀장',
          name: '이정민',
        },
      ],
      trainees: [
        { role: '팀원', affiliation: '품질관리팀', position: '주임', name: '박서준' },
        { role: '팀원', affiliation: '생산1팀', position: '반장', name: '최유진' },
      ],
    },
    subject_profile: {
      course_name: 'AI 기반 스마트 품질관리 실무',
      total_hours: 24,
      training_goals: [
        'AI로 생산 데이터를 분석해 불량 원인을 진단할 수 있다',
        '공정 조건과 불량의 상관관계를 해석해 개선안을 도출할 수 있다',
        '숙련 노하우를 표준 작업 매뉴얼로 형식지화할 수 있다',
      ],
      ai_tools: ['ChatGPT', 'Claude', 'Julius AI', 'Gamma'],
      utilized_data: '설비 센서 로그, 생산·불량 집계표, 품질 검사 기록, 작업표준서(SOP)',
      analysis_method: 'LLM, 상관·회귀 분석, RAG',
      training_contents: [
        {
          unit_name: '생산 데이터 수집·정제',
          detail:
            '설비 로그·품질 기록을 통합하고 AI로 전처리 스크립트를 작성해 분석용 데이터셋 구축',
          training_hours: 8,
          instructor_hours: { external: 6, internal: 2 },
        },
        {
          unit_name: '불량 원인 AI 분석',
          detail: '공정 조건과 불량 데이터의 상관관계를 AI로 분석하고 핵심 관리 변수 도출',
          training_hours: 8,
          instructor_hours: { external: 6, internal: 2 },
        },
        {
          unit_name: '개선안 표준화·매뉴얼화',
          detail: '분석 결과 기반 개선안을 SOP·교육자료로 문서화하고 현장에 적용',
          training_hours: 8,
          instructor_hours: { external: 5, internal: 3 },
        },
      ],
      total_sum_hours: 24,
    },
    facilities: [
      {
        seq: 1,
        category: '시설',
        name: '스마트팩토리 교육장',
        spec: '20인 수용, 실습용 PC 20대',
        location: '본사 3층',
      },
      {
        seq: 2,
        category: '장비',
        name: '데이터 분석용 노트북',
        spec: 'RAM 16GB, Python 분석 환경 사전 구성',
        location: '교육장',
      },
    ],
    training_instructors: [
      {
        name: '김현우',
        internal_external: '외부',
        career_years: 12,
        work_name: 'AI 기반 스마트 품질관리 실무',
        detailed_training_content: [
          '생산 데이터 수집·정제',
          '불량 원인 AI 분석',
          '개선안 표준화·매뉴얼화',
        ],
      },
    ],
  },
  evaluation_plan: {
    course_evaluation: {
      course_name: 'AI 기반 스마트 품질관리 실무',
      evaluation_methods: ['포트폴리오', '문제해결시나리오'],
      evaluation_target: '품질관리팀·생산팀 재직자 12명',
      evaluation_date: '2026-03-27',
      evaluation_criteria: '3개 업무(단원) 중 수행 수준 4 이상 2개(60%) 이상 시 PASS',
      evaluation_result: '예정',
      performance_checklist: [
        {
          unit_name: '생산 데이터 수집·정제',
          evaluation_criteria: 'AI로 전처리 스크립트를 작성해 분석용 데이터셋을 구축한다',
          performance_level: 4,
        },
        {
          unit_name: '불량 원인 AI 분석',
          evaluation_criteria: '공정 조건과 불량의 상관관계를 해석해 핵심 관리 변수를 도출한다',
          performance_level: 4,
        },
        {
          unit_name: '개선안 표준화·매뉴얼화',
          evaluation_criteria: '분석 결과를 SOP·교육자료로 문서화한다',
          performance_level: 3,
        },
      ],
      overall_comment: '현장 데이터 기반 문제해결 역량이 전반적으로 향상됨. 후속 심화 과정 권장.',
      evaluation_scale: PBL_EVALUATION_SCALE_DESCRIPTION,
    },
    result_evaluation: {
      satisfaction_survey: [5, 4, 5, 4, 4],
      achievement_survey: [4, 4, 5],
      external_expert_survey: [5, 4, 4, 5, 4],
      practical_application_survey: [4, 4, 5, 4],
      respondent_name: '이정민',
      evaluation_date: '2026-03-27',
    },
  },
};
