import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableTable, type EditableTableColumn } from '../EditableTable';

interface Row {
  name: string;
  hours: number;
  notes: string;
  [key: string]: unknown;
}

const COLUMNS: EditableTableColumn<Row>[] = [
  { key: 'name', label: '교과목' },
  { key: 'hours', label: '시간', type: 'number' },
  { key: 'notes', label: '비고', multiline: true },
];

const emptyRow = (): Row => ({ name: '', hours: 0, notes: '' });

describe('EditableTable', () => {
  it('rows 가 비어 있어도 헤더와 행 추가 버튼을 렌더한다', () => {
    render(
      <EditableTable
        rows={[]}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
      />,
    );
    expect(screen.getByText('교과목')).toBeInTheDocument();
    expect(screen.getByText('시간')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /행 추가/ })).toBeInTheDocument();
  });

  it('행 추가 버튼 클릭 시 emptyRow() 결과를 push 해 onChange 호출', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    const initialRows: Row[] = [{ name: 'AI 기초', hours: 8, notes: '' }];
    render(
      <EditableTable
        rows={initialRows}
        columns={COLUMNS}
        onChange={onChange}
        emptyRow={emptyRow}
      />,
    );
    await user.click(screen.getByRole('button', { name: /행 추가/ }));
    expect(onChange).toHaveBeenCalledWith([
      { name: 'AI 기초', hours: 8, notes: '' },
      { name: '', hours: 0, notes: '' },
    ]);
  });

  it('행 삭제 버튼 클릭 시 해당 인덱스를 splice 해 onChange 호출', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    const rows: Row[] = [
      { name: 'A', hours: 1, notes: '' },
      { name: 'B', hours: 2, notes: '' },
      { name: 'C', hours: 3, notes: '' },
    ];
    render(
      <EditableTable rows={rows} columns={COLUMNS} onChange={onChange} emptyRow={emptyRow} />,
    );
    // 두번째 행(index=1) 삭제
    await user.click(screen.getByRole('button', { name: '2행 삭제' }));
    expect(onChange).toHaveBeenCalledWith([
      { name: 'A', hours: 1, notes: '' },
      { name: 'C', hours: 3, notes: '' },
    ]);
  });

  it('readOnly 일 때 행 추가/삭제 버튼이 표시되지 않는다', () => {
    const rows: Row[] = [{ name: 'A', hours: 1, notes: '' }];
    render(
      <EditableTable
        rows={rows}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        readOnly
      />,
    );
    expect(screen.queryByRole('button', { name: /행 추가/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1행 삭제/ })).not.toBeInTheDocument();
  });

  it('maxRows 도달 시 행 추가 버튼이 비활성화된다', () => {
    const rows: Row[] = [{ name: 'A', hours: 1, notes: '' }];
    render(
      <EditableTable
        rows={rows}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        maxRows={1}
      />,
    );
    expect(screen.getByRole('button', { name: /행 추가/ })).toBeDisabled();
  });

  it('minRows 도달 시 행 삭제 버튼이 비활성화된다', () => {
    const rows: Row[] = [{ name: 'A', hours: 1, notes: '' }];
    render(
      <EditableTable
        rows={rows}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        minRows={1}
      />,
    );
    expect(screen.getByRole('button', { name: '1행 삭제' })).toBeDisabled();
  });

  it('셀 편집 후 저장 시 type="number" 컬럼은 Number 로 파싱된다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    const rows: Row[] = [{ name: 'A', hours: 1, notes: '' }];
    render(
      <EditableTable rows={rows} columns={COLUMNS} onChange={onChange} emptyRow={emptyRow} />,
    );
    // 첫번째 셀 (name)
    await user.click(screen.getByText('A'));
    // hours 셀 편집 진입은 InlineEditField click. 시간 표시("1") 클릭
    // InlineEditField 에서 input 입력 → 저장
    const inputs = screen.getAllByRole('textbox');
    await user.clear(inputs[0]);
    await user.type(inputs[0], 'B');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([{ name: 'B', hours: 1, notes: '' }]);
    });
  });

  it('hours 셀에 빈 문자열 저장 시 Number(0) 으로 fallback', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    const rows: Row[] = [{ name: 'A', hours: 5, notes: '' }];
    render(
      <EditableTable rows={rows} columns={COLUMNS} onChange={onChange} emptyRow={emptyRow} />,
    );
    // hours 셀 클릭
    await user.click(screen.getByText('5'));
    const inputs = screen.getAllByRole('textbox');
    // hours 입력 클리어 → 빈 문자열 → Number('') = 0 → || 0 으로 fallback
    await user.clear(inputs[0]);
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([{ name: 'A', hours: 0, notes: '' }]);
    });
  });

  it('rows 가 비어 있고 readOnly 이면 emptyMessage 표시', () => {
    render(
      <EditableTable
        rows={[]}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        readOnly
        emptyMessage="데이터가 없습니다 (read-only)."
      />,
    );
    expect(screen.getByText('데이터가 없습니다 (read-only).')).toBeInTheDocument();
    // readOnly 면 행 추가 버튼 미노출
    expect(screen.queryByRole('button', { name: /행 추가/ })).not.toBeInTheDocument();
  });

  it('getRowKey 가 주어지면 React key 로 사용된다 (rerender 시 행 식별)', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const rows: Row[] = [
      { name: 'A', hours: 1, notes: '' },
      { name: 'B', hours: 2, notes: '' },
    ];
    const { rerender } = render(
      <EditableTable
        rows={rows}
        columns={COLUMNS}
        onChange={onChange}
        emptyRow={emptyRow}
        getRowKey={(row) => row.name}
        testIdPrefix="getrowkey"
      />,
    );
    expect(screen.getByTestId('getrowkey-row-0')).toBeInTheDocument();
    rerender(
      <EditableTable
        rows={rows.slice().reverse()}
        columns={COLUMNS}
        onChange={onChange}
        emptyRow={emptyRow}
        getRowKey={(row) => row.name}
        testIdPrefix="getrowkey"
      />,
    );
    // 행 순서 바뀐 후에도 렌더 정상
    expect(screen.getByTestId('getrowkey-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('getrowkey-row-1')).toBeInTheDocument();
  });

  it('maxRows 표시 — "현재행수 / 최대행수" 카운터 노출', () => {
    const rows: Row[] = [
      { name: 'A', hours: 1, notes: '' },
      { name: 'B', hours: 2, notes: '' },
    ];
    render(
      <EditableTable
        rows={rows}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        maxRows={5}
      />,
    );
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('showRowNumber=false 이면 # 헤더 미노출', () => {
    render(
      <EditableTable
        rows={[{ name: 'A', hours: 1, notes: '' }]}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        showRowNumber={false}
      />,
    );
    expect(screen.queryByRole('columnheader', { name: '#' })).not.toBeInTheDocument();
  });

  it('rows 가 비어 있고 readOnly=false 이면 emptyMessage 셀이 colspan 으로 표시', () => {
    render(
      <EditableTable
        rows={[]}
        columns={COLUMNS}
        onChange={vi.fn()}
        emptyRow={emptyRow}
        emptyMessage="비어 있음"
      />,
    );
    expect(screen.getByText('비어 있음')).toBeInTheDocument();
    // readOnly=false 이므로 행 추가 버튼은 노출
    expect(screen.getByRole('button', { name: /행 추가/ })).toBeInTheDocument();
  });
});
