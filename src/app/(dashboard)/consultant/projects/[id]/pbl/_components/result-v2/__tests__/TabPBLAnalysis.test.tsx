import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { TabPBLAnalysis } from '../TabPBLAnalysis';
import type { ResultPBLInterviewSnapshot } from '../types';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';

const linkedRoadmap: Partial<RoadmapInterviewStrict> = {
  establishmentNecessity: '불량률 개선을 위한 AI 도입 필요',
  performanceActivities: [
    {
      round: 1,
      date: '2026.04.10',
      timeRange: '10:00~12:00',
      content: '경영진 인터뷰',
      method: 'ONSITE',
      pmName: '김PM',
      expertName: '박차장',
    },
  ],
  aiLevel: 'INTERMEDIATE',
  selectedTask: '외관 품질 검사 자동화',
  companyRequirements: {
    status: '제조 중견기업',
    problem: '검사 편차 큼',
    will: '경영진 강한 의지',
    outcomes: '불량률 15% 감소 목표',
    remarks: { status: '업력 20년' },
  },
  taskAnalysis: [
    {
      domain: '품질관리',
      task: '외관 검사',
      asIs: '검사자 육안',
      improvement: 'AI 비전 검사',
    },
  ],
  targetTask: {
    name: '외관 검사 AI 보조',
    reason: '검사 누락 방지',
    expectedAsIs: '육안 100%',
    expectedToBe: 'AI 1차 선별 + 육안 확인',
  },
};

const interview: Partial<ResultPBLInterviewSnapshot> = {
  analysis: {
    companyIssues: '제조 공정 효율화 필요',
    organization: {
      orgTree: [
        { id: 'n1', name: '경영지원본부', children: [] },
        {
          id: 'n2',
          name: '생산본부',
          children: [{ id: 'n2-1', name: '품질관리팀', children: [] }],
        },
      ],
      mainWork: [{ dept: '품질관리팀', role: '검사', description: '제품 출하 전 샘플 검사' }],
    },
    trainingEnv: {
      properTrainingHours: '회차당 4시간 × 10주',
      internalPlace: '사내 교육장 (PC 20대)',
      externalPlace: '',
      internalInstructors: [
        {
          position: '품질 파트장',
          name: '김품질',
          career: '12년',
          personalTraits: '데이터 친화',
        },
      ],
      externalInstructors: [],
      aiInfrastructure: 'PC 20대 · AI 도구 접근 가능',
      targetCharacteristics: { career: '', level: '' },
      aiInfraDetail: {
        toolCapacity: 'AVAILABLE' as const,
        networkStatus: 'GOOD' as const,
        pcCount: 0,
      },
      trainingNeedsAnalysis: '',
      expectationAsIs: '',
      expectationToBe: '',
      targetTraineeCount: 0,
      internalInstructorUsage: 'NO' as const,
      internalInstructorPrimary: { name: '', position: '' },
      otherEquipment: '',
    },
    hrdReportPdf: {
      fileName: 'hrd_consulting.pdf',
      url: 'https://example.com/hrd_consulting.pdf',
      size: 512000,
    },
    courseNecessity: '기존 과정으로는 AI 역량 확보가 어려움',
  },
};

describe('TabPBLAnalysis (Ⅱ. 훈련 요구 분석)', () => {
  it('4개 하위 섹션 렌더 — Ⅱ-1 / Ⅱ-3-a / Ⅱ-1-가 / Ⅱ-1-다 (정본 번호 정합, Phase E: 조직 섹션 제거)', () => {
    render(<TabPBLAnalysis version={null} interview={interview} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText(/Ⅱ-1\. 기업 경영 이슈/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-3-a\. 기업 훈련환경 분석/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-1-가\. HRD이음 컨설팅 결과 보고서/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-1-다\. AI훈련과정 개발 필요성/)).toBeInTheDocument();
    // 정본 정합: 훈련환경 표 행라벨 (구 AI 인프라 / AI훈련 요구분석)
    expect(screen.getByText('AI활용 가능 인프라')).toBeInTheDocument();
    expect(screen.getByText('AI훈련 요구분석 결과')).toBeInTheDocument();
    // Ⅱ-1-나 조직 섹션은 더 이상 렌더되지 않음 (로드맵과 동일 패턴)
    expect(screen.queryByText(/조직 및 주요 업무/)).toBeNull();
  });

  it('HRD이음 PDF 링크 + iframe 미리보기 렌더', () => {
    const { container } = render(
      <TabPBLAnalysis version={null} interview={interview} readOnly onEdit={vi.fn()} />
    );
    expect(screen.getByText('hrd_consulting.pdf')).toBeInTheDocument();
    // iframe 요소 존재
    const iframes = container.querySelectorAll('iframe');
    expect(iframes.length).toBeGreaterThan(0);
  });

  it('DRAFT 상태에서 companyIssues 편집 → onEdit({ companyIssues }) 호출', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabPBLAnalysis version={null} interview={interview} readOnly={false} onEdit={onEdit} />
    );
    const issueView = screen.getByText(/제조 공정 효율화 필요/);
    const trigger = issueView.closest('[role="button"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      fireEvent.click(trigger as HTMLElement);
    });
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.change(textareas[0], { target: { value: '수정된 이슈' } });
      fireEvent.keyDown(textareas[0], { key: 'Enter', ctrlKey: true });
    });
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith({ companyIssues: '수정된 이슈' }));
  });

  it('제외 라벨 ("결과보고서" / "수행일지") 을 렌더하지 않음', () => {
    const { container } = render(
      <TabPBLAnalysis version={null} interview={interview} readOnly onEdit={vi.fn()} />
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
  });

  it('linkedRoadmap 미연계(undefined) 시 "미연결" 안내 배너 표출 + 기존 PBL 섹션 유지', () => {
    render(<TabPBLAnalysis version={null} interview={interview} readOnly onEdit={vi.fn()} />);
    expect(
      screen.getByText(
        /선행 로드맵 프로젝트가 연결되지 않아 Ⅱ장이 비어 있습니다\. 운영관리자에게 연결을 요청하세요\./
      )
    ).toBeInTheDocument();
    // 기존 PBL 자체 입력 섹션은 여전히 렌더
    expect(screen.getByText(/Ⅱ-1\. 기업 경영 이슈/)).toBeInTheDocument();
  });

  it('linkedRoadmap 연계 시 6개 로드맵 섹션(읽기 전용)을 표출한다', () => {
    render(
      <TabPBLAnalysis
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    // 미연결 배너는 사라짐
    expect(screen.queryByTestId('linked-roadmap-missing-banner')).toBeNull();
    // 6개 섹션 제목
    expect(screen.getByText('수립 배경')).toBeInTheDocument();
    expect(screen.getByText('주요 활동')).toBeInTheDocument();
    expect(screen.getByText('수립 결과')).toBeInTheDocument();
    expect(screen.getByText('기업 요구분석')).toBeInTheDocument();
    expect(screen.getByText('과업분석표')).toBeInTheDocument();
    expect(screen.getByText('훈련대상 과업')).toBeInTheDocument();
    // 대표 값들
    expect(screen.getByText(/불량률 개선을 위한 AI 도입 필요/)).toBeInTheDocument();
    expect(screen.getByText('경영진 인터뷰')).toBeInTheDocument();
    // 수립 결과 — AI 역량 수준 라벨 (INTERMEDIATE → 중급 (AI탐구형))
    expect(screen.getByText(/중급 \(AI탐구형\)/)).toBeInTheDocument();
    expect(screen.getByText(/외관 품질 검사 자동화/)).toBeInTheDocument();
    // 기업 요구분석 값
    expect(screen.getByText(/제조 중견기업/)).toBeInTheDocument();
    // 훈련대상 과업 값
    expect(screen.getByText(/외관 검사 AI 보조/)).toBeInTheDocument();
  });
});
