import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OrganizationTree } from '../OrganizationTree';
import type { PBLOrgTreeNode } from '@/lib/schemas/interview-pbl';

function makeNode(name: string, children: PBLOrgTreeNode[] = []): PBLOrgTreeNode {
  return { id: crypto.randomUUID(), name, children };
}

describe('OrganizationTree', () => {
  it('빈 트리일 때 최상위 "루트 노드 추가" 버튼을 렌더한다', () => {
    const onChange = vi.fn();
    render(<OrganizationTree value={[]} onChange={onChange} />);
    expect(
      screen.getByRole('button', { name: '루트 노드 추가' }),
    ).toBeInTheDocument();
  });

  it('노드 이름 input 을 편집하면 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    const value: PBLOrgTreeNode[] = [makeNode('경영지원본부')];
    render(<OrganizationTree value={value} onChange={onChange} />);
    const input = screen.getByDisplayValue('경영지원본부');
    fireEvent.change(input, { target: { value: '전략본부' } });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLOrgTreeNode[];
    expect(next[0].name).toBe('전략본부');
  });

  it('자식 추가 버튼 클릭 시 children 에 빈 노드가 추가된다', () => {
    const onChange = vi.fn();
    const value: PBLOrgTreeNode[] = [makeNode('본부')];
    render(<OrganizationTree value={value} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('본부 자식 노드 추가'));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLOrgTreeNode[];
    expect(next[0].children).toHaveLength(1);
    expect(next[0].children[0].name).toBe('');
  });

  it('노드 삭제 버튼 클릭 시 해당 노드가 제거된다', () => {
    const onChange = vi.fn();
    const value: PBLOrgTreeNode[] = [
      makeNode('본부1'),
      makeNode('본부2'),
    ];
    render(<OrganizationTree value={value} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('본부1 삭제'));
    const next = onChange.mock.calls[0][0] as PBLOrgTreeNode[];
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('본부2');
  });

  it('재귀 자식 노드 이름 편집도 올바르게 반영된다', () => {
    const onChange = vi.fn();
    const child = makeNode('AI팀');
    const value: PBLOrgTreeNode[] = [
      { ...makeNode('본부'), children: [child] },
    ];
    render(<OrganizationTree value={value} onChange={onChange} />);
    const aiInput = screen.getByDisplayValue('AI팀');
    fireEvent.change(aiInput, { target: { value: 'AI개발팀' } });
    const next = onChange.mock.calls[0][0] as PBLOrgTreeNode[];
    expect(next[0].children[0].name).toBe('AI개발팀');
  });

  it('readOnly 이면 input 은 disabled 이며 편집 버튼은 숨겨진다', () => {
    render(
      <OrganizationTree
        value={[makeNode('본부')]}
        onChange={vi.fn()}
        readOnly
      />,
    );
    const input = screen.getByDisplayValue('본부') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(screen.queryByLabelText('본부 삭제')).toBeNull();
    expect(screen.queryByLabelText('본부 자식 노드 추가')).toBeNull();
    expect(
      screen.queryByRole('button', { name: '루트 노드 추가' }),
    ).toBeNull();
  });
});
