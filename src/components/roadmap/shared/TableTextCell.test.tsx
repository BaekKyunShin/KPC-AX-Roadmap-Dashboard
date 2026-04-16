import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableTextCell } from './TableTextCell';

/**
 * table 구조 안에서 렌더되어야 하므로 <table><tbody><tr>로 감싸서 테스트.
 */
function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('TableTextCell', () => {
  describe('읽기 모드 (canEdit=false)', () => {
    it('값이 있으면 그대로 표시한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value="AI 기초 역량"
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      expect(screen.getByText('AI 기초 역량')).toBeInTheDocument();
    });

    it('값이 없으면 기본 fallback "-"을 표시한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('커스텀 emptyFallback을 받아 표시한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
          emptyFallback="(미입력)"
        />,
      );
      expect(screen.getByText('(미입력)')).toBeInTheDocument();
    });

    it('readOnlyClassName을 span에 병합한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value="역량"
          onChange={() => {}}
          ariaLabel="역량명"
          readOnlyClassName="font-medium"
        />,
      );
      expect(screen.getByText('역량')).toHaveClass('font-medium');
    });
  });

  describe('편집 모드 (canEdit=true)', () => {
    it('AutoResizeTextarea를 렌더하고 value를 전달한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={true}
          value="초기값"
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      const textarea = screen.getByLabelText('역량명') as HTMLTextAreaElement;
      expect(textarea.value).toBe('초기값');
    });

    it('placeholder를 전달한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={true}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
          placeholder="역량명을 입력"
        />,
      );
      expect(screen.getByPlaceholderText('역량명을 입력')).toBeInTheDocument();
    });

    it('입력 시 onChange를 값만으로 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableTextCell
          canEdit={true}
          value=""
          onChange={onChange}
          ariaLabel="역량명"
        />,
      );
      const textarea = screen.getByLabelText('역량명');
      fireEvent.change(textarea, { target: { value: '새 값' } });
      expect(onChange).toHaveBeenCalledWith('새 값');
    });

    it('inputClassName을 textarea에 병합한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={true}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
          inputClassName="font-medium"
        />,
      );
      expect(screen.getByLabelText('역량명')).toHaveClass('font-medium');
    });
  });

  describe('공통 td 스타일', () => {
    it('td에 공용 셀 스타일 클래스를 부여한다', () => {
      const { container } = renderInTable(
        <TableTextCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      const td = container.querySelector('td');
      expect(td).toHaveClass('align-top');
      expect(td).toHaveClass('whitespace-pre-wrap');
    });

    it('tdClassName을 td에 병합한다', () => {
      const { container } = renderInTable(
        <TableTextCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="역량명"
          tdClassName="w-[12%]"
        />,
      );
      const td = container.querySelector('td');
      expect(td).toHaveClass('w-[12%]');
    });
  });
});
