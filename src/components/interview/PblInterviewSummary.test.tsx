import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PblInterviewSummary } from './PblInterviewSummary';
import type { PBLInterview } from '@/lib/schemas/interview-pbl';

// =============================================================================
// 테스트 fixture — PBL 9스텝 모든 필드 포함
// =============================================================================

function makeFullInterview(): Partial<PBLInterview> {
  return {
    courseOverview: {
      company_name: 'KPC 제조',
      business_registration_no: '123-45-67890',
      industry_code: 'C28',
      industry_main: '제조업',
      address: '서울시 강남구',
      training_address: '서울시 종로구 본사',
      jurisdiction_office: '서울지청',
      contact: {
        position: 'HRD팀장',
        name: '홍길동',
        phone: '010-1234-5678',
        email: 'hong@kpc.example',
      },
      course_name: 'AI 활용 품질검사 PBL 과정',
      ncs_code: '1502070101',
      training_hours: 40,
      trainee_count: 20,
      training_job: '품질검사원',
      ai_level: 'AI탐구형',
      training_goals: ['기술문제 해결', '불량률 감소'],
    },
    companyStatus: {
      business_issues: '품질 불량률이 매년 증가',
      organization: [
        { id: 'o-1', department_name: '품질관리부', tasks: ['검사', '데이터 입력'] },
        { id: 'o-2', department_name: '운영기획팀', tasks: ['리포트'] },
      ],
    },
    trainingEnvironment: {
      proper_training_hours: 32,
      training_place: { types: ['사내', '사외'], location: '본사 3층 교육장', special_notes: '추가 교육장 1실 필요' },
      internal_instructor: { used: true, name: '김강사', position: '품질팀장' },
      target_count: 20,
      target_characteristics: { career: '평균 5년', level: '대리~과장' },
      ai_infrastructure: {
        ai_tools: '제한적',
        network: '양호',
        pc_count: 18,
        etc_equipment: '디지털 검사기 5대',
      },
      training_needs_analysis: '기초 AI 리터러시부터 강화 필요',
      expectation: { as_is: '육안 검사 위주', to_be: 'AI Vision 보조 검사' },
    },
    hrdNecessity: {
      training_history: [
        { id: 'h-1', seq: 1, program: '직무능력향상', course_name: '엑셀 고급', method: '대면', duration_days: 3 },
      ],
      support_history: [
        { id: 's-1', year: '2025', annual_limit: 50, supported: 30, ratio: '60%' },
      ],
      recommendations: [
        { id: 'r-1', rank: 1, program: '맞춤형 PBL', proposal: '품질검사 자동화 PBL 제안' },
      ],
      course_development_necessity: '품질 데이터 분석 역량 강화 시급',
    },
    performanceActivities: {
      performance_activities: [
        {
          id: 'pa-1',
          round: 1,
          date: '2026-04-01',
          content: '킥오프 + 진단',
          method: 'PM·내부전문가 미팅',
          operation_mode: '대면',
          participants: { pm: '김PM', external_expert: '', internal_expert: '이전문', jurisdiction_manager: '' },
        },
        {
          id: 'pa-2',
          round: 2,
          date: '2026-04-15',
          content: '문제 정의 워크숍',
          method: '워크숍',
          operation_mode: '대면',
          participants: { pm: '김PM', external_expert: '박교수', internal_expert: '', jurisdiction_manager: '' },
        },
      ],
    },
    problemDefinition: {
      problem_definition: {
        background: '검사 인력 한계',
        core_problem: '검사 정확도 편차',
        scope: '외관 검사 라인',
        constraints: '예산 5천만원',
      },
      problem_priorities: [
        { id: 'pp-1', problem_name: '외관 검사 누락', priority: 1, selected: true },
        { id: 'pp-2', problem_name: '데이터 입력 오류', priority: 2, selected: false },
      ],
    },
    targetTasks: {
      target_tasks: [
        { id: 'tt-1', task_name: '외관 검사 자동화', necessity: 5, selected: true },
        { id: 'tt-2', task_name: '리포트 작성', necessity: 3, selected: false },
      ],
      selection_reason: '품질 영향이 가장 큼',
      target_task_details: [
        {
          id: 'ttd-1',
          task_name: '외관 검사 자동화',
          as_is: '육안 검사',
          to_be: 'AI Vision 분류',
          required_knowledge: '분류 모델 원리',
          required_skill: '모델 호출 + 결과 해석',
        },
      ],
    },
    aiLevelDiagnosis: {
      current_ai_level: 'AI탐구형',
      expected_ai_level: 'AI활용형',
      improvement_reason: '경영진 의지와 데이터 자산 확보',
    },
    sttInsights: {
      추가_업무: ['주간 회의 정리'],
      추가_페인포인트: ['양식 통일 부담'],
      숨은_니즈: ['신입 온보딩 자동화'],
      조직_맥락: '품질팀이 가장 보수적',
      AI_태도: '경영진 우호적',
      주요_인용: ['"AI 없이는 경쟁이 안 된다"'],
    },
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('PblInterviewSummary', () => {
  describe('전체 데이터 렌더링', () => {
    it('Ⅰ. 훈련과정 개요 섹션을 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅰ. 훈련과정 개요')).toBeInTheDocument();
      expect(screen.getByText('KPC 제조')).toBeInTheDocument();
      expect(screen.getByText('AI 활용 품질검사 PBL 과정')).toBeInTheDocument();
      expect(screen.getByText('40시간')).toBeInTheDocument();
      // '20명' 은 courseOverview.trainee_count + trainingEnvironment.target_count 양쪽에 노출됨
      expect(screen.getAllByText('20명').length).toBeGreaterThanOrEqual(1);
      // 'AI탐구형' 은 courseOverview.ai_level + aiLevelDiagnosis.current_ai_level 양쪽에 노출됨
      expect(screen.getAllByText('AI탐구형').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('기술문제 해결, 불량률 감소')).toBeInTheDocument();
    });

    it('담당자 정보 4필드를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('HRD팀장')).toBeInTheDocument();
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
      expect(screen.getByText('hong@kpc.example')).toBeInTheDocument();
    });

    it('Ⅱ-1. 기업 현황 + 조직도를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅱ-1. 기업 현황 분석')).toBeInTheDocument();
      expect(screen.getByText('품질 불량률이 매년 증가')).toBeInTheDocument();
      expect(screen.getByText('품질관리부')).toBeInTheDocument();
      expect(screen.getByText('운영기획팀')).toBeInTheDocument();
      expect(screen.getByText('담당 업무: 검사, 데이터 입력')).toBeInTheDocument();
    });

    it('Ⅱ-2. 훈련환경 분석 필드를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅱ-2. 훈련환경 분석')).toBeInTheDocument();
      expect(screen.getByText('32시간')).toBeInTheDocument();
      expect(screen.getByText('사내, 사외')).toBeInTheDocument();
      expect(screen.getByText('본사 3층 교육장')).toBeInTheDocument();
      expect(screen.getByText('추가 교육장 1실 필요')).toBeInTheDocument();
      expect(screen.getByText(/사내강사 활용 — 김강사 \(품질팀장\)/)).toBeInTheDocument();
      expect(screen.getByText('제한적')).toBeInTheDocument();
      expect(screen.getByText('양호')).toBeInTheDocument();
      expect(screen.getByText('18대')).toBeInTheDocument();
      expect(screen.getByText('기초 AI 리터러시부터 강화 필요')).toBeInTheDocument();
      expect(screen.getByText('육안 검사 위주')).toBeInTheDocument();
      expect(screen.getByText('AI Vision 보조 검사')).toBeInTheDocument();
    });

    it('Ⅱ-3. HRD 필요도 + 추천을 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅱ-3. HRD 제안·과정개발 필요성')).toBeInTheDocument();
      expect(screen.getByText('품질 데이터 분석 역량 강화 시급')).toBeInTheDocument();
      expect(screen.getByText(/엑셀 고급/)).toBeInTheDocument();
      expect(screen.getByText(/2025년/)).toBeInTheDocument();
      expect(screen.getByText('1순위 — 맞춤형 PBL')).toBeInTheDocument();
      expect(screen.getByText('품질검사 자동화 PBL 제안')).toBeInTheDocument();
    });

    it('Ⅲ-1. 수행활동 표를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅲ-1. 훈련과제 도출 수행활동')).toBeInTheDocument();
      expect(screen.getByText('1차')).toBeInTheDocument();
      expect(screen.getByText('2차')).toBeInTheDocument();
      expect(screen.getByText('킥오프 + 진단')).toBeInTheDocument();
      expect(screen.getByText('문제 정의 워크숍')).toBeInTheDocument();
    });

    it('Ⅲ-2. 문제 정의 + 우선순위를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅲ-2. 문제 도출·우선순위')).toBeInTheDocument();
      expect(screen.getByText('검사 인력 한계')).toBeInTheDocument();
      expect(screen.getByText('검사 정확도 편차')).toBeInTheDocument();
      expect(screen.getByText('외관 검사 라인')).toBeInTheDocument();
      expect(screen.getByText('예산 5천만원')).toBeInTheDocument();
      expect(screen.getByText('외관 검사 누락')).toBeInTheDocument();
      expect(screen.getByText('데이터 입력 오류')).toBeInTheDocument();
    });

    it('Ⅲ-3. 대상 과업 + 세부 표를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅲ-3. 훈련대상 업무 선정')).toBeInTheDocument();
      expect(screen.getByText('품질 영향이 가장 큼')).toBeInTheDocument();
      // task_name 'AI Vision 분류' 같은 세부 필드
      expect(screen.getByText('AI Vision 분류')).toBeInTheDocument();
      expect(screen.getByText('분류 모델 원리')).toBeInTheDocument();
    });

    it('Ⅲ-4. AI 수준 진단을 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅲ-4. AI 수준 진단')).toBeInTheDocument();
      expect(screen.getByText('경영진 의지와 데이터 자산 확보')).toBeInTheDocument();
      // current 와 expected 둘 다 있어 'AI탐구형' 과 'AI활용형' 이 노출됨
      // courseOverview 와 중복되어 getAllByText 사용
      expect(screen.getAllByText('AI탐구형').length).toBeGreaterThan(0);
      expect(screen.getByText('AI활용형')).toBeInTheDocument();
    });

    it('STT 인사이트 6개 카테고리를 표시한다', () => {
      render(<PblInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('STT 인사이트')).toBeInTheDocument();
      expect(screen.getByText('추가 업무')).toBeInTheDocument();
      expect(screen.getByText('주간 회의 정리')).toBeInTheDocument();
      expect(screen.getByText('추가 페인포인트')).toBeInTheDocument();
      expect(screen.getByText('숨은 니즈')).toBeInTheDocument();
      expect(screen.getByText('조직 맥락')).toBeInTheDocument();
      expect(screen.getByText('AI 태도')).toBeInTheDocument();
      expect(screen.getByText('주요 인용')).toBeInTheDocument();
      expect(screen.getByText('"AI 없이는 경쟁이 안 된다"')).toBeInTheDocument();
    });
  });

  describe('빈 데이터 처리', () => {
    it('완전히 빈 인터뷰는 어떤 섹션도 표시하지 않는다', () => {
      render(<PblInterviewSummary interview={{}} />);
      expect(screen.queryByText('Ⅰ. 훈련과정 개요')).not.toBeInTheDocument();
      expect(screen.queryByText('Ⅱ-1. 기업 현황 분석')).not.toBeInTheDocument();
      expect(screen.queryByText('Ⅲ-4. AI 수준 진단')).not.toBeInTheDocument();
      expect(screen.queryByText('STT 인사이트')).not.toBeInTheDocument();
    });

    it('STT 인사이트가 모두 비어있으면 STT 섹션을 숨긴다', () => {
      render(
        <PblInterviewSummary
          interview={{
            sttInsights: {
              추가_업무: [],
              추가_페인포인트: [],
              숨은_니즈: [],
              조직_맥락: '',
              AI_태도: '',
              주요_인용: [],
            },
          }}
        />,
      );
      expect(screen.queryByText('STT 인사이트')).not.toBeInTheDocument();
    });

    it('사내강사 미활용 시 적절한 라벨을 표시한다', () => {
      render(
        <PblInterviewSummary
          interview={{
            trainingEnvironment: {
              proper_training_hours: 16,
              training_place: { types: [], location: '', special_notes: '' },
              internal_instructor: { used: false, name: '', position: '' },
              target_count: 10,
              target_characteristics: { career: '', level: '' },
              ai_infrastructure: { ai_tools: '가능', network: '양호', pc_count: 0, etc_equipment: '' },
              training_needs_analysis: '요구분석 입력',
              expectation: { as_is: 'as-is', to_be: 'to-be' },
            },
          }}
        />,
      );
      expect(screen.getByText('사내강사 미활용')).toBeInTheDocument();
    });

    it('과정 개요 일부 필드만 입력되면 나머지는 (미입력) 으로 표시한다', () => {
      render(
        <PblInterviewSummary
          interview={{
            courseOverview: {
              company_name: '',
              business_registration_no: '',
              industry_code: '',
              industry_main: '',
              address: '',
              training_address: '',
              jurisdiction_office: '',
              contact: { position: '', name: '', phone: '', email: '' },
              course_name: 'AI 기초 PBL',
              ncs_code: '',
              training_hours: 8,
              trainee_count: 5,
              training_job: '운영',
              ai_level: 'AI기초형',
              training_goals: [],
            },
          }}
        />,
      );
      expect(screen.getByText('AI 기초 PBL')).toBeInTheDocument();
      expect(screen.getByText('AI기초형')).toBeInTheDocument();
      expect(screen.getAllByText('(미입력)').length).toBeGreaterThan(0);
    });
  });
});
