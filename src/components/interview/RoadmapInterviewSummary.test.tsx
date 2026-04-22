import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoadmapInterviewSummary } from './RoadmapInterviewSummary';
import type { RoadmapInterview } from '@/lib/schemas/interview-roadmap';

// =============================================================================
// 테스트 fixture — 모든 Batch 1 신규 필드 포함
// =============================================================================

function makeFullInterview(): Partial<RoadmapInterview> {
  return {
    overview: {
      establishment_necessity: '제조 현장의 데이터 누락을 줄이기 위해 AI 도입이 필요합니다.',
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks_summary: '품질검사 자동화 + 일일 리포트 작성',
      roadmap_summary: 'LLM 자동 생성 요약',
      hrd_report_attachment: {
        storage_path: 'projects/p1/hrd.pdf',
        file_name: '2026-HRD이음-진단보고서.pdf',
        size: 45000,
        extracted_text: 'HRD이음 본문 추출 텍스트 미리보기',
      },
    },
    interview_date: '2026-04-22',
    interview_round: 2,
    interview_start_time: '14:00',
    interview_end_time: '16:30',
    interview_method: 'WORKSHOP',
    participants: [
      { id: 'p-1', name: '김컨설턴트', position: 'PM' },
      { id: 'p-2', name: '이담당자', position: '품질팀장' },
    ],
    company_requirements: {
      company_status: '제조업 중견기업, AI 경험 적음',
      main_problems: '검사 누락이 잦음',
      push_willingness: '경영진 의지 매우 높음',
      expected_outcomes: '연간 1억 절감',
    },
    task_workflow_items: [
      {
        id: 't-1',
        job: '품질관리',
        task_name: '제품 외관 검사',
        as_is: '검사원이 육안으로 분류',
        problems: '집중도 저하 시 누락',
        data_availability: '이미지 데이터 5만건 보유',
        ai_necessity: 5,
      },
      {
        id: 't-2',
        job: '운영',
        task_name: '일일 리포트 작성',
        as_is: '엑셀 수기',
        problems: '수작업 부담',
        data_availability: 'ERP 연동 가능',
        ai_necessity: 3,
      },
    ],
    analysis_notes: {
      text: '경영진과의 합의가 빨라 도입 속도 빠를 것',
      attachment_files: [
        {
          storage_path: 'projects/p1/notes/process.pdf',
          file_name: '공정분석.pdf',
          size: 2048,
          extracted_text: '공정 분석 본문 미리보기',
        },
      ],
    },
    training_targets: [
      {
        id: 'g-1',
        task_name: '검사 AI 분류',
        selection_reason: '품질 영향 가장 큼',
        as_is: '육안',
        to_be: 'AI Vision',
      },
    ],
    competency_models: [
      {
        id: 'c-1',
        competency_name: 'AI Vision 활용',
        competency_definition: '검사 모델을 이해하고 운영',
        knowledge: '이미지 분류 원리',
        skill: '모델 호출 + 결과 해석',
        attitude: '데이터 품질을 중시',
      },
    ],
    ncs_usage: {
      uses_ncs: true,
      ncs_usage_method: 'NCS 1502070101 능력단위 응용',
    },
    notes: '추가 메모 — 향후 2차 인터뷰 필요',
    stt_insights: {
      추가_업무: ['주간 회의 정리'],
      추가_페인포인트: ['보고서 양식 통일 필요'],
      숨은_니즈: ['신규 인력 온보딩 자동화'],
      조직_맥락: '품질팀이 가장 보수적',
      AI_태도: '경영진 우호적',
      주요_인용: ['"AI 없이는 경쟁이 안 된다"'],
    },
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('RoadmapInterviewSummary', () => {
  describe('전체 데이터 렌더링', () => {
    it('Ⅰ. 개요 섹션을 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅰ. 개요')).toBeInTheDocument();
      expect(
        screen.getByText('제조 현장의 데이터 누락을 줄이기 위해 AI 도입이 필요합니다.'),
      ).toBeInTheDocument();
      expect(screen.getByText('품질검사 자동화 + 일일 리포트 작성')).toBeInTheDocument();
    });

    it('AI 역량 수준 라벨을 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText(/중급/)).toBeInTheDocument();
      expect(screen.getByText(/AI탐구형/)).toBeInTheDocument();
    });

    it('HRD이음 첨부 파일 메타를 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('HRD이음 진단 보고서 첨부')).toBeInTheDocument();
      expect(screen.getByText('2026-HRD이음-진단보고서.pdf')).toBeInTheDocument();
      expect(screen.getByText('HRD이음 본문 추출 텍스트 미리보기')).toBeInTheDocument();
    });

    it('Ⅰ-2. 주요 활동 — 차수·일자·시간 범위·수행 방법·참석자를 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅰ-2. 주요 활동')).toBeInTheDocument();
      expect(screen.getByText('2차')).toBeInTheDocument();
      expect(screen.getByText('2026-04-22')).toBeInTheDocument();
      // formatTimeRange 적용 확인
      expect(screen.getByText('14:00~16:30')).toBeInTheDocument();
      expect(screen.getByText('워크숍')).toBeInTheDocument();
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이담당자')).toBeInTheDocument();
    });

    it('Ⅱ-2. 기업 요구분석 4필드를 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅱ-2. 기업 요구분석')).toBeInTheDocument();
      expect(screen.getByText('제조업 중견기업, AI 경험 적음')).toBeInTheDocument();
      expect(screen.getByText('검사 누락이 잦음')).toBeInTheDocument();
      expect(screen.getByText('경영진 의지 매우 높음')).toBeInTheDocument();
      expect(screen.getByText('연간 1억 절감')).toBeInTheDocument();
    });

    it('Ⅱ-3. 과업·워크플로우 분석표 + AI 필요도 라벨을 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅱ-3. 과업·워크플로우 분석')).toBeInTheDocument();
      expect(screen.getByText('제품 외관 검사')).toBeInTheDocument();
      expect(screen.getByText('일일 리포트 작성')).toBeInTheDocument();
      // AI_NECESSITY_LABELS 매핑 — 5 → 매우 높음, 3 → 보통
      expect(screen.getByText(/5 · 매우 높음/)).toBeInTheDocument();
      expect(screen.getByText(/3 · 보통/)).toBeInTheDocument();
    });

    it('분석 노트의 텍스트와 첨부 파일을 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('분석 노트')).toBeInTheDocument();
      expect(screen.getByText('경영진과의 합의가 빨라 도입 속도 빠를 것')).toBeInTheDocument();
      expect(screen.getByText('공정분석.pdf')).toBeInTheDocument();
      expect(screen.getByText('공정 분석 본문 미리보기')).toBeInTheDocument();
    });

    it('Ⅱ-4. 훈련대상 과업표를 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅱ-4. 훈련대상 과업')).toBeInTheDocument();
      expect(screen.getByText('검사 AI 분류')).toBeInTheDocument();
      expect(screen.getByText('품질 영향 가장 큼')).toBeInTheDocument();
    });

    it('Ⅲ-1. 역량 모델링 + NCS 활용 박스를 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('Ⅲ-1. 역량 모델링')).toBeInTheDocument();
      expect(screen.getByText('AI Vision 활용')).toBeInTheDocument();
      expect(screen.getByText('검사 모델을 이해하고 운영')).toBeInTheDocument();
      expect(screen.getByText('NCS 활용: 예')).toBeInTheDocument();
      expect(screen.getByText('NCS 1502070101 능력단위 응용')).toBeInTheDocument();
    });

    it('메모 섹션을 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('메모')).toBeInTheDocument();
      expect(screen.getByText('추가 메모 — 향후 2차 인터뷰 필요')).toBeInTheDocument();
    });

    it('STT 인사이트 6개 카테고리를 표시한다', () => {
      render(<RoadmapInterviewSummary interview={makeFullInterview()} />);
      expect(screen.getByText('STT 인사이트')).toBeInTheDocument();
      expect(screen.getByText('추가 업무')).toBeInTheDocument();
      expect(screen.getByText('주간 회의 정리')).toBeInTheDocument();
      expect(screen.getByText('추가 페인포인트')).toBeInTheDocument();
      expect(screen.getByText('보고서 양식 통일 필요')).toBeInTheDocument();
      expect(screen.getByText('숨은 니즈')).toBeInTheDocument();
      expect(screen.getByText('신규 인력 온보딩 자동화')).toBeInTheDocument();
      expect(screen.getByText('조직 맥락')).toBeInTheDocument();
      expect(screen.getByText('품질팀이 가장 보수적')).toBeInTheDocument();
      expect(screen.getByText('AI 태도')).toBeInTheDocument();
      expect(screen.getByText('경영진 우호적')).toBeInTheDocument();
      expect(screen.getByText('주요 인용')).toBeInTheDocument();
      expect(screen.getByText('"AI 없이는 경쟁이 안 된다"')).toBeInTheDocument();
    });
  });

  describe('빈 데이터 처리', () => {
    it('완전히 빈 인터뷰는 어떤 섹션도 표시하지 않는다', () => {
      const { container } = render(<RoadmapInterviewSummary interview={{}} />);
      expect(screen.queryByText('Ⅰ. 개요')).not.toBeInTheDocument();
      expect(screen.queryByText('Ⅱ-2. 기업 요구분석')).not.toBeInTheDocument();
      expect(screen.queryByText('STT 인사이트')).not.toBeInTheDocument();
      expect(container.firstChild).toBeTruthy();
    });

    it('overview 일부 필드만 있을 때 해당 필드만 표시한다', () => {
      render(
        <RoadmapInterviewSummary
          interview={{
            overview: {
              establishment_necessity: '필요성만 입력',
              ai_competency_level: 'BEGINNER',
              selected_tasks_summary: '',
            },
          }}
        />,
      );
      expect(screen.getByText('필요성만 입력')).toBeInTheDocument();
      expect(screen.getByText(/초급/)).toBeInTheDocument();
      // 선정 과업 비어 있음 → "(미입력)" 표시
      expect(screen.getAllByText('(미입력)').length).toBeGreaterThan(0);
    });

    it('participants 가 비어있으면 (미입력) 을 표시한다', () => {
      render(
        <RoadmapInterviewSummary
          interview={{
            interview_date: '2026-04-22',
            participants: [],
          }}
        />,
      );
      expect(screen.getByText('Ⅰ-2. 주요 활동')).toBeInTheDocument();
      expect(screen.getAllByText('(미입력)').length).toBeGreaterThan(0);
    });

    it('start 만 있고 end 가 없으면 start 단독으로 표시한다', () => {
      render(
        <RoadmapInterviewSummary
          interview={{
            interview_start_time: '10:00',
            interview_end_time: '',
          }}
        />,
      );
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('NCS 활용=false 일 때 competency_derivation_method 를 표시한다', () => {
      render(
        <RoadmapInterviewSummary
          interview={{
            ncs_usage: {
              uses_ncs: false,
              competency_derivation_method: 'NCS 없이 사내 모범 사례에서 도출',
            },
          }}
        />,
      );
      expect(screen.getByText('Ⅲ-1. 역량 모델링')).toBeInTheDocument();
      expect(screen.getByText('NCS 활용: 아니오')).toBeInTheDocument();
      expect(screen.getByText('NCS 없이 사내 모범 사례에서 도출')).toBeInTheDocument();
    });

    it('STT 인사이트가 모두 비어있으면 STT 섹션을 숨긴다', () => {
      render(
        <RoadmapInterviewSummary
          interview={{
            stt_insights: {
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

    it('analysis_notes 첨부만 있고 텍스트 비어있으면 (메모 미입력) 라벨로 표시한다', () => {
      render(
        <RoadmapInterviewSummary
          interview={{
            analysis_notes: {
              text: '',
              attachment_files: [
                {
                  storage_path: 'projects/p1/notes/a.pdf',
                  file_name: 'a.pdf',
                },
              ],
            },
          }}
        />,
      );
      expect(screen.getByText('분석 노트')).toBeInTheDocument();
      expect(screen.getByText('(메모 미입력)')).toBeInTheDocument();
      expect(screen.getByText('a.pdf')).toBeInTheDocument();
    });
  });
});
