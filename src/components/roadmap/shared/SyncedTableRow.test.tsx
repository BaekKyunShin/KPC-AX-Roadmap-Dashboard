import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyncedTableRow } from './SyncedTableRow';

function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  );
}

describe('SyncedTableRow', () => {
  it('<tr>를 렌더하고 children을 표시한다', () => {
    renderInTable(
      <SyncedTableRow deps={[]}>
        <td>셀 A</td>
        <td>셀 B</td>
      </SyncedTableRow>,
    );
    expect(screen.getByText('셀 A')).toBeInTheDocument();
    expect(screen.getByText('셀 B')).toBeInTheDocument();
  });

  it('기본 className으로 align-top을 적용한다', () => {
    const { container } = renderInTable(
      <SyncedTableRow deps={[]}>
        <td>x</td>
      </SyncedTableRow>,
    );
    expect(container.querySelector('tr')).toHaveClass('align-top');
  });

  it('추가 className을 병합한다', () => {
    const { container } = renderInTable(
      <SyncedTableRow deps={[]} className="bg-red-50">
        <td>x</td>
      </SyncedTableRow>,
    );
    const tr = container.querySelector('tr');
    expect(tr).toHaveClass('align-top');
    expect(tr).toHaveClass('bg-red-50');
  });

  it('여러 textarea를 포함한 행에서 오류 없이 렌더된다', () => {
    renderInTable(
      <SyncedTableRow deps={['a', 'b', false]}>
        <td>
          <textarea aria-label="필드1" defaultValue="짧은" />
        </td>
        <td>
          <textarea aria-label="필드2" defaultValue={'긴\n내용\n여러\n줄'} />
        </td>
      </SyncedTableRow>,
    );
    expect(screen.getByLabelText('필드1')).toBeInTheDocument();
    expect(screen.getByLabelText('필드2')).toBeInTheDocument();
  });
});
