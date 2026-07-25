import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineSelectField } from '../InlineSelectField';

const OPTIONS = [
  { value: 'BEGINNER', label: '초급' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '고급' },
] as const;

describe('InlineSelectField', () => {
  it('view 모드에서 선택된 옵션의 label 을 표시한다', () => {
    render(<InlineSelectField value="INTERMEDIATE" options={[...OPTIONS]} onSave={vi.fn()} />);
    expect(screen.getByText('중급')).toBeInTheDocument();
  });

  it('클릭하면 edit 모드로 전환되고 select 가 노출된다', async () => {
    const user = userEvent.setup();
    render(<InlineSelectField value="BEGINNER" options={[...OPTIONS]} onSave={vi.fn()} />);
    await user.click(screen.getByText('초급'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('옵션 변경 후 저장하면 onSave 호출 + view 모드 복귀', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineSelectField value="BEGINNER" options={[...OPTIONS]} onSave={onSave} />);
    await user.click(screen.getByText('초급'));
    await user.selectOptions(screen.getByRole('combobox'), 'ADVANCED');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledWith('ADVANCED');
    await waitFor(() => {
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  it('readOnly 면 클릭해도 edit 모드로 가지 않는다', async () => {
    const user = userEvent.setup();
    render(<InlineSelectField value="BEGINNER" options={[...OPTIONS]} onSave={vi.fn()} readOnly />);
    await user.click(screen.getByText('초급'));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('저장 실패 시 원본 값으로 롤백 + error 표시', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    render(<InlineSelectField value="BEGINNER" options={[...OPTIONS]} onSave={onSave} />);
    await user.click(screen.getByText('초급'));
    await user.selectOptions(screen.getByRole('combobox'), 'ADVANCED');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(screen.getByText('저장 실패')).toBeInTheDocument();
      // 롤백 — select value 가 원본으로 복귀
      expect(screen.getByRole('combobox')).toHaveValue('BEGINNER');
    });
  });

  it('편집 진입 후 [취소] 버튼 클릭 시 view 모드 복귀', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<InlineSelectField value="BEGINNER" options={[...OPTIONS]} onSave={onSave} />);
    await user.click(screen.getByText('초급'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('동일 값 선택 후 저장 시 onSave 호출 안 함 (no-op)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<InlineSelectField value="BEGINNER" options={[...OPTIONS]} onSave={onSave} />);
    await user.click(screen.getByText('초급'));
    // 옵션 변경 없이 저장 클릭
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).not.toHaveBeenCalled();
    // view 모드로 복귀
    await waitFor(() => {
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  it('options 에 없는 value 가 들어오면 value 자체를 라벨로 표시', () => {
    // value 가 매핑되지 않으면 String(value) 로 fallback 표시 (TS 측에서는 generic V 로 통과)
    render(
      <InlineSelectField value={'UNKNOWN' as 'BEGINNER'} options={[...OPTIONS]} onSave={vi.fn()} />
    );
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  describe('ariaLabel (접근성 이름)', () => {
    it('ariaLabel 을 주면 view 모드 버튼의 접근성 이름이 된다', () => {
      render(
        <InlineSelectField
          value="BEGINNER"
          options={[...OPTIONS]}
          onSave={vi.fn()}
          ariaLabel="기업 AI 역량 수준 편집"
        />
      );
      expect(screen.getByRole('button', { name: '기업 AI 역량 수준 편집' })).toBeInTheDocument();
    });

    it('readOnly 면 button role 이 없어 ariaLabel 도 노출되지 않는다', () => {
      render(
        <InlineSelectField
          value="BEGINNER"
          options={[...OPTIONS]}
          onSave={vi.fn()}
          readOnly
          ariaLabel="기업 AI 역량 수준 편집"
        />
      );
      expect(screen.queryByRole('button', { name: '기업 AI 역량 수준 편집' })).toBeNull();
    });
  });
});
