/**
 * /test-pbl 페이지용 샘플 PBL 인터뷰 데이터 (V2 · 양식 2:1 정합 camelCase).
 *
 * `src/lib/schemas/interview-pbl.ts` 의 `PBLInterviewStrictSchema` 를 준수.
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
  // 양식의 P-04 표는 한컴오피스 사용자가 직접 작성하는 영역.

  // ── Ⅱ-2 훈련환경 분석 (Phase E — 양식 P-05 11행 정합 11 영역) ────────────
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
    // 양식 P-05 누락 3행 보강 (사용자 보고)
    targetTraineeCount: 16,
    internalInstructorUsage: 'YES',
    internalInstructorPrimary: { name: '김품질', position: '품질관리 파트장' },
    otherEquipment: '프로젝터 2대, 디지털 화이트보드 1대, 검사용 카메라 2대',
  },

  // ── Ⅱ-3-가 HRD이음 PDF (테스트 모드에서는 첨부 없음) ──────────────────────
  hrdReportPdf: null,

  // ── Ⅱ-3-나 AI훈련과정 개발 필요성 ─────────────────────────────────────────
  courseNecessity:
    '기존 공개과정은 AI 일반론 중심이라 자사 품질 데이터·공정·용어에 직접 적용하기 어려움. 본 PBL 과정은 ① 자사 최근 6개월 불량 이미지 12만 장을 실습 데이터로 사용, ② 품질검사·공정개선·설비보전 3개 직무가 공통으로 겪는 불량 원인 추적 문제를 중심 과제로 설계, ③ ChatGPT/Claude/Notebook 도구로 데이터 분석·보고 자동화 루틴을 조직 내부에 내재화하는 것을 목표로 한다. 훈련 종료 후에도 수강생이 즉시 현장에 적용할 수 있도록 실제 업무 산출물(월간 품질 보고서 템플릿·불량 분석 Notebook) 을 결과물로 작성한다.',

  // ── Ⅲ-1 수행활동 (R8 PBL-자체-03 — 평면 4행 배열 / 차수당 4 역할) ────────
  activities: [
    // 1차 — 4 역할 행
    { round: 1, role: 'PM' as const, personName: '김컨설턴트', date: '2026-04-20', content: 'HRD 분석 및 훈련 목표 합의 진행', method: '대면 워크숍' },
    { round: 1, role: 'EXTERNAL_EXPERT' as const, personName: '', date: '', content: '', method: '' },
    { round: 1, role: 'INTERNAL_EXPERT' as const, personName: '홍길동', date: '2026-04-20', content: '사내 현황 공유 및 양식 2 Ⅱ-1·2 입력 검토', method: '대면 워크숍' },
    { round: 1, role: 'JURISDICTION_MANAGER' as const, personName: '', date: '', content: '', method: '' },
    // 2차
    { round: 2, role: 'PM' as const, personName: '김컨설턴트', date: '2026-04-27', content: '훈련과정 설계 총괄', method: '비대면 회의 + 문서 공유' },
    { round: 2, role: 'EXTERNAL_EXPERT' as const, personName: '박AI전문가', date: '2026-04-27', content: '데이터 샘플(불량 이미지 12만 장) 준비 및 실습 환경 점검', method: '비대면 회의' },
    { round: 2, role: 'INTERNAL_EXPERT' as const, personName: '홍길동', date: '2026-04-27', content: '사내 데이터 접근 권한 확인', method: '비대면 회의' },
    { round: 2, role: 'JURISDICTION_MANAGER' as const, personName: '', date: '', content: '', method: '' },
    // 3차
    { round: 3, role: 'PM' as const, personName: '김컨설턴트', date: '2026-05-10', content: '훈련 실시(1차) 진행 총괄 · 중간 점검', method: '대면 실습' },
    { round: 3, role: 'EXTERNAL_EXPERT' as const, personName: '박AI전문가', date: '2026-05-10', content: '데이터 분석 실습 멘토링 · 과제 피드백', method: '대면 실습' },
    { round: 3, role: 'INTERNAL_EXPERT' as const, personName: '김품질', date: '2026-05-10', content: '현장 사례 연계 · 검사 표준화 PoC 시연', method: '대면 실습' },
    { round: 3, role: 'JURISDICTION_MANAGER' as const, personName: '이주치', date: '2026-05-10', content: 'HRD이음 결과 활용 점검 · 능력개발 관점 컨설팅', method: '서면 검토' },
  ],

  // ── Ⅲ-2-가 문제 정의서 (R8 PBL-자체-04 — 4 정형 항목 단일 세트) ──────────
  problemDefinitionSheet: {
    background:
      '부서별·라인별 체크시트 포맷이 상이해 품질 데이터 통합 분석이 어렵고, AI 도입 시도가 파일럿 수준에서 멈춤. 부서 간 데이터 공유 규칙 미정.',
    core: '품질 데이터의 표준화·통합·AI 활용 역량 부족으로 불량 원인 추적 리드타임이 길고 반복 분석이 발생.',
    scope: '생산·품질·공정개선 부서의 체크시트 표준화, 데이터 통합 저장소 구축, AI 도구 활용 역량 확보.',
    constraints:
      '예산·일정상 ERP 전면 교체 불가. 현장 실무자의 AI 도구 활용 경험 부족. 부서 간 데이터 공유 규칙 미정.',
  },

  // ── Ⅲ-2-나 문제 우선순위 ─────────────────────────────────────────────────
  priority: {
    method:
      'AHP + 경영진 협의. 영향(불량률·재무 손실)·긴급성(고객사 요구) 각 가중치 0.6 / 0.4 로 계산 후 경영진이 최종 확정.',
    items: [
      { problem: '품질 데이터가 엑셀·수기로 분산', score: 5, rank: 1 },
      { problem: 'AI 도구 활용 경험 부족', score: 4, rank: 2 },
      { problem: '부서 간 데이터 공유 규칙 미정', score: 3, rank: 3 },
    ],
  },

  // ── Ⅲ-3 훈련대상 업무 ────────────────────────────────────────────────────
  target: {
    name: '공정 불량 원인 분석 및 품질 보고서 작성',
    code: '200107-03',
    scope:
      '품질관리부(8명) + 생산기술부(4명) 총 12명. 완제품 외관 검사·공정 개선·월간 품질 보고서 작성 업무를 담당하는 주임~과장.',
    necessity:
      '불량 원인 분석·보고서 작성은 품질 이슈 해결의 병목. AI 도구로 데이터 정제·시각화·초안 자동화가 가능해 개선 효과가 가장 크고 12명 전원이 공통으로 수행하므로 훈련 후 현업 적용 전환율이 높음.',
    necessity_score: 5,
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

  // ── Ⅲ-4-가 현재 AI 역량 수준 ─────────────────────────────────────────────
  currentAiLevel: {
    level: 'EXPLORER',
    note:
      'AI 탐구형 — 일부 구성원이 ChatGPT 를 개인적으로 사용 중이나 업무에 체계적으로 적용하지 못함. 데이터 리터러시는 기초 수준이라 통계·시각화에서 추가 보강 필요.',
  },

  // ── Ⅲ-4-나 예상 AI 역량 수준 (수강 이후) ──────────────────────────────────
  expectedAiLevel: {
    level: 'USER',
    note:
      'AI 활용형 — 본 과정 이후 품질검사·공정 개선 업무에 AI 도구를 상시 활용하고, 확보한 분석 결과를 내부 보고·개선 루틴에 정착. 사내 AI 챔피언 3명을 양성해 전 부서 확산 기반 확보.',
  },
};

export type PBLInterviewSample = typeof PBL_INTERVIEW_SAMPLE;
