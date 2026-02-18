import type {
  CurriculumModule,
  RoadmapCell,
  RoadmapRow,
  PBLCourse,
} from '@/lib/services/roadmap';

// =============================================================================
// 데모용 샘플 데이터
// =============================================================================

export const SAMPLE_COMPANY = {
  name: '(주)샘플유통',
  industry: '유통·서비스업',
  size: '중소기업 (120명)',
};

// ---------------------------------------------------------------------------
// 첫 번째 과정 공통 속성 (SAMPLE_COURSE_SINGLE + SAMPLE_PBL 공유)
// ---------------------------------------------------------------------------

const FIRST_COURSE_NAME = 'ChatGPT로 고객 문의 자동 분류하기';
const FIRST_COURSE_TARGET_AUDIENCE = 'CS 담당자, 고객관리팀';
const FIRST_COURSE_HOURS = 12;
const FIRST_COURSE_PREREQUISITES = [
  '최근 3개월 고객 문의 데이터',
  'PC (인터넷 연결 필수)',
  '기본 엑셀 활용 능력',
];

const FIRST_COURSE_CURRICULUM: CurriculumModule[] = [
  {
    module_name: '1주차: AI 챗봇과 프롬프트 기초',
    hours: 3,
    details: [
      'ChatGPT 기본 사용법과 프롬프트 작성 원칙',
      '고객 문의 유형 분류 체계 설계',
      '실제 CS 데이터로 프롬프트 테스트',
    ],
    practice: '자사 고객 문의 50건을 ChatGPT로 유형별 분류',
  },
  {
    module_name: '2주차: 문의 자동 분류 시스템 구축',
    hours: 3,
    details: [
      'Google Sheets에 문의 데이터 정리 및 구조화',
      'ChatGPT API 없이 반자동 분류 워크플로우 설계',
      '분류 정확도 검증 및 프롬프트 개선',
    ],
    practice: '문의 분류 워크플로우 구축 및 정확도 80% 달성',
  },
  {
    module_name: '3주차: 자동 응답 템플릿 생성',
    hours: 3,
    details: [
      '유형별 응답 템플릿 작성 가이드',
      'ChatGPT로 상황별 맞춤 응답 생성',
      '톤앤매너 일관성 유지 기법',
    ],
    practice: '주요 문의 유형 10개에 대한 자동 응답 템플릿 완성',
  },
  {
    module_name: '4주차: 현업 적용 및 성과 측정',
    hours: 3,
    details: [
      '실제 업무에 AI 분류 시스템 적용',
      '응답 시간 단축 효과 측정',
      '지속적인 프롬프트 개선 방안',
    ],
    practice: '1주일간 실무 적용 후 Before/After 비교 보고서 작성',
  },
];

// 과정 상세 데이터 (RoadmapCell 타입) - 첫 번째 과정만 (슬라이드용)
export const SAMPLE_COURSE_SINGLE: RoadmapCell = {
  course_name: FIRST_COURSE_NAME,
  level: 'BEGINNER',
  target_task: '고객관리-고객문의응대',
  target_audience: FIRST_COURSE_TARGET_AUDIENCE,
  recommended_hours: FIRST_COURSE_HOURS,
  curriculum: FIRST_COURSE_CURRICULUM,
  tools: [
    { name: 'ChatGPT', free_tier_info: '무료 (일일 사용 제한 있음)' },
    { name: 'Google Sheets', free_tier_info: '완전 무료' },
    { name: 'Notion', free_tier_info: '개인용 무료' },
  ],
  expected_outcome: '고객 문의 응답 시간 40% 단축, 분류 정확도 85% 이상 달성',
  measurement_method: '평균 응답 시간 Before/After 비교, 분류 정확도 샘플링 검증',
  prerequisites: FIRST_COURSE_PREREQUISITES,
};

// 전체 과정 목록
export const SAMPLE_COURSES: RoadmapCell[] = [
  SAMPLE_COURSE_SINGLE,
  {
    course_name: 'AI 활용 마케팅 콘텐츠 제작',
    level: 'INTERMEDIATE',
    target_task: '마케팅-콘텐츠제작',
    target_audience: '마케팅 담당자, SNS 운영자',
    recommended_hours: 16,
    curriculum: [
      {
        module_name: '1주차: AI 콘텐츠 생성 기초',
        hours: 4,
        details: [
          'ChatGPT로 블로그/SNS 글 작성 실습',
          '타겟 고객별 톤앤매너 설정',
          '효과적인 카피라이팅 프롬프트 패턴',
        ],
        practice: '자사 제품/서비스 소개 콘텐츠 5개 생성',
      },
      {
        module_name: '2주차: AI 이미지·디자인 제작',
        hours: 4,
        details: [
          'Canva AI 기능 활용한 디자인 제작',
          'SNS 배너, 카드뉴스, 썸네일 제작',
          '브랜드 일관성 유지하는 디자인 시스템',
        ],
        practice: 'SNS 콘텐츠 세트 (배너 + 카드뉴스 3장) 제작',
      },
      {
        module_name: '3주차: 프레젠테이션·보고서 자동 생성',
        hours: 4,
        details: [
          'Gamma로 마케팅 보고서 자동 생성',
          '데이터 시각화 기초',
          '월간 마케팅 리포트 템플릿 구축',
        ],
        practice: '월간 마케팅 성과 보고서 자동 생성 워크플로우 구축',
      },
      {
        module_name: '4주차: 통합 콘텐츠 전략 수립',
        hours: 4,
        details: [
          'AI 도구별 최적 활용 시나리오 정리',
          '월간 콘텐츠 캘린더 자동화',
          '성과 측정 및 개선 사이클',
        ],
        practice: '다음 달 콘텐츠 캘린더 및 콘텐츠 초안 일괄 생성',
      },
    ],
    tools: [
      { name: 'ChatGPT', free_tier_info: '무료 (일일 사용 제한 있음)' },
      { name: 'Canva', free_tier_info: '무료 플랜 (기본 기능 전체)' },
      { name: 'Gamma', free_tier_info: '무료 (월 10회 생성)' },
    ],
    expected_outcome: '콘텐츠 제작 시간 60% 단축, 월간 콘텐츠 발행량 2배 증가',
    measurement_method: '콘텐츠 제작 소요 시간, 월간 발행 건수, SNS 참여율 추적',
    prerequisites: ['자사 브랜드 가이드라인', '기존 마케팅 콘텐츠 샘플', 'PC (인터넷 연결 필수)'],
  },
  {
    course_name: '노코드로 업무 자동화 구축하기',
    level: 'ADVANCED',
    target_task: '경영지원-데이터분석',
    target_audience: '경영지원팀, IT 담당자, 각 부서 업무 담당자',
    recommended_hours: 24,
    curriculum: [
      {
        module_name: '1주차: 업무 자동화 설계',
        hours: 6,
        details: [
          '반복 업무 식별 및 자동화 가능성 분석',
          'Make(구 Integromat) 기본 사용법',
          '트리거-액션 기반 워크플로우 이해',
        ],
        practice: '부서별 반복 업무 리스트 작성 및 자동화 우선순위 선정',
      },
      {
        module_name: '2주차: 데이터 수집·정리 자동화',
        hours: 6,
        details: [
          'Google Sheets + ChatGPT 연동 자동화',
          '이메일·폼 데이터 자동 수집 및 정리',
          '데이터 정합성 검증 자동화',
        ],
        practice: '고객 데이터 자동 수집 → 정리 → 알림 파이프라인 구축',
      },
      {
        module_name: '3주차: 보고·알림 자동화',
        hours: 6,
        details: [
          '주간/월간 보고서 자동 생성 워크플로우',
          '조건별 알림 자동 발송 (이메일, 슬랙)',
          '대시보드 자동 업데이트',
        ],
        practice: '주간 매출 보고서 자동 생성 및 팀 공유 워크플로우 구축',
      },
      {
        module_name: '4주차: 통합 자동화 및 운영',
        hours: 6,
        details: [
          '멀티 도구 연동 자동화 설계',
          '오류 처리 및 모니터링',
          '자동화 문서화 및 팀 전파',
        ],
        practice: '핵심 업무 3개 이상의 엔드투엔드 자동화 완성',
      },
    ],
    tools: [
      { name: 'Make (Integromat)', free_tier_info: '무료 (월 1,000 오퍼레이션)' },
      { name: 'Google Sheets', free_tier_info: '완전 무료' },
      { name: 'Notion', free_tier_info: '개인용 무료' },
    ],
    expected_outcome: '주 10시간 이상의 반복 업무 자동화, 데이터 입력 오류 90% 감소',
    measurement_method: '자동화된 업무 시간 합산, 수작업 오류율 Before/After 비교',
    prerequisites: ['자동화 대상 업무 프로세스 문서', 'Google Workspace 계정', 'PC (인터넷 연결 필수)'],
  },
  {
    course_name: 'AI로 주간 보고서 자동 작성하기',
    level: 'BEGINNER',
    target_task: '경영지원-보고서작성',
    target_audience: '전 부서 실무자, 팀장',
    recommended_hours: 8,
    curriculum: [
      {
        module_name: '1주차: AI 문서 작성 기초',
        hours: 3,
        details: [
          'ChatGPT로 업무 보고서 작성 실습',
          '보고서 유형별 프롬프트 템플릿 구축',
          'Google Docs 연동 활용',
        ],
        practice: '주간 업무 보고서 초안 자동 생성',
      },
      {
        module_name: '2주차: 데이터 기반 보고서 고도화',
        hours: 3,
        details: [
          'Google Sheets 데이터를 활용한 보고서 작성',
          '차트·그래프 자동 생성 및 삽입',
          'Gamma로 프레젠테이션 보고서 변환',
        ],
        practice: '실제 업무 데이터로 시각화 포함 보고서 완성',
      },
      {
        module_name: '3주차: 보고서 워크플로우 정착',
        hours: 2,
        details: [
          '보고서 자동 생성 루틴 수립',
          '팀 내 공유 및 피드백 프로세스',
          '지속적 개선 방안',
        ],
        practice: '팀 내 보고서 자동화 가이드 문서 작성',
      },
    ],
    tools: [
      { name: 'ChatGPT', free_tier_info: '무료 (일일 사용 제한 있음)' },
      { name: 'Google Docs', free_tier_info: '완전 무료' },
      { name: 'Gamma', free_tier_info: '무료 (월 10회 생성)' },
    ],
    expected_outcome: '보고서 작성 시간 50% 단축, 보고서 품질 표준화',
    measurement_method: '보고서 작성 소요 시간 Before/After, 상위 보고 피드백 만족도',
    prerequisites: ['기존 보고서 양식 및 샘플', 'PC (인터넷 연결 필수)'],
  },
];

// 매트릭스 데이터
export const SAMPLE_MATRIX: RoadmapRow[] = [
  {
    task_id: '1',
    task_name: '고객관리-고객문의응대',
    beginner: [{ course_name: 'ChatGPT로 고객 문의 자동 분류하기', recommended_hours: 12 }],
    intermediate: [{ course_name: 'AI 챗봇 기반 고객 응대 시스템', recommended_hours: 20 }],
    advanced: [{ course_name: '고객 여정 분석 및 맞춤 응대 자동화', recommended_hours: 28 }],
  },
  {
    task_id: '2',
    task_name: '마케팅-콘텐츠제작',
    beginner: [{ course_name: 'AI로 SNS 콘텐츠 빠르게 만들기', recommended_hours: 8 }],
    intermediate: [{ course_name: 'AI 활용 마케팅 콘텐츠 제작', recommended_hours: 16 }],
    advanced: [{ course_name: '데이터 기반 마케팅 전략 자동화', recommended_hours: 24 }],
  },
  {
    task_id: '3',
    task_name: '경영지원-데이터분석',
    beginner: [{ course_name: 'AI로 엑셀 데이터 쉽게 분석하기', recommended_hours: 8 }],
    intermediate: [{ course_name: 'Google Sheets + AI 데이터 분석', recommended_hours: 16 }],
    advanced: [{ course_name: '노코드로 업무 자동화 구축하기', recommended_hours: 24 }],
  },
  {
    task_id: '4',
    task_name: '경영지원-보고서작성',
    beginner: [{ course_name: 'AI로 주간 보고서 자동 작성하기', recommended_hours: 8 }],
    intermediate: [{ course_name: '데이터 시각화 보고서 자동 생성', recommended_hours: 16 }],
    advanced: [{ course_name: '경영 대시보드 구축 및 자동 리포팅', recommended_hours: 24 }],
  },
];

// PBL 과정별 산출물 및 도구 (기본 커리큘럼을 확장)
const PBL_MODULE_EXTENSIONS = [
  {
    deliverables: ['문의 유형 분류 체계 문서', '프롬프트 템플릿 모음', '분류 결과 스프레드시트'],
    tools: [
      { name: 'ChatGPT', free_tier_info: '무료 (일일 사용 제한 있음)' },
      { name: 'Google Sheets', free_tier_info: '완전 무료' },
    ],
  },
  {
    deliverables: ['자동 분류 워크플로우 매뉴얼', '정확도 검증 보고서'],
    tools: [
      { name: 'Google Sheets', free_tier_info: '완전 무료' },
      { name: 'Notion', free_tier_info: '개인용 무료' },
    ],
  },
  {
    deliverables: ['유형별 응답 템플릿 10종', '톤앤매너 가이드'],
    tools: [
      { name: 'ChatGPT', free_tier_info: '무료 (일일 사용 제한 있음)' },
      { name: 'Google Docs', free_tier_info: '완전 무료' },
    ],
  },
  {
    deliverables: ['실무 적용 가이드', '성과 분석 보고서', '개선 로드맵'],
    tools: [
      { name: 'Gamma', free_tier_info: '무료 (월 10회 생성)' },
      { name: 'Google Sheets', free_tier_info: '완전 무료' },
    ],
  },
];

// PBL 과정 데이터
export const SAMPLE_PBL: PBLCourse = {
  selected_course_name: FIRST_COURSE_NAME,
  selected_course_level: 'BEGINNER',
  selected_course_task: '고객관리-고객문의응대',
  selection_rationale: {
    consultant_expertise_fit: '담당 컨설턴트가 AI 업무 자동화 및 프롬프트 엔지니어링 전문가로서 실습 지도에 최적화되어 있습니다.',
    pain_point_alignment: '기업의 주요 페인포인트인 "고객 문의 응답 지연"과 "CS 인력 부족"을 직접 해결할 수 있는 과정입니다.',
    feasibility_assessment: '초급 과정으로 비개발자도 바로 시작할 수 있으며, 무료 도구만으로 즉시 업무에 적용 가능합니다.',
    summary: '컨설턴트 전문성, 고객사 니즈, 실현 가능성을 종합적으로 고려했을 때 가장 효과적인 첫 단계 과정입니다.',
  },
  course_name: `${FIRST_COURSE_NAME} - PBL 프로젝트`,
  total_hours: FIRST_COURSE_HOURS,
  target_tasks: ['고객관리-고객문의응대', '경영지원-보고서작성'],
  target_audience: FIRST_COURSE_TARGET_AUDIENCE,
  curriculum: FIRST_COURSE_CURRICULUM.map((mod, i) => ({
    ...mod,
    ...PBL_MODULE_EXTENSIONS[i],
  })),
  final_deliverables: [
    '고객 문의 자동 분류 워크플로우 (Google Sheets 기반)',
    '유형별 자동 응답 템플릿 10종',
    '운영 매뉴얼 및 프롬프트 가이드',
    '성과 분석 보고서',
  ],
  expected_outcomes: [
    '고객 문의 응답 시간 40% 단축',
    '문의 분류 정확도 85% 이상 달성',
    'CS 담당자 1인당 처리량 30% 증가',
  ],
  business_impact: '연간 CS 운영 비용 20% 절감 예상. 응답 속도 향상으로 고객 만족도 개선 및 재구매율 증가.',
  measurement_methods: [
    '평균 응답 시간: Before/After 비교',
    '분류 정확도: 주간 샘플링 검증 (50건)',
    '고객 만족도(CSAT): 월별 추적',
  ],
  prerequisites: FIRST_COURSE_PREREQUISITES,
};
