-- ============================================
-- AX 진단 템플릿
-- ============================================
-- 총점: 100점
-- - AI 성숙도 (30점): 문항 1-6, weight=1.0
-- - 데이터 준비도 (25점): 문항 7-12, weight=0.8333
-- - 인프라 준비도 (20점): 문항 13-18, weight=0.6667
-- - 인력 준비도 (15점): 문항 19-24, weight=0.5
-- - 문제 명확성 (10점): 문항 25-30, weight=0.3333
-- ============================================

-- 개발 환경: 기존 데이터 정리
DELETE FROM self_assessments;
DELETE FROM self_assessment_templates;

-- AX 진단 30문항 템플릿 삽입
INSERT INTO self_assessment_templates (id, version, name, description, questions, is_active)
VALUES (
  uuid_generate_v4(),
  1,
  'AX 진단 템플릿',
  'AI 성숙도, 데이터/인프라/인력 준비도, 문제 명확성을 평가하는 30문항 진단 (100점 만점). 각 항목 5점 척도(1~5점) 평가, 영역별 가중치 적용.',
  '[
    {"id":"q1","order":1,"dimension":"AI 성숙도","question_text":"경영진이 AI를 기업 전략의 핵심 요소로 인식하고 있다.","question_type":"SCALE_5","weight":1.0},
    {"id":"q2","order":2,"dimension":"AI 성숙도","question_text":"AI 전략이 조직의 비즈니스 전략과 정렬되어 있다.","question_type":"SCALE_5","weight":1.0},
    {"id":"q3","order":3,"dimension":"AI 성숙도","question_text":"AI를 적용한 구체적인 프로젝트나 사례를 보유하고 있다.","question_type":"SCALE_5","weight":1.0},
    {"id":"q4","order":4,"dimension":"AI 성숙도","question_text":"AI를 통해 실질적인 성과(비용절감, 생산성향상)를 달성한 사례가 있다.","question_type":"SCALE_5","weight":1.0},
    {"id":"q5","order":5,"dimension":"AI 성숙도","question_text":"AI 추진을 위한 명확한 KPI(성과지표)를 설정하고 있다.","question_type":"SCALE_5","weight":1.0},
    {"id":"q6","order":6,"dimension":"AI 성숙도","question_text":"AI 도입에 필요한 예산이 전략적으로 배분된다.","question_type":"SCALE_5","weight":1.0},
    {"id":"q7","order":7,"dimension":"데이터 준비도","question_text":"AI 개발을 위한 데이터가 충분히 확보되어 있다.","question_type":"SCALE_5","weight":0.8333},
    {"id":"q8","order":8,"dimension":"데이터 준비도","question_text":"데이터가 중앙화되어 관리되며 필요한 사용자가 쉽게 접근할 수 있다.","question_type":"SCALE_5","weight":0.8333},
    {"id":"q9","order":9,"dimension":"데이터 준비도","question_text":"데이터 품질(정확성, 완전성 등)을 관리하는 체계가 있다.","question_type":"SCALE_5","weight":0.8333},
    {"id":"q10","order":10,"dimension":"데이터 준비도","question_text":"비정형 데이터(영상, 음성, 텍스트 등)의 수집 및 처리 역량이 있다.","question_type":"SCALE_5","weight":0.8333},
    {"id":"q11","order":11,"dimension":"데이터 준비도","question_text":"AI 활용을 위한 데이터 보안 및 개인정보 보호 체계가 설계되어 있다.","question_type":"SCALE_5","weight":0.8333},
    {"id":"q12","order":12,"dimension":"데이터 준비도","question_text":"데이터 기반 의사결정을 지원하는 분석 도구 및 대시보드가 마련되어 있다.","question_type":"SCALE_5","weight":0.8333},
    {"id":"q13","order":13,"dimension":"인프라 준비도","question_text":"클라우드 기반의 유연한 데이터 저장 및 처리 환경을 갖추고 있다.","question_type":"SCALE_5","weight":0.6667},
    {"id":"q14","order":14,"dimension":"인프라 준비도","question_text":"AI 모델 학습을 위한 고성능 컴퓨팅 환경이 제공된다.","question_type":"SCALE_5","weight":0.6667},
    {"id":"q15","order":15,"dimension":"인프라 준비도","question_text":"조직 내 주요 시스템(ERP, MES, CRM 등)과 AI 인프라가 원활히 연동된다.","question_type":"SCALE_5","weight":0.6667},
    {"id":"q16","order":16,"dimension":"인프라 준비도","question_text":"API 또는 데이터 파이프라인으로 자동화된 데이터 흐름이 구축되어 있다.","question_type":"SCALE_5","weight":0.6667},
    {"id":"q17","order":17,"dimension":"인프라 준비도","question_text":"실시간 또는 준실시간 데이터 처리가 가능한 인프라가 구축되어 있다.","question_type":"SCALE_5","weight":0.6667},
    {"id":"q18","order":18,"dimension":"인프라 준비도","question_text":"운영 중인 인프라가 확장 가능하고 AI 도입에 유연하게 대응할 수 있다.","question_type":"SCALE_5","weight":0.6667},
    {"id":"q19","order":19,"dimension":"인력 준비도","question_text":"우리 조직에는 AI를 전문적으로 다룰 수 있는 인력이 있다.","question_type":"SCALE_5","weight":0.5},
    {"id":"q20","order":20,"dimension":"인력 준비도","question_text":"구성원들은 AI 도구(예: ChatGPT, Copilot 등)를 실무에 활용한다.","question_type":"SCALE_5","weight":0.5},
    {"id":"q21","order":21,"dimension":"인력 준비도","question_text":"직원들에게 AI 관련 교육이 정기적으로 제공되고 있다.","question_type":"SCALE_5","weight":0.5},
    {"id":"q22","order":22,"dimension":"인력 준비도","question_text":"AI 관련 교육에 대한 예산이 확보되어 있다.","question_type":"SCALE_5","weight":0.5},
    {"id":"q23","order":23,"dimension":"인력 준비도","question_text":"외부 AI 전문가 또는 기관과의 협업을 통해 역량을 강화한다.","question_type":"SCALE_5","weight":0.5},
    {"id":"q24","order":24,"dimension":"인력 준비도","question_text":"조직 구성원은 AI 도입에 따른 변화의 필요성을 명확히 인식하고 있다.","question_type":"SCALE_5","weight":0.5},
    {"id":"q25","order":25,"dimension":"문제 명확성","question_text":"AI로 해결할 과제(문제)가 명확히 정의되어 있다.","question_type":"SCALE_5","weight":0.3333},
    {"id":"q26","order":26,"dimension":"문제 명확성","question_text":"AI 프로젝트의 목표가 명확히 정의되어 있다.","question_type":"SCALE_5","weight":0.3333},
    {"id":"q27","order":27,"dimension":"문제 명확성","question_text":"AI 프로젝트 기획 초기 단계부터 비즈니스 부서와 협업이 이루어진다.","question_type":"SCALE_5","weight":0.3333},
    {"id":"q28","order":28,"dimension":"문제 명확성","question_text":"AI 프로젝트의 기술적 타당성과 비즈니스 효과를 사전에 검토한다.","question_type":"SCALE_5","weight":0.3333},
    {"id":"q29","order":29,"dimension":"문제 명확성","question_text":"AI 프로젝트에 대한 리스크(데이터 부족, 예측 실패 등)를 사전에 분석한다.","question_type":"SCALE_5","weight":0.3333},
    {"id":"q30","order":30,"dimension":"문제 명확성","question_text":"AI 프로젝트마다 성과지표(KPI)가 설정되어 성과를 평가할 수 있다.","question_type":"SCALE_5","weight":0.3333}
  ]'::jsonb,
  true
);
