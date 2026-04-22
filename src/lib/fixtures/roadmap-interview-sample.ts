/**
 * /test-roadmap 페이지용 샘플 로드맵 인터뷰 데이터.
 *
 * 산인공 로드맵 양식(양식 1번) Ⅰ~Ⅲ 장을 모두 채운 현실적인 제조업 사례.
 * `src/lib/schemas/interview-roadmap.ts` 의 `roadmapInterviewSchema` 를 준수.
 *
 * ISSUE-02·03 Step E (2026-04-22):
 *   /test-roadmap 에 "샘플 데이터 채우기" 버튼을 추가하면서, LLM 이 양질의 로드맵
 *   초안을 생성할 수 있는 수준으로 모든 필드를 현실적 문장으로 작성한다.
 *   각 필드는 `createEmptyXxx()` 헬퍼와 동일한 타입 시그니처를 따른다.
 */

import type { RoadmapInterview } from '@/lib/schemas/interview-roadmap';

export const ROADMAP_INTERVIEW_SAMPLE: RoadmapInterview = {
  overview: {
    establishment_necessity:
      '당사(샘플정밀공업)는 자동차 부품 가공 전문 3차 협력사로, 최근 3년간 수출 물량 증가와 고객사 품질 요구 강화로 AI 도입이 전사 과제로 부상했다. 특히 품질검사·설비 예지보전·수주 대응 등 핵심 공정에서 수작업·경험 기반 판정이 한계에 부딪혀, 데이터 기반 분석과 AI 도구 활용 역량을 내재화해야 한다. HRD이음 진단 결과 AI기초형(Level 2) 으로 분류되어, 직무별 맞춤 훈련 로드맵을 수립해 전사적 AI 활용 역량을 AI탐구형(Level 3) 수준으로 끌어올리는 것이 목표다.',
    ai_competency_level: 'BEGINNER',
    selected_tasks_summary:
      '완제품 외관 검사 AI화, 설비 이상 예지보전, 주문-생산 스케줄링 최적화',
  },
  interview_date: '2026-04-20',
  interview_round: 1,
  interview_start_time: '14:00',
  interview_end_time: '16:00',
  interview_method: 'ONSITE',
  participants: [
    { id: 'sample-p1', name: '김영수', position: '생산팀장' },
    { id: 'sample-p2', name: '이민정', position: '품질관리 책임' },
    { id: 'sample-p3', name: '박현우', position: 'IT 기획' },
  ],
  company_requirements: {
    company_status:
      '자동차 부품 3차 협력사, 연 매출 약 200억, 직원 85명. 주요 고객사는 현대모비스·LS오토모티브이며 월 평균 12만 개 가공 부품을 공급한다. 생산 설비는 CNC 38대·검사라인 3개이며, 사내 ERP(더존)와 자체 개발 MES 를 운영 중이지만 AI/분석 기능은 전혀 없다. 데이터는 MES 에 축적되어 있으나 분석 및 활용을 위한 도구와 역량이 모두 부족한 상태.',
    main_problems:
      '① 완제품 외관 검사가 검사자 육안·경험에 의존해 불량률이 2.4% 로 상승, 재검사 비용 증가. ② 설비 이상 감지 체계가 없어 CNC 고장 발생 시 평균 6시간 라인 정지·납기 지연 반복. ③ 수주-생산 스케줄링이 수기 엑셀로 이뤄져 긴급 오더 대응이 느리고 재고 회전이 부진. ④ 데이터는 쌓이고 있으나 분석·시각화·의사결정 활용 역량이 조직 내부에 거의 없음.',
    push_willingness:
      '경영진은 2026년 하반기부터 AI 기반 스마트팩토리 전환을 최우선 과제로 채택했으며, 이번 훈련 로드맵 완료 후 파일럿 프로젝트(품질검사 AI) 예산 1억 원 투입을 이미 내부 승인한 상태다. 생산팀장·품질관리 책임·IT 기획 담당자 3인을 전담 TF 로 구성해 주 1회 정기 회의를 실시하며, 훈련 참여 인원은 주 2회·총 40시간 근무시간 내 학습을 보장한다.',
    expected_outcomes:
      '① 완제품 외관 검사 AI 도입으로 불량률 2.4% → 1.0% 이하 감축, 연간 재검사 비용 약 8,000만 원 절감. ② 설비 예지보전으로 계획 외 정지시간 30% 감소. ③ 주문-생산 스케줄링 자동화로 긴급 오더 응답시간 50% 단축·재고회전율 20% 개선. ④ 훈련 수료 후 전 부서에서 AI 도구를 업무에 상시 활용할 수 있는 내부 역량 확보 (사내 AI 챔피언 3명 양성).',
  },
  task_workflow_items: [
    {
      id: 'sample-t1',
      job: '품질관리',
      task_name: '완제품 외관 검사',
      as_is:
        '검사자 2인이 생산라인 말단에서 완제품을 육안으로 확인 후 수기 체크시트에 기록. 하루 평균 4천 개 검사, 검사자 피로도에 따라 판정 편차가 크다.',
      problems:
        '검사자 판정 편차로 불량률이 ±0.5%p 까지 변동. 미세 스크래치·치수 미달 등 정밀 불량은 재조립 후 고객사 불량 반품으로 이어져 월 평균 500만 원 손실.',
      data_availability:
        '검사 이력(5년 치) 엑셀 보관, 불량 유형 분류 코드 존재. 불량품 사진은 최근 6개월부터 검사라인 카메라로 자동 저장 중(약 12만 장).',
      ai_necessity: 5,
    },
    {
      id: 'sample-t2',
      job: '설비보전',
      task_name: '설비 이상 예지',
      as_is:
        'CNC 38대 중 주요 10대에 진동/온도 센서 부착, PLC 로그는 실시간 수집되나 임계치 알람만 사용. 월 1회 정기점검·고장 시 사후 수리가 기본.',
      problems:
        '베어링 마모·스핀들 이상 징후를 사전에 감지 못해 평균 6시간 라인 정지. 정지 1회당 수리비·납기 지연 손실 약 1,200만 원.',
      data_availability:
        'PLC 로그 2년 치(1분 단위) 보관, 고장 이력 CSV. 정비 일지는 수기/엑셀 혼용이라 학습 데이터로 전처리 필요.',
      ai_necessity: 4,
    },
    {
      id: 'sample-t3',
      job: '생산계획',
      task_name: '주문-생산 스케줄링',
      as_is:
        '영업팀에서 ERP 로 받은 주문을 생산계획 담당자가 매일 오전 엑셀로 우선순위·납기 기준 수기 배정. 설비 가동률·원자재 재고를 고려하지만 긴급 오더 발생 시 전면 재편성.',
      problems:
        '주 평균 2~3건 긴급 오더로 기존 스케줄이 흔들리며 대응에 평균 2시간 소요. 설비 가동률 최적화 부족으로 CNC 일평균 유휴시간 18%.',
      data_availability:
        'MES 에 축적된 주문-작업지시-실적 1년 치, 원자재 재고 및 리드타임 정보 존재. 긴급 오더 이력은 별도 집계 없음.',
      ai_necessity: 4,
    },
    {
      id: 'sample-t4',
      job: '구매',
      task_name: '원자재 수급 예측',
      as_is:
        '구매 담당자 1인이 과거 사용 패턴·예측 주문량 기준으로 월간 발주. 고객사 수요 급변 시 긴급 발주 빈번, 리드타임 최대 3주.',
      problems:
        '안전재고 과다 보유로 유동자금 압박(평균 재고 4.5억), 역으로 긴급 오더 시 원자재 부족으로 생산 지연.',
      data_availability:
        'ERP 구매/재고 기록 3년 치, 고객사별 주문 이력은 있으나 외부 수요 지표(시장/환율)는 수집 안 됨.',
      ai_necessity: 3,
    },
    {
      id: 'sample-t5',
      job: '영업',
      task_name: '견적 자동화',
      as_is:
        '영업팀 3인이 도면·사양서를 보고 과거 유사 견적을 참조해 엑셀로 수작업 산출. 1건당 평균 3~4시간 소요.',
      problems:
        '견적 응답 지연(평균 2영업일)으로 수주 경쟁력 저하. 담당자별 단가 기준 편차로 마진율 ±4%p 변동.',
      data_availability:
        '과거 5년 견적 이력 엑셀(약 8,000건), 도면 파일(CAD) 별도 폴더 보관. 텍스트 구조화 필요.',
      ai_necessity: 3,
    },
  ],
  analysis_notes: {
    text:
      '인터뷰 과정에서 경영진·현장 모두 AI 도입 의지가 강한 것을 확인했다. 단, IT 기획 담당자 1인이 전담하고 있어 외부 전문가(데이터 엔지니어) 지원이 필요하다는 공감대가 형성됐다. 차기 인터뷰(2차) 에서 ERP/MES 연계 구조 도식과 최근 12개월 불량 데이터 샘플을 공유하기로 함. HRD이음 진단 결과와 현장 관찰을 비교한 결과, 기초형 보다 실제 역량은 다소 낮은 편이라 기초 통계·데이터 리터러시 교육 비중을 확대할 필요가 있음.',
    attachment_files: [],
  },
  training_targets: [
    {
      id: 'sample-tt1',
      task_name: '완제품 외관 검사 AI 화',
      selection_reason:
        '불량률과 직결되고 이미 6개월 치 불량 이미지 데이터가 축적되어 있어 PoC 조기 검증 가능. 경영진이 1억 예산을 확정한 최우선 과제.',
      as_is:
        '검사자 육안 + 수기 체크시트. 판정 편차로 불량률 2.4%, 재검사 비용 발생.',
      to_be:
        'Vision AI(OpenAI GPT-4V / 자체 YOLOv8 중 비교) 로 스크래치·치수 이상을 1차 선별하고 검사자는 의심 건만 재확인. 불량률 1.0% 이하, 재검사 시간 60% 단축.',
    },
    {
      id: 'sample-tt2',
      task_name: '설비 이상 예지',
      selection_reason:
        'PLC 로그 2년 치가 축적되어 시계열 이상 탐지 모델을 바로 적용 가능. 정지시간 감축 효과가 재무적으로 가시화됨.',
      as_is:
        '임계치 알람만 사용, 베어링 마모·스핀들 이상 사전 감지 불가. 월 1~2회 6시간 라인 정지.',
      to_be:
        'LSTM·IsolationForest 기반 이상 탐지 모델로 24시간 전 경보, 정비 스케줄링에 반영. 계획 외 정지시간 30% 감소.',
    },
    {
      id: 'sample-tt3',
      task_name: '주문-생산 스케줄링 최적화',
      selection_reason:
        '데이터는 풍부하나 현재 수작업 수준이라 생산성 개선 여지가 크며, 훈련생(생산계획 담당자) 이 AI 도구 활용법을 습득하면 즉시 업무 적용 가능.',
      as_is:
        '매일 오전 엑셀로 수기 배정, 긴급 오더 시 전면 재편성에 2시간 소요.',
      to_be:
        '제약 최적화(OR-Tools) + ChatGPT 보조 프롬프트 조합으로 15분 내 스케줄 재산출. CNC 일평균 유휴시간 18% → 10% 축소.',
    },
  ],
  competency_models: [
    {
      id: 'sample-c1',
      competency_name: 'AI 비전 기반 품질 검사 역량',
      competency_definition:
        '완제품 외관 이미지 데이터를 수집·전처리하고, Vision AI 모델(사전학습 / 자체학습) 을 비교·평가하여 생산라인에 배포·운영할 수 있는 능력.',
      knowledge:
        '이미지 데이터 구조, 라벨링 원칙, 컴퓨터 비전 기본 개념(CNN/Transformer), 평가지표(정밀도·재현율·F1), 고객사 품질 기준(PPAP).',
      skill:
        'Python/Jupyter 환경에서 이미지 전처리(OpenCV), Hugging Face / Roboflow 모델 fine-tuning, ChatGPT Vision API 호출, 결과 리포트 작성.',
      attitude:
        '현장 검사자의 경험을 존중하고 AI 판정을 보조로 활용, 오탐/미탐을 정기적으로 리뷰하며 모델을 지속 개선하려는 자세.',
    },
    {
      id: 'sample-c2',
      competency_name: '설비 예지보전 데이터 분석 역량',
      competency_definition:
        '센서·PLC 시계열 데이터를 수집·정제·시각화하고, 이상 탐지 모델을 적용해 고장 징후를 사전 감지할 수 있는 능력.',
      knowledge:
        '시계열 데이터 특성(정상성·주기성), 이상 탐지 알고리즘(LSTM/IsolationForest/Autoencoder), 설비 기계 원리(CNC 주축·베어링).',
      skill:
        'Pandas 로 로그 전처리, Plotly 시각화, scikit-learn 이상 탐지 모델 학습·평가, Grafana 대시보드 연동.',
      attitude:
        '정비 이력을 체계적으로 기록하고 데이터 품질을 보장하려는 책임감, 예측 결과를 정비팀과 적극 공유·협업하는 태도.',
    },
    {
      id: 'sample-c3',
      competency_name: '생산 스케줄링 AI 활용 역량',
      competency_definition:
        '주문·설비·원자재 데이터를 입력으로 생산 스케줄을 자동 산출하고, AI 도구(ChatGPT/Notebook) 로 시나리오를 검증·개선할 수 있는 능력.',
      knowledge:
        '제약 만족 문제(CSP) 개념, OR-Tools 기본 사용법, ERP/MES 데이터 구조, 우선순위·납기·설비 가동률 간 트레이드오프.',
      skill:
        '엑셀·CSV 데이터 Python 연동, OR-Tools 로 간이 스케줄러 구현, ChatGPT 로 제약·목적함수 프롬프트 작성, 결과 엑셀 export.',
      attitude:
        'AI 결과를 맹신하지 않고 현장 변수(고객사 긴급 요청 등) 를 반영하며, 생산·영업·구매와 협업해 스케줄을 지속 개선하려는 자세.',
    },
  ],
  ncs_usage: {
    uses_ncs: true,
    ncs_usage_method:
      'NCS 20. 정보통신 > 20. 정보기술 > 02. 정보기술전략·계획 능력단위 중 "AI 데이터 분석·활용" 요소를 기본 뼈대로 삼고, 산업 특성상 필요한 현장 과업(완제품 외관 검사·설비 예지보전·생산 스케줄링) 을 추가해 역량 모델을 조정했다. NCS 가 일반론 중심이라 자동차 부품 제조 현장에 바로 적용 가능한 수준이 아니므로, KSA(지식·기술·태도) 항목을 자사 공정·데이터 기준으로 재작성해 훈련 내용에 반영한다.',
  },
  notes:
    '차기 인터뷰(2차, 2026-05-04 예정) 에서 ERP/MES 연계 구조 도식과 최근 12개월 불량·PLC 데이터 샘플(익명화) 을 사전 공유받기로 함. 로드맵 초안 완성 후 경영진 보고 일정은 2026-05-15 로 예정.',
};

export type RoadmapInterviewSample = typeof ROADMAP_INTERVIEW_SAMPLE;
