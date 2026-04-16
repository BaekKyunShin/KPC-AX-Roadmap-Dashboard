import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableNumericCell } from './TableNumericCell';

function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('TableNumericCell', () => {
  describe('읽기 모드', () => {
    it('값이 0보다 크면 "값+unit"을 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={24}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect(screen.getByText('24H')).toBeInTheDocument();
    });

    it('커스텀 unit을 적용한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={5}
          onChange={() => {}}
          ariaLabel="개수"
          unit="개"
        />,
      );
      expect(screen.getByText('5개')).toBeInTheDocument();
    });

    it('값이 0이면 기본 fallback "-"를 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={0}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('커스텀 emptyFallback을 받아 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={0}
          onChange={() => {}}
          ariaLabel="훈련시간"
          emptyFallback="미정"
        />,
      );
      expect(screen.getByText('미정')).toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('값을 그대로 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={10}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect((screen.getByLabelText('훈련시간') as HTMLTextAreaElement).value).toBe('10');
    });

    it('값이 0이면 빈 문자열로 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={0}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect((screen.getByLabelText('훈련시간') as HTMLTextAreaElement).value).toBe('');
    });

    it('숫자 입력 시 onChange를 Number로 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={0}
          onChange={onChange}
          ariaLabel="훈련시간"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련시간'), { target: { value: '24' } });
      expect(onChange).toHaveBeenCalledWith(24);
    });

    it('숫자가 아닌 문자는 제거 후 onChange를 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={0}
          onChange={onChange}
          ariaLabel="훈련시간"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련시간'), { target: { value: '12abc3' } });
      expect(onChange).toHaveBeenCalledWith(123);
    });

    it('값을 모두 지우면 onChange(0)을 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={24}
          onChange={onChange}
          ariaLabel="훈련시간"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련시간'), { target: { value: '' } });
      expect(onChange).toHaveBeenCalledWith(0);
    });
  });
});
