import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// utils mock — toast 함수만 stub
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

// Server Action mocks
const saveRoadmapInterviewV2 = vi.fn();
const submitRoadmapInterviewV2 = vi.fn();
const uploadInterviewAttachment = vi.fn();
vi.mock('../../../actions', () => ({
  saveRoadmapInterviewV2: (...args: unknown[]) => saveRoadmapInterviewV2(...args),
  submitRoadmapInterviewV2: (...args: unknown[]) => submitRoadmapInterviewV2(...args),
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
}));

import {
  RoadmapInterviewClientV2,
  ROADMAP_V2_STEPS,
} from '../RoadmapInterviewClientV2';

describe('RoadmapInterviewClientV2', () => {
  beforeEach(() => {
    saveRoadmapInterviewV2.mockReset();
    submitRoadmapInterviewV2.mockReset();
    uploadInterviewAttachment.mockReset();
  });

  it('PageHeader 와 첫 스텝(Ⅰ-1) 본문을 렌더한다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    expect(
      screen.getByRole('heading', {
        name: /AI훈련로드맵 인터뷰/,
        level: 1,
      }),
    ).toBeInTheDocument();
    // Ⅰ-1 StepNecessity 가 기본 활성화
    expect(
      screen.getByRole('heading', { name: '수립 필요성', level: 2 }),
    ).toBeInTheDocument();
  });

  it('8개 스텝이 모두 정의되어 있고 양식 번호를 노출한다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    // 스테퍼는 데스크톱·모바일 모두 렌더되므로 같은 텍스트가 여러 번 등장할 수 있음
    expect(ROADMAP_V2_STEPS).toHaveLength(8);
    for (const s of ROADMAP_V2_STEPS) {
      expect(screen.getAllByText(s.name).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('"다음" 클릭 시 두 번째 스텝(Ⅰ-2 placeholder) 으로 이동한다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('다음 스텝'));
    // Ⅰ-2 performance 는 아직 Task 2.3-c placeholder
    expect(
      screen.getByText(/Task 2.3-c 에서 구현됩니다/),
    ).toBeInTheDocument();
  });

  it('Ⅱ-2 companyReq 스텝 진입 시 실제 StepCompanyRequirements 가 렌더된다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 요구분석'));
    // StepCompanyRequirements 는 FormSection 헤더에 "Ⅱ-2" 표시
    expect(
      screen.getByRole('heading', { name: '기업 요구분석', level: 2 }),
    ).toBeInTheDocument();
    // placeholder 문구는 사라져야 함
    expect(screen.queryByText(/Task 2.3-c 에서 구현됩니다/)).toBeNull();
    // 4개 행머리글(구분 열)
    expect(screen.getByRole('rowheader', { name: '기업 현황' })).toBeInTheDocument();
  });

  it('Ⅱ-3 taskAnalysis 스텝 진입 시 실제 StepTaskAnalysis 가 렌더된다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('과업·워크플로우 분석'));
    expect(
      screen.getByRole('heading', { name: '과업·워크플로우 분석', level: 2 }),
    ).toBeInTheDocument();
    // 기본 5행 렌더 확인 (빈 taskAnalysis 배열 → defaultRows)
    expect(screen.getByLabelText('직무 5')).toBeInTheDocument();
    // 분석내용 textarea 존재
    expect(screen.getByLabelText('분석내용')).toBeInTheDocument();
  });

  it('Ⅱ-4 targetTask 스텝 진입 시 실제 StepTargetTask 가 렌더된다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('훈련대상 과업'));
    expect(
      screen.getByRole('heading', { name: '훈련대상 과업 선정', level: 2 }),
    ).toBeInTheDocument();
    // 기대 효과 rowSpan=2
    const 기대효과 = screen.getByText('기대 효과');
    expect(기대효과.getAttribute('rowspan')).toBe('2');
  });

  it('Ⅱ-2 에서 textarea 편집 시 저장 Action 호출 시 companyRequirements patch 가 포함된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 요구분석'));
    fireEvent.change(screen.getByLabelText('기업 현황'), {
      target: { value: '반도체 제조' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        companyRequirements: expect.objectContaining({ status: '반도체 제조' }),
      }),
      { autoSave: true },
    );
  });

  it('스테퍼의 스텝(Ⅰ-3 mainResult) 직접 클릭 시 해당 본문이 렌더된다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    // 데스크톱 스테퍼의 3번 버튼은 한글 절 제목 옆에 숫자 3 으로 렌더된다.
    // 가장 안전하게는 스테퍼의 절 제목 텍스트 (수립 주요 결과) 가 보이는 버튼을 클릭한다.
    // 다만 같은 텍스트가 본문에는 (현재 step Ⅰ-1 인 한) 없으므로 getByText 로 1건이다.
    fireEvent.click(screen.getByText('수립 주요 결과'));
    // mainResult 본문 — FormSection 의 [라벨] 으로 식별
    expect(screen.getByText('[인터뷰 입력 → 결과 페이지]')).toBeInTheDocument();
  });

  it('initial 데이터의 establishmentNecessity 가 Ⅰ-1 textarea 에 반영된다', () => {
    render(
      <RoadmapInterviewClientV2
        projectId="p1"
        initial={{ establishmentNecessity: '초기 필요성' }}
      />,
    );
    expect(screen.getByLabelText('수립 필요성')).toHaveValue('초기 필요성');
  });

  it('Ⅰ-1 textarea 에 입력하면 내부 상태가 갱신되고, 저장 클릭 시 Server Action 에 전달된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClientV2 projectId="proj-9" initial={{}} />);

    fireEvent.change(screen.getByLabelText('수립 필요성'), {
      target: { value: '신규 필요성' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));

    await waitFor(() =>
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      'proj-9',
      expect.objectContaining({ establishmentNecessity: '신규 필요성' }),
      { autoSave: true },
    );
    await waitFor(() =>
      expect(screen.getByText('자동 저장됨')).toBeInTheDocument(),
    );
  });

  it('저장 실패 시 saveIndicator 에 "저장 실패" 가 표시된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({
      success: false,
      error: '권한이 없습니다',
    });
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(screen.getByText('저장 실패')).toBeInTheDocument(),
    );
  });

  it('마지막 스텝에서 "최종 제출" 버튼이 노출되고 클릭 시 submit Action 이 호출된다', async () => {
    submitRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    // 8회 다음 클릭으로 마지막 스텝까지 이동
    for (let i = 0; i < 7; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    const submitBtn = screen.getByRole('button', { name: '최종 제출' });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(submitRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(submitRoadmapInterviewV2).toHaveBeenCalledWith('p1', expect.any(Object));
  });

  it('첫 스텝에서 "이전" 버튼은 비활성화된다', () => {
    render(<RoadmapInterviewClientV2 projectId="p1" initial={{}} />);
    expect(screen.getByLabelText('이전 스텝')).toBeDisabled();
  });
});
