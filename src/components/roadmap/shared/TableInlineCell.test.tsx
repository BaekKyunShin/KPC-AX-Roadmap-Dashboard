import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableInlineCell } from './TableInlineCell';

function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('TableInlineCell', () => {
  describe('읽기 모드', () => {
    it('값을 그대로 표시한다', () => {
      renderInTable(
        <TableInlineCell
          canEdit={false}
          value="집체"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      expect(screen.getByText('집체')).toBeInTheDocument();
    });

    it('값이 없으면 기본 "-"를 표시한다', () => {
      renderInTable(
        <TableInlineCell
          canEdit={false}
          value=""
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('textarea rows=1을 렌더하고 value를 전달한다', () => {
      renderInTable(
        <TableInlineCell
          canEdit={true}
          value="원격"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      const textarea = screen.getByLabelText('훈련형태') as HTMLTextAreaElement;
      expect(textarea.value).toBe('원격');
      expect(textarea.rows).toBe(1);
    });

    it('줄바꿈을 입력해도 onChange에는 줄바꿈 제거 후 전달한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableInlineCell
          canEdit={true}
          value=""
          onChange={onChange}
          ariaLabel="훈련형태"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련형태'), {
        target: { value: '집\n체' },
      });
      expect(onChange).toHaveBeenCalledWith('집체');
    });
  });

  describe('정렬', () => {
    it('기본 가운데 정렬을 적용한다', () => {
      const { container } = renderInTable(
        <TableInlineCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      expect(container.querySelector('td')).toHaveClass('text-center');
    });

    it('align="right"를 전달하면 오른쪽 정렬을 적용한다', () => {
      const { container } = renderInTable(
        <TableInlineCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="훈련형태"
          align="right"
        />,
      );
      expect(container.querySelector('td')).toHaveClass('text-right');
    });
  });

  describe('공통 td 스타일', () => {
    it('td에 공용 셀 스타일 클래스를 부여한다', () => {
      const { container } = renderInTable(
        <TableInlineCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      const td = container.querySelector('td');
      expect(td).toHaveClass('h-0');
      expect(td).toHaveClass('align-top');
    });
  });
});
