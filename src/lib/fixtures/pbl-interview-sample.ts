/**
 * /test-pbl 페이지용 샘플 PBL 인터뷰 데이터 (V2 · 양식 2:1 정합 camelCase).
 *
 * `src/lib/schemas/interview-pbl.ts` 의 `PBLInterviewStrictSchema` 를 준수.
 * v2 양식 기준: AI역량 진단·문제 우선순위는 제거되고(AI역량은 로드맵 연계),
 * Ⅲ-3 훈련대상 업무는 로드맵 과업 목록에 대한 선정 입력(taskSelections)으로 대체됐다.
 * Ⅲ-1 수행활동은 정본 표가 로드맵 Ⅰ-2 와 달라 **PBL 자체 입력**으로 유지한다.
 * Ⅰ·Ⅱ·Ⅲ 전 섹션을 채운 제조업 사례 — LLM 이 PBL 보고서 초안을 양질로 생성할 수
 * 있는 수준으로 모든 필드를 현실적 문장으로 작성한다.
 */

import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

export const PBL_INTERVIEW_SAMPLE: PBLInterviewStrict = {
  // ── Ⅰ 훈련과정 개요 ───────────────────────────────────────────────────────
  companyName: '샘플정밀공업(주)',
  courseName: 'AI 활용 불량 예측 PBL 과정',
  ncsCode: '200107',
  trainingHours: 40,
  trainingTarget: '품질검사원 및 공정 개선 담당자 12명 (3~10년차 주임~과장)',
  trainingForm: '집체 40시간 (대면 실습 위주 · 일부 비대면 과제 수행)',
  trainingPeriod: '2026년 6월 ~ 2026년 7월 (주 2회 × 5주)',
  businessIssues:
    '최근 3년간 수출 물량 증가로 생산량은 늘었으나, 핵심 공정에서 불량률이 2.4% 로 상승. 육안검사에 의존해 품질 편차가 크고 원인 추적이 어려움. AI 기반 예측·분석을 도입해 품질을 정상화하고 현장 데이터 분석 역량을 내재화하려 함.',

  // ── Ⅱ-1-가 기업 경영 이슈 ─────────────────────────────────────────────────
  companyIssues:
    '① 완제품 외관·치수 검사가 육안에 의존해 불량률 2.4% 로 상승. ② 품질 데이터는 엑셀·수기에 분산되어 근본 원인 추적이 어려움. ③ 고객사(현대모비스·LS오토모티브) 품질 요구 강화로 AI 기반 품질 관리·예측 도입이 긴급 과제. ④ 현장 실무자는 AI 개념은 들어봤으나 실제 데이터에 적용한 경험이 부족.',

  // Phase E: 조직 및 주요 업무는 로드맵과 동일하게 인터뷰/결과/HWPX 3 계층에서 제거.

  // ── Ⅱ-3 훈련환경 분석 (양식 P-05 정합) ─────────────────────────────────────
  trainingEnv: {
    properTrainingHours: '회차당 4시간 × 10주 (총 40시간) / 평일 야간 집중 가능',
    internalPlace: '본사 3층 교육장 (PC 10대, 대형 디스플레이) · 생산 현장 품질검사 라인 동시 활용',
    externalPlace: '필요 시 외부 AI 교육센터 (고객사 데이터 익명화 실습 시)',
    internalInstructors: [
      {
        position: '품질관리 파트장',
        name: '김품질',
        career: '품질 관리 12년 / 검사 표준화 PoC 3건',
        personalTraits: '현장 사례 연계 우수, 데이터 분석 친화',
      },
    ],
    externalInstructors: [],
    aiInfrastructure:
      '사내 PC 10대 (i7/16GB), 네트워크 양호, ChatGPT/Claude 접근 가능 · 검사용 카메라 2대 · 측정기기 부서 공유 · 사내 보안 규정상 고객사 데이터 익명화 필수',
    targetCharacteristics: {
      career: '품질·생산기술 평균 7년 (최소 3년 / 최대 15년)',
      level: '대리~과장급 (사원 1, 대리 4, 과장 7, 차장 3, 부장 1)',
    },
    aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 10 },
    trainingNeedsAnalysis:
      '품질검사·공정개선·설비보전 3 직무가 공통으로 불량 원인 추적·보고에 시간을 과다 투입. AI 도구로 분석·시각화·보고 자동화 루틴을 도입해 리드타임 50% 단축 + 신규 인력 OJT 비용 감소가 시급.',
    expectationAsIs:
      '수동 검사 92% 정확도, 보고서 작성 평균 4시간, 불량 원인 추적은 숙련 인력 의존.',
    expectationToBe:
      'AI 자동검사 정확도 96%+, 보고서 자동 생성 1시간, 신규 인력도 동일 수준 분석 가능.',
    targetTraineeCount: 16,
    internalInstructorUsage: 'YES',
    internalInstructorPrimary: { name: '김품질', position: '품질관리 파트장' },
    otherEquipment: '프로젝터 2대, 디지털 화이트보드 1대, 검사용 카메라 2대',
  },

  // ── Ⅱ-2-가 HRD이음 PDF (테스트 모드에서는 첨부 없음) ──────────────────────
  hrdReportPdf: null,

  // ── Ⅱ-1-다 AI훈련과정 개발 필요성 ─────────────────────────────────────────
  courseNecessity:
    '기존 공개과정은 AI 일반론 중심이라 자사 품질 데이터·공정·용어에 직접 적용하기 어려움. 본 PBL 과정은 ① 자사 최근 6개월 불량 이미지 12만 장을 실습 데이터로 사용, ② 품질검사·공정개선·설비보전 3개 직무가 공통으로 겪는 불량 원인 추적 문제를 중심 과제로 설계, ③ ChatGPT/Claude/Notebook 도구로 데이터 분석·보고 자동화 루틴을 조직 내부에 내재화하는 것을 목표로 한다.',

  // ── Ⅲ-1 훈련과제 도출 수행활동 (PBL 자체 입력 — 정본 4역할 · 수행 일자) ─────
  // 선행 로드맵 컨설팅(Ⅱ-1-나)과 **다른 일정**이다. 날짜만 기입(양식에 시간 칸 없음).
  performanceActivities: [
    {
      round: 1,
      date: '26/06/03',
      content:
        '핵심문제 파악 워크숍 — 경영진·품질/생산/공정개선 실무자 6명 참여. 불량 원인 추적이 지연되는 지점을 공정 순서대로 짚어 병목 3곳 도출.',
      method: 'WORKSHOP',
      participants: {
        pm: '홍길동',
        external_expert: '이직무',
        internal_expert: '김품질',
        jurisdiction_manager: '최주치의',
      },
    },
    {
      round: 2,
      date: '26/06/10',
      content:
        '문제 정의서 확정 회의 — 체크시트 포맷 상이 문제를 핵심 문제로 합의하고 훈련 범위를 품질검사 라인으로 한정.',
      method: 'VIDEO',
      participants: {
        pm: '홍길동',
        external_expert: '이직무',
        internal_expert: '김품질',
        jurisdiction_manager: '최주치의',
      },
    },
    {
      round: 3,
      date: '26/06/17',
      content:
        '훈련대상 업무 선정 협의 — 로드맵 과업 분석표 중 AI 적용 효과가 큰 2개 업무를 훈련 대상으로 확정.',
      method: 'ONSITE',
      participants: {
        pm: '홍길동',
        external_expert: '이직무',
        internal_expert: '김품질',
        jurisdiction_manager: '최주치의',
      },
    },
  ],

  // ── Ⅲ-2-가 문제 정의서 (4 정형 항목 단일 세트) ────────────────────────────
  problemDefinitionSheet: {
    background:
      '부서별·라인별 체크시트 포맷이 상이해 품질 데이터 통합 분석이 어렵고, AI 도입 시도가 파일럿 수준에서 멈춤. 부서 간 데이터 공유 규칙 미정.',
    core: '품질 데이터의 표준화·통합·AI 활용 역량 부족으로 불량 원인 추적 리드타임이 길고 반복 분석이 발생.',
    scope:
      '생산·품질·공정개선 부서의 체크시트 표준화, 데이터 통합 저장소 구축, AI 도구 활용 역량 확보.',
    constraints:
      '예산·일정상 ERP 전면 교체 불가. 현장 실무자의 AI 도구 활용 경험 부족. 부서 간 데이터 공유 규칙 미정.',
  },

  // ── Ⅲ-3 훈련대상 업무 (로드맵 과업 목록 선정 + 선정 사유 + 세부내용) ────────
  target: {
    // Ⅲ-3-가: 선행 로드맵 과업 목록에 대한 PBL 선정 입력(로드맵 과업 순서와 1:1).
    taskSelections: [
      { ai_necessity: '높음 — 12명 전원 공통 수행, 개선 효과 최대', training_selected: true },
      { ai_necessity: '중간 — 공정개선 담당 4명', training_selected: true },
      { ai_necessity: '낮음 — 별도 시스템 존재', training_selected: false },
    ],
    // Ⅲ-3-나: 선정 사유
    necessity:
      '불량 원인 분석·보고서 작성은 품질 이슈 해결의 병목. AI 도구로 데이터 정제·시각화·초안 자동화가 가능해 개선 효과가 가장 크고 12명 전원이 공통으로 수행하므로 훈련 후 현업 적용 전환율이 높음.',
    // Ⅲ-3-다: 훈련대상 업무 세부내용 (양식 4×5 — 업무명/AS-IS/TO-BE/요구지식/기술)
    details: [
      {
        title: '품질 이슈 분석·보고서 자동화',
        as_is:
          '엑셀·수기 집계 후 회의에서 경험적으로 판정. 보고서는 부서별 포맷 상이, 작성 평균 2 영업일.',
        to_be:
          'ChatGPT + Notebook 으로 불량 데이터 패턴 탐지, 시각화 리포트 자동 생성. 표준 템플릿 기반 AI 초안 후 담당자 검토·확정. 작성 리드타임 0.5 영업일로 단축.',
        required_knowledge:
          '통계적 공정관리(SPC) 개념, 불량 분류 체계, 보고서 표준 구조, 공정 지표 정의.',
        required_skill:
          'ChatGPT/Claude/Notebook 으로 데이터 정제·분석·시각화, 프롬프트 설계, 문서 템플릿 자동화.',
      },
    ],
  },
};
