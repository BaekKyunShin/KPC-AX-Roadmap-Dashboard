import type { RoadmapCell, RoadmapRow, PBLCourse } from '@/lib/services/roadmap';

// =============================================================================
// 데모용 샘플 데이터
// =============================================================================

export const SAMPLE_COMPANY = {
  name: '(주)샘플제조',
  industry: '제조업',
  size: '중견기업 (500명)',
};

// 과정 상세 데이터 (RoadmapCell 타입) - 첫 번째 과정만 (슬라이드용)
export const SAMPLE_COURSE_SINGLE: RoadmapCell = {
  course_name: 'AI 기반 이미지 불량 분류 기초',
  level: 'BEGINNER',
  target_task: '품질-수입검사',
  target_audience: '품질검사 담당자, 생산관리자',
  recommended_hours: 16,
  curriculum: [
    {
      module_name: '1주차: AI 이미지 인식 개요',
      hours: 4,
      details: [
        'AI 이미지 인식의 원리와 제조업 활용 사례 학습',
        '딥러닝 기반 이미지 분류의 기본 개념',
        '품질검사 자동화 성공 사례 분석',
      ],
      practice: '불량 이미지 데이터셋 구축',
    },
    {
      module_name: '2주차: 이미지 전처리 실습',
      hours: 4,
      details: [
        '제조 현장 이미지 전처리 및 증강 기법',
        '노이즈 제거 및 이미지 정규화',
        '데이터 증강 기법 적용',
      ],
      practice: '실제 검사 이미지로 전처리 파이프라인 구축',
    },
    {
      module_name: '3주차: 분류 모델 학습',
      hours: 4,
      details: [
        '사전학습 모델을 활용한 불량 분류 모델 학습',
        'Transfer Learning 개념 이해',
        '모델 성능 평가 지표 학습',
      ],
      practice: '자사 불량 이미지로 분류 모델 Fine-tuning',
    },
    {
      module_name: '4주차: 현장 적용 및 평가',
      hours: 4,
      details: [
        '모델 배포 및 성능 평가',
        '실시간 추론 파이프라인 구축',
        '지속적인 모델 개선 방안',
      ],
      practice: '실시간 검사 데모 구현 및 정확도 측정',
    },
  ],
  tools: [
    { name: 'Google Colab', free_tier_info: '무료 (GPU 제한 있음)' },
    { name: 'Roboflow', free_tier_info: '무료 플랜 (1,000장/월)' },
    { name: 'Teachable Machine', free_tier_info: '완전 무료' },
  ],
  expected_outcome: '불량 이미지 자동 분류 시스템 프로토타입 구축, 검사 시간 50% 단축',
  measurement_method: '분류 정확도 90% 이상 달성, 검사 소요 시간 Before/After 비교',
  prerequisites: ['검사 대상 제품 이미지 최소 500장', '양품/불량품 라벨링 데이터', 'PC (인터넷 연결 필수)'],
};

// 전체 과정 목록
export const SAMPLE_COURSES: RoadmapCell[] = [
  SAMPLE_COURSE_SINGLE,
  {
    course_name: 'OpenCV를 활용한 자동 검사 시스템',
    level: 'INTERMEDIATE',
    target_task: '품질-수입검사',
    target_audience: '품질관리 엔지니어, IT 담당자',
    recommended_hours: 24,
    curriculum: [
      {
        module_name: '1주차: OpenCV 기초',
        hours: 6,
        details: ['OpenCV 설치 및 환경 설정', '이미지 읽기/쓰기 및 기본 조작', '색상 공간 변환 및 필터링'],
        practice: '기본 이미지 처리 파이프라인 구축',
      },
      {
        module_name: '2주차: 객체 탐지 기법',
        hours: 6,
        details: ['에지 검출 및 컨투어 분석', '템플릿 매칭 기법', '불량 영역 검출 알고리즘'],
        practice: '실제 제품에서 불량 영역 자동 검출',
      },
      {
        module_name: '3주차: 실시간 처리',
        hours: 6,
        details: ['카메라 연동 및 실시간 이미지 처리', '성능 최적화 기법', '멀티스레딩 처리'],
        practice: '실시간 검사 시스템 프로토타입',
      },
      {
        module_name: '4주차: 시스템 통합',
        hours: 6,
        details: ['검사 결과 DB 저장', 'UI 연동 및 알람 시스템', '유지보수 및 모니터링'],
        practice: '통합 검사 시스템 완성 및 테스트',
      },
    ],
    tools: [
      { name: 'OpenCV', free_tier_info: '오픈소스 (완전 무료)' },
      { name: 'Python', free_tier_info: '오픈소스 (완전 무료)' },
      { name: 'Streamlit', free_tier_info: '오픈소스 (완전 무료)' },
    ],
    expected_outcome: '실시간 자동 검사 시스템 구축, 검사 정확도 95% 달성',
    measurement_method: '자동 검사율 측정, 오탐지율 모니터링',
    prerequisites: ['Python 기초 지식', '검사용 카메라 장비', '테스트용 제품 샘플'],
  },
  {
    course_name: '딥러닝 기반 품질 예측 모델 구축',
    level: 'ADVANCED',
    target_task: '품질-수입검사',
    target_audience: 'AI/ML 엔지니어, 데이터 사이언티스트',
    recommended_hours: 32,
    curriculum: [
      {
        module_name: '1주차: 딥러닝 프레임워크',
        hours: 8,
        details: ['PyTorch/TensorFlow 고급 활용', 'CNN 아키텍처 심화', 'GPU 활용 최적화'],
        practice: '커스텀 CNN 모델 설계',
      },
      {
        module_name: '2주차: 고급 모델링',
        hours: 8,
        details: ['Object Detection (YOLO, Faster R-CNN)', 'Segmentation 기법', '멀티태스크 학습'],
        practice: '불량 유형별 탐지 모델 구현',
      },
      {
        module_name: '3주차: 모델 최적화',
        hours: 8,
        details: ['모델 경량화 기법', 'Edge 배포 최적화', 'TensorRT/ONNX 변환'],
        practice: '엣지 디바이스 배포용 모델 최적화',
      },
      {
        module_name: '4주차: MLOps 구축',
        hours: 8,
        details: ['모델 버전 관리', '자동 재학습 파이프라인', '모니터링 및 알림 시스템'],
        practice: '전체 MLOps 파이프라인 구축',
      },
    ],
    tools: [
      { name: 'PyTorch', free_tier_info: '오픈소스 (완전 무료)' },
      { name: 'Hugging Face', free_tier_info: '무료 (커뮤니티 모델)' },
      { name: 'MLflow', free_tier_info: '오픈소스 (완전 무료)' },
    ],
    expected_outcome: '엔터프라이즈급 품질 예측 시스템 구축, 불량 예측 정확도 99% 달성',
    measurement_method: '예측 정확도, 시스템 가용성, 추론 속도 측정',
    prerequisites: ['딥러닝 기초 지식', 'Python 중급 이상', 'GPU 서버 접근 권한'],
  },
  {
    course_name: '데이터 시각화로 불량 패턴 분석',
    level: 'BEGINNER',
    target_task: '품질-불량원인분석',
    target_audience: '품질관리 담당자, 생산 관리자',
    recommended_hours: 12,
    curriculum: [
      {
        module_name: '1주차: 데이터 분석 기초',
        hours: 4,
        details: ['Excel/스프레드시트 고급 활용', '기초 통계 개념', '품질 데이터 특성 이해'],
        practice: '불량 데이터 정리 및 기초 분석',
      },
      {
        module_name: '2주차: 시각화 도구 활용',
        hours: 4,
        details: ['Power BI/Tableau 기초', '대시보드 설계 원칙', '인터랙티브 차트 생성'],
        practice: '불량 현황 대시보드 제작',
      },
      {
        module_name: '3주차: 패턴 분석 및 보고',
        hours: 4,
        details: ['시계열 패턴 분석', '상관관계 분석', '보고서 작성 기법'],
        practice: '월간 품질 분석 보고서 작성',
      },
    ],
    tools: [
      { name: 'Power BI Desktop', free_tier_info: '개인용 무료' },
      { name: 'Google Data Studio', free_tier_info: '완전 무료' },
    ],
    expected_outcome: '데이터 기반 품질 분석 역량 확보, 불량 패턴 조기 발견',
    measurement_method: '대시보드 활용률, 불량 조기 발견 건수',
    prerequisites: ['엑셀 기본 활용 능력', '품질 데이터 접근 권한'],
  },
];

// 매트릭스 데이터
export const SAMPLE_MATRIX: RoadmapRow[] = [
  {
    task_id: '1',
    task_name: '품질-수입검사',
    beginner: [{ course_name: 'AI 기반 이미지 불량 분류 기초', recommended_hours: 16 }],
    intermediate: [{ course_name: 'OpenCV를 활용한 자동 검사 시스템', recommended_hours: 24 }],
    advanced: [{ course_name: '딥러닝 기반 품질 예측 모델 구축', recommended_hours: 32 }],
  },
  {
    task_id: '2',
    task_name: '품질-불량원인분석',
    beginner: [{ course_name: '데이터 시각화로 불량 패턴 분석', recommended_hours: 12 }],
    intermediate: [{ course_name: '통계 기반 불량 원인 추적', recommended_hours: 20 }],
    advanced: [{ course_name: 'ML 기반 근본 원인 분석 시스템', recommended_hours: 36 }],
  },
  {
    task_id: '3',
    task_name: '생산-작업지시',
    beginner: [{ course_name: 'AI 작업지시서 자동 생성', recommended_hours: 8 }],
    intermediate: [{ course_name: '일정 최적화 도구 활용', recommended_hours: 16 }],
    advanced: [{ course_name: 'AI 기반 생산 스케줄링', recommended_hours: 28 }],
  },
  {
    task_id: '4',
    task_name: '생산-재고관리',
    beginner: [{ course_name: '수요 예측 기초', recommended_hours: 12 }],
    intermediate: [{ course_name: '안전재고 최적화', recommended_hours: 20 }],
    advanced: [{ course_name: 'AI 기반 자동 발주 시스템', recommended_hours: 32 }],
  },
];

// PBL 과정 데이터
export const SAMPLE_PBL: PBLCourse = {
  selected_course_name: 'AI 기반 이미지 불량 분류 기초',
  selected_course_level: 'BEGINNER',
  selected_course_task: '품질-수입검사',
  selection_rationale: {
    consultant_expertise_fit: '담당 컨설턴트가 이미지 인식 및 딥러닝 분야 전문가로서 실습 지도에 최적화되어 있습니다.',
    pain_point_alignment: '기업의 주요 페인포인트인 "수입검사 시간 과다 소요"와 "육안 검사 오류"를 직접 해결할 수 있는 과정입니다.',
    feasibility_assessment: '초급 과정으로 현장 담당자가 부담 없이 시작할 수 있으며, 무료 도구만으로 구현 가능합니다.',
    summary: '컨설턴트 전문성, 고객사 니즈, 실현 가능성을 종합적으로 고려했을 때 가장 효과적인 첫 단계 과정입니다.',
  },
  course_name: 'AI 기반 이미지 불량 분류 기초 - PBL 프로젝트',
  total_hours: 16,
  target_tasks: ['품질-수입검사', '품질-불량원인분석'],
  target_audience: '품질검사 담당자, 생산관리자',
  curriculum: [
    {
      module_name: '1주차: AI 이미지 인식 개요',
      hours: 4,
      details: [
        'AI 이미지 인식의 원리와 제조업 활용 사례 학습',
        '딥러닝 기반 이미지 분류의 기본 개념',
        '품질검사 자동화 성공 사례 분석',
      ],
      practice: '불량 이미지 데이터셋 구축',
      deliverables: ['불량 유형 정의서', '라벨링 가이드라인', '초기 데이터셋 (100장 이상)'],
      tools: [
        { name: 'Google Colab', free_tier_info: '무료 (GPU 제한 있음)' },
        { name: 'Roboflow', free_tier_info: '무료 플랜 (1,000장/월)' },
      ],
    },
    {
      module_name: '2주차: 이미지 전처리 실습',
      hours: 4,
      details: [
        '제조 현장 이미지 전처리 및 증강 기법',
        '노이즈 제거 및 이미지 정규화',
        '데이터 증강 기법 적용',
      ],
      practice: '실제 검사 이미지로 전처리 파이프라인 구축',
      deliverables: ['전처리 파이프라인 코드', '증강된 학습 데이터셋'],
      tools: [
        { name: 'OpenCV', free_tier_info: '오픈소스 (완전 무료)' },
        { name: 'Pillow', free_tier_info: '오픈소스 (완전 무료)' },
      ],
    },
    {
      module_name: '3주차: 분류 모델 학습',
      hours: 4,
      details: [
        '사전학습 모델을 활용한 불량 분류 모델 학습',
        'Transfer Learning 개념 이해',
        '모델 성능 평가 지표 학습',
      ],
      practice: '자사 불량 이미지로 분류 모델 Fine-tuning',
      deliverables: ['학습된 분류 모델', '성능 평가 보고서'],
      tools: [
        { name: 'Teachable Machine', free_tier_info: '완전 무료' },
        { name: 'Hugging Face', free_tier_info: '무료 (커뮤니티 모델)' },
      ],
    },
    {
      module_name: '4주차: 현장 적용 및 평가',
      hours: 4,
      details: [
        '모델 배포 및 성능 평가',
        '실시간 추론 파이프라인 구축',
        '지속적인 모델 개선 방안',
      ],
      practice: '실시간 검사 데모 구현 및 정확도 측정',
      deliverables: ['웹 기반 검사 데모 애플리케이션', '최종 프로젝트 보고서', '개선 로드맵'],
      tools: [
        { name: 'Streamlit', free_tier_info: '오픈소스 (완전 무료)' },
        { name: 'Gradio', free_tier_info: '오픈소스 (완전 무료)' },
      ],
    },
  ],
  final_deliverables: [
    '불량 이미지 자동 분류 웹 애플리케이션',
    '분류 모델 (재학습 가능한 형태)',
    '사용자 매뉴얼 및 운영 가이드',
    '성과 분석 보고서',
  ],
  expected_outcomes: [
    '불량 이미지 자동 분류 시스템 프로토타입 구축',
    '검사 시간 50% 단축',
    '누락 불량 감소로 고객 클레임 20% 감소',
  ],
  business_impact: '연간 품질 비용 15% 절감 예상. 검사 인력의 고부가가치 업무 전환으로 생산성 향상.',
  measurement_methods: [
    '분류 정확도 (Accuracy): 목표 90% 이상',
    '검사 소요 시간: Before/After 비교',
    '월별 누락 불량 건수 추적',
  ],
  prerequisites: [
    '검사 대상 제품 이미지 최소 500장',
    '양품/불량품 라벨링 데이터',
    'PC (인터넷 연결 필수)',
  ],
};
