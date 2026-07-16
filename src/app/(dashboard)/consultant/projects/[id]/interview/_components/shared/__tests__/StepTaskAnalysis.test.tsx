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

// uploadInterviewAttachment Server Action mock
const uploadInterviewAttachment = vi.fn();
vi.mock('../../../actions', () => ({
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
}));

import { StepTaskAnalysis, type StepTaskAnalysisValue } from '../StepTaskAnalysis';
import type { RoadmapTaskAnalysisItem } from '@/lib/schemas/interview-roadmap';

// v2: 과업 분석 항목은 4필드 {domain, task, asIs, improvement}
function emptyItem(over: Partial<RoadmapTaskAnalysisItem> = {}): RoadmapTaskAnalysisItem {
  return {
    domain: '',
    task: '',
    asIs: '',
    improvement: '',
    ...over,
  };
}

function makeValue(over: Partial<StepTaskAnalysisValue> = {}): StepTaskAnalysisValue {
  return {
    taskAnalysis: [],
    taskAnalysisAttachment: null,
    ...over,
  };
}

describe('StepTaskAnalysis', () => {
  beforeEach(() => {
    uploadInterviewAttachment.mockReset();
  });

  it('섹션 머리글(Ⅱ-3 · [인터뷰 입력])을 표시한다', () => {
    render(<StepTaskAnalysis projectId="p1" value={makeValue()} onChange={() => {}} />);
    expect(screen.getByText('Ⅱ-3')).toBeInTheDocument();
    expect(screen.getByText('과업·워크플로우 분석')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
  });

  it('v2 표는 4열(직무·과업·현행 방식·개선점 및 AI 적용 가능성) 머리글을 표시한다', () => {
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({ taskAnalysis: [emptyItem()] })}
        onChange={() => {}}
      />
    );
    const table = screen.getByRole('table');
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
      th.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(headers[0]).toBe('직무');
    expect(headers[1]).toBe('과업(Task)');
    expect(headers[2]).toContain('현행 방식');
    expect(headers[3]).toContain('개선점 및 AI 적용 가능성');
  });

  it('v1 잔재 컬럼(문제점·데이터 발생 시점·AI 필요도)은 표시하지 않는다', () => {
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({ taskAnalysis: [emptyItem()] })}
        onChange={() => {}}
      />
    );
    expect(screen.queryByLabelText('문제점 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('데이터 발생 시점 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('AI 도입·활용 필요도 1')).not.toBeInTheDocument();
    // 분석내용(taskAnalysisNote) 입력 필드도 제거됨
    expect(screen.queryByLabelText('분석내용')).not.toBeInTheDocument();
  });

  it('taskAnalysis 가 빈 배열이면 기본 5행을 렌더한다', () => {
    render(<StepTaskAnalysis projectId="p1" value={makeValue()} onChange={() => {}} />);
    // 각 행마다 "직무 N" · "개선점 N" aria-label 이 존재
    for (let i = 1; i <= 5; i += 1) {
      expect(screen.getByLabelText(`직무 ${i}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`개선점 ${i}`)).toBeInTheDocument();
    }
  });

  it('value.taskAnalysis 가 있으면 해당 행들만 렌더한다', () => {
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysis: [
            emptyItem({ domain: '품질관리', task: '검사' }),
            emptyItem({ domain: '생산', task: '설비 점검' }),
          ],
        })}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('직무 1')).toHaveValue('품질관리');
    expect(screen.getByLabelText('과업 1')).toHaveValue('검사');
    expect(screen.getByLabelText('직무 2')).toHaveValue('생산');
    expect(screen.queryByLabelText('직무 3')).not.toBeInTheDocument();
  });

  it('"행 추가" 클릭 시 taskAnalysis 가 +1 된 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysis: [emptyItem({ domain: 'A' })],
        })}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('행 추가'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0][0] as StepTaskAnalysisValue;
    expect(call.taskAnalysis).toHaveLength(2);
    expect(call.taskAnalysis[0].domain).toBe('A');
  });

  it('"행 삭제" 클릭 시 해당 행이 제거된 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysis: [
            emptyItem({ domain: 'A' }),
            emptyItem({ domain: 'B' }),
            emptyItem({ domain: 'C' }),
          ],
        })}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('행 삭제 2'));
    // #1 H5·H3 — AlertDialog 노출 검증 후 삭제 확인
    expect(screen.getByText(/선택한 행을 삭제하시겠습니까/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    const call = onChange.mock.calls[0][0] as StepTaskAnalysisValue;
    expect(call.taskAnalysis).toHaveLength(2);
    expect(call.taskAnalysis.map((r) => r.domain)).toEqual(['A', 'C']);
  });

  it('마지막 한 행만 남았을 때 "행 삭제" 버튼은 비활성화된다 (스키마 min(1) 보호)', () => {
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysis: [emptyItem({ domain: '유일' })],
        })}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('행 삭제 1')).toBeDisabled();
  });

  it('직무 입력 시 해당 행만 갱신한 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysis: [emptyItem(), emptyItem()],
        })}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('직무 2'), {
      target: { value: '생산관리' },
    });
    const call = onChange.mock.calls[0][0] as StepTaskAnalysisValue;
    expect(call.taskAnalysis[0].domain).toBe('');
    expect(call.taskAnalysis[1].domain).toBe('생산관리');
  });

  it('개선점 입력 시 해당 행의 improvement 만 갱신한 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysis: [emptyItem({ domain: 'A' }), emptyItem()],
        })}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('개선점 1'), {
      target: { value: '데이터 기반 자동 판정 도입 가능' },
    });
    const call = onChange.mock.calls[0][0] as StepTaskAnalysisValue;
    expect(call.taskAnalysis[0].improvement).toBe('데이터 기반 자동 판정 도입 가능');
    // 다른 필드는 보존
    expect(call.taskAnalysis[0].domain).toBe('A');
    expect(call.taskAnalysis[1].improvement).toBe('');
  });

  it('분석 노트 PDF 업로드 시 uploadInterviewAttachment 호출 후 camelCase 로 onChange 한다', async () => {
    uploadInterviewAttachment.mockResolvedValue({
      success: true,
      data: {
        storage_path: 'p1/note-xxx.pdf',
        file_name: 'note.pdf',
        mime_type: 'application/pdf',
        size: 2048,
        uploaded_at: '2026-04-24T00:00:00.000Z',
        extracted_text: '노트 본문',
      },
    });
    const onChange = vi.fn();
    const { container } = render(
      <StepTaskAnalysis projectId="proj-7" value={makeValue()} onChange={onChange} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'note.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadInterviewAttachment).toHaveBeenCalledTimes(1));
    expect(uploadInterviewAttachment.mock.calls[0][0]).toBe('proj-7');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const call = onChange.mock.calls[0][0] as StepTaskAnalysisValue;
    expect(call.taskAnalysisAttachment).toEqual({
      fileName: 'note.pdf',
      url: 'p1/note-xxx.pdf',
      extractedText: '노트 본문',
    });
  });

  it('첨부가 있으면 파일명을 표시하고, 제거 버튼 클릭 시 onChange(null) 이 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({
          taskAnalysisAttachment: {
            fileName: 'note.pdf',
            url: 'p1/x.pdf',
          },
        })}
        onChange={onChange}
      />
    );
    expect(screen.getByText('note.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('첨부 제거'));
    const call = onChange.mock.calls[0][0] as StepTaskAnalysisValue;
    expect(call.taskAnalysisAttachment).toBeNull();
  });

  it('readOnly 이면 행 추가·삭제 버튼이 비활성화되고 셀 textarea 도 disabled 된다', () => {
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({ taskAnalysis: [emptyItem()] })}
        onChange={() => {}}
        readOnly
      />
    );
    expect(screen.getByLabelText('행 추가')).toBeDisabled();
    expect(screen.getByLabelText('행 삭제 1')).toBeDisabled();
    expect(screen.getByLabelText('직무 1')).toBeDisabled();
    expect(screen.getByLabelText('개선점 1')).toBeDisabled();
  });

  it('Ⅱ-3 표 4개 셀 LargeTextBox 모두 min-h-[225px] 클래스를 가진다 (사용자 보고 #1 — 150px의 1.5배)', () => {
    render(
      <StepTaskAnalysis
        projectId="p1"
        value={makeValue({ taskAnalysis: [emptyItem()] })}
        onChange={() => {}}
      />
    );
    const labels = ['직무 1', '과업 1', '현행 방식 1', '개선점 1'];
    for (const label of labels) {
      const textarea = screen.getByLabelText(label);
      expect(textarea.className).toMatch(/min-h-\[225px\]/);
    }
  });
});
