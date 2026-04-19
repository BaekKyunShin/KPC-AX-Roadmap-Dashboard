/**
 * /test-pbl 페이지용 샘플 PBL 인터뷰 데이터.
 *
 * 산인공 PBL 양식(양식 2번) 3~11p 인터뷰 전 필드를 채운 fixture.
 * `src/lib/schemas/interview-pbl.ts` 의 `pblInterviewSchema`를 준수.
 *
 * Server Action에서 이 fixture를 로드해 LLM에 전달 → PBLContent 초안 생성.
 * E2E 테스트에서도 동일 데이터를 폼 자동 채우기에 활용 가능.
 */

export const PBL_INTERVIEW_SAMPLE = {
  courseOverview: {
    company_name: '샘플정밀공업(주)',
    business_registration_no: '123-45-67890',
    industry_code: 'C29',
    industry_main: '기타 기계 및 장비 제조업',
    address: '경기도 시흥시 공단로 123',
    training_address: '본사 3층 교육장',
    jurisdiction_office: '경기지방고용노동청',
    contact: {
      position: '인재개발팀장',
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'hr@example.com',
    },
    course_name: 'AI 활용 불량 예측 PBL 과정',
    ncs_code: '14010101',
    training_hours: 40,
    trainee_count: 12,
    training_job: '품질검사원',
    ai_level: 'AI탐구형' as const,
    training_goals: ['불량률 감소', '공정 최적화'] as Array<
      '기술문제 해결' | '공정 최적화' | '불량률 감소' | '기술 매뉴얼 개발' | '기타'
    >,
  },
  companyStatus: {
    business_issues:
      '최근 3년간 수출 물량 증가로 생산량은 늘었으나, 핵심 공정에서 불량률이 2.4%로 상승. 육안검사에 의존해 품질 편차가 크고 원인 추적이 어려움. AI 기반 예측·분석을 도입해 품질을 정상화하고 현장 데이터 분석 역량을 내재화하려 함.',
    organization: [
      {
        id: 'org-1',
        department_name: '품질관리부',
        tasks: ['입고 검사', '공정 검사', '출하 검사', '품질 데이터 분석'],
      },
      {
        id: 'org-2',
        department_name: '생산기술부',
        tasks: ['공정 개선', '설비 유지보수', '표준 관리'],
      },
      {
        id: 'org-3',
        department_name: '경영지원팀',
        tasks: ['인재 개발', '예산 관리'],
      },
    ],
  },
  trainingEnvironment: {
    proper_training_hours: 40,
    training_place: {
      types: ['사내'] as Array<'사내' | '사외'>,
      location: '본사 3층 교육장',
      special_notes: '실습 구역은 생산 현장(품질검사 라인)에서 진행',
    },
    internal_instructor: { used: true, name: '김품질', position: '품질관리 파트장' },
    target_count: 12,
    target_characteristics: { career: '3~10년차', level: '주임~과장' },
    ai_infrastructure: {
      ai_tools: '제한적' as const,
      network: '양호' as const,
      pc_count: 10,
      etc_equipment: '검사용 카메라 2대, 측정기기 공유',
    },
    training_needs_analysis:
      '현장 실무자들은 AI 개념을 들어봤으나 실제 활용 경험이 부족. 품질 데이터 분석과 시각화, 불량 원인 탐지에 AI 도구(ChatGPT/Claude/Notebook) 적용법을 체계적으로 학습해야 함.',
    expectation: {
      as_is: '육안 검사·경험 기반 판정으로 편차 발생, 불량률 2.4%',
      to_be: '데이터 기반 불량 예측·근본원인 분석으로 불량률 1.5% 이하',
    },
  },
  hrdNecessity: {
    training_history: [
      {
        id: 'hist-1',
        seq: 1,
        program: '사내 품질교육',
        course_name: '기초 품질관리',
        duration: '2024-08 (16H)',
        result: '수료',
      },
      {
        id: 'hist-2',
        seq: 2,
        program: '직업능력개발',
        course_name: 'AI 이해와 활용 입문',
        duration: '2025-03 (8H)',
        result: '수료',
      },
    ],
    custom_course_reason:
      '기존 공개과정은 AI 일반론 중심이라 자사 품질 데이터와 공정에 직접 적용하기 어려움. 현장 과업·데이터·용어에 맞춘 맞춤 훈련이 필요.',
    development_need:
      'AI 도구 활용 역량을 실제 품질 데이터에 적용해 불량 원인 탐지·개선 루틴을 조직 내에 내재화해야 함.',
  },
  performanceActivities: {
    activities: [
      {
        id: 'act-1',
        round: 1,
        date: '2026-04-20',
        content: 'HRD 분석 및 훈련 목표 합의',
        method: '대면 워크숍',
        operation_mode: '대면' as const,
        participants: { pm: '김컨설턴트', external_expert: '-', internal_hrd: '홍길동' },
      },
      {
        id: 'act-2',
        round: 2,
        date: '2026-04-27',
        content: '훈련과정 설계 및 샘플 데이터 준비',
        method: '비대면 회의 + 문서 공유',
        operation_mode: '비대면' as const,
        participants: { pm: '김컨설턴트', external_expert: '박AI전문가', internal_hrd: '홍길동' },
      },
      {
        id: 'act-3',
        round: 3,
        date: '2026-05-10',
        content: '훈련 실시(1차) 및 중간 점검',
        method: '대면 훈련',
        operation_mode: '대면' as const,
        participants: { pm: '김컨설턴트', external_expert: '박AI전문가', internal_hrd: '김품질' },
      },
    ],
  },
  problemDefinition: {
    current_issues:
      '품질 데이터가 수기 기록과 엑셀에 분산. 불량 발생 시 원인 분석이 경험에 의존해 시간이 오래 걸리고 재발이 잦음.',
    root_causes: [
      '데이터 수집·저장 체계 부재',
      '통계·AI 도구 활용 경험 부족',
      '부서 간 데이터 공유 규칙 미정',
    ],
    gap_analysis: 'As-Is: 수작업 집계·경험 판정 / To-Be: AI 기반 이상 탐지·근본원인 추적',
  },
  targetTasks: {
    selection_reason:
      '품질검사·공정 개선은 불량률과 직결되고 데이터 축적이 가장 잘 되어 있어 AI 적용 효과를 가장 빠르게 검증 가능.',
    target_task_details: [
      {
        id: 'task-1',
        task_name: '공정 불량 원인 분석',
        as_is: '엑셀·수기 집계 후 회의에서 경험적으로 판정.',
        to_be: 'AI 도구로 불량 데이터 패턴을 탐지하고 근본원인을 시각화.',
        required_knowledge: '통계적 공정관리(SPC) 개념, 불량 분류 체계',
        required_skill: 'ChatGPT/Notebook으로 데이터 정제·분석, 시각화 리포팅',
      },
      {
        id: 'task-2',
        task_name: '품질 보고서 작성',
        as_is: '월간 품질 보고서를 수작업으로 작성, 부서별 포맷 상이.',
        to_be: 'AI 보조로 표준 템플릿에 맞춰 자동 초안 생성 후 담당자가 검토·확정.',
        required_knowledge: '보고서 표준 구조, 공정 지표 정의',
        required_skill: '프롬프트 설계, 문서 템플릿 자동화',
      },
    ],
  },
  aiLevelDiagnosis: {
    current_ai_level: 'AI탐구형' as const,
    expected_ai_level: 'AI활용형' as const,
    improvement_reason:
      '본 과정 이후 품질검사·공정 개선 업무에 AI 도구를 상시 활용하고, 확보한 분석 결과를 내부 보고·개선 루틴에 정착시키기 위함.',
  },
} as const;

export type PBLInterviewSample = typeof PBL_INTERVIEW_SAMPLE;
