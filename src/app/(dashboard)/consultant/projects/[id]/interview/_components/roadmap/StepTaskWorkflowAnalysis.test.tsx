import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepTaskWorkflowAnalysis from './StepTaskWorkflowAnalysis';
import { createEmptyTaskWorkflowItem, type TaskWorkflowItem } from '@/lib/schemas/interview-roadmap';

function makeItems(n = 1): TaskWorkflowItem[] {
  return Array.from({ length: n }, () => createEmptyTaskWorkflowItem());
}

describe('StepTaskWorkflowAnalysis', () => {
  it('초기 렌더 시 제목 + 1개 행 노출', () => {
    render(
      <StepTaskWorkflowAnalysis
        items={makeItems(1)}
        onChange={vi.fn()}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: /과업.*분석/ })).toBeInTheDocument();
    expect(screen.getAllByRole('radiogroup', { name: /AI도입.*활용/ })).toHaveLength(1);
  });

  it('"과업 추가" 버튼 클릭 시 onChange에 새 행이 추가된 배열 전달', async () => {
    const onChange = vi.fn();
    const items = makeItems(1);
    render(
      <StepTaskWorkflowAnalysis
        items={items}
        onChange={onChange}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /과업 추가/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [next] = onChange.mock.calls[0];
    expect(next).toHaveLength(2);
    expect(next[1].job).toBe('');
    expect(next[1].ai_necessity).toBe(3);
  });

  it('행이 2개 이상이면 삭제 버튼으로 해당 행 제거', async () => {
    const onChange = vi.fn();
    const items = makeItems(2);
    render(
      <StepTaskWorkflowAnalysis
        items={items}
        onChange={onChange}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );

    const removeButtons = screen.getAllByRole('button', { name: /행 삭제/ });
    expect(removeButtons).toHaveLength(2);

    await userEvent.click(removeButtons[0]);
    const [next] = onChange.mock.calls[0];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(items[1].id);
  });

  it('행이 1개뿐이면 삭제 버튼 노출하지 않음', () => {
    render(
      <StepTaskWorkflowAnalysis
        items={makeItems(1)}
        onChange={vi.fn()}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /행 삭제/ })).not.toBeInTheDocument();
  });

  it('AI필요도 라디오 그룹: 1~5 값만 존재', () => {
    render(
      <StepTaskWorkflowAnalysis
        items={makeItems(1)}
        onChange={vi.fn()}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: /AI도입.*활용/ });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('AI필요도 라디오 선택 시 ai_necessity 값이 해당 숫자로 변경', async () => {
    const onChange = vi.fn();
    const items = makeItems(1);
    render(
      <StepTaskWorkflowAnalysis
        items={items}
        onChange={onChange}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: /AI도입.*활용/ });
    const radio5 = within(group).getByRole('radio', { name: /^5/ });
    await userEvent.click(radio5);

    const [next] = onChange.mock.calls.at(-1)!;
    expect(next[0].ai_necessity).toBe(5);
  });

  it('텍스트 필드 변경 시 onChange에 부분 업데이트 전달', async () => {
    const onChange = vi.fn();
    const items = makeItems(1);
    render(
      <StepTaskWorkflowAnalysis
        items={items}
        onChange={onChange}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );

    const jobInput = screen.getByLabelText(/직무/);
    await userEvent.type(jobInput, '생');

    const [next] = onChange.mock.calls.at(-1)!;
    expect(next[0].job).toBe('생');
  });

  it('과업(Task) 라벨 사용', () => {
    render(
      <StepTaskWorkflowAnalysis
        items={makeItems(1)}
        onChange={vi.fn()}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/과업\(Task\)/)).toBeInTheDocument();
  });

  it('분석 내용 textarea 렌더 및 onAnalysisNotesChange 호출', async () => {
    const onAnalysisNotesChange = vi.fn();
    render(
      <StepTaskWorkflowAnalysis
        items={makeItems(1)}
        onChange={vi.fn()}
        analysisNotes={{ text: '', attachment_files: [] }}
        onAnalysisNotesChange={onAnalysisNotesChange}
      />,
    );
    await userEvent.type(screen.getByLabelText('분석 내용'), 'A');
    expect(onAnalysisNotesChange).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'A', attachment_files: [] }),
    );
  });

  it('attachment_files 배열에 파일이 있으면 file_name 이 표시된다 (ISSUE-14)', () => {
    // Step A: URL 입력 UI 제거 — 파일 업로드 정식 UI 는 Step C-5 책임.
    // 현재는 attachment_files 표시만 검증.
    render(
      <StepTaskWorkflowAnalysis
        items={makeItems(1)}
        onChange={vi.fn()}
        analysisNotes={{
          text: '',
          attachment_files: [
            {
              storage_path: 'interview-attachments/p1/공정.pdf',
              file_name: '공정.pdf',
            },
          ],
        }}
        onAnalysisNotesChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/공정\.pdf/)).toBeInTheDocument();
  });
});
