import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VersionSelector } from './VersionSelector';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// Radix UI는 jsdom에서 PointerEvent가 필요
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;
  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.button = props.button ?? 0;
    this.ctrlKey = props.ctrlKey ?? false;
    this.pointerType = props.pointerType ?? 'mouse';
  }
}
window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

function openDropdown(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
}

function makeVer(v: number, status: 'DRAFT' | 'FINAL' | 'ARCHIVED' = 'DRAFT'): RoadmapVersionUI {
  return {
    id: `v${v}`,
    version_number: v,
    status,
    diagnosis_summary: '',
    setup_necessity: '',
    outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
    competencies: [],
    ncs_used: false,
    ncs_methodology: '',
    ncs_derivation_method: '',
    training_structure: [],
    training_structure_method: '',
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [],
    revision_prompt: null,
    is_shared: false,
    created_at: '2026-04-16T00:00:00Z',
    finalized_at: null,
  };
}

describe('VersionSelector', () => {
  it('선택된 버전이 트리거에 표시', () => {
    render(
      <VersionSelector
        versions={[makeVer(2, 'FINAL'), makeVer(1, 'DRAFT')]}
        selectedId="v2"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent(/버전 2/);
  });

  it('드롭다운 열면 전체 버전 목록 노출', async () => {
    render(
      <VersionSelector
        versions={[makeVer(2, 'FINAL'), makeVer(1, 'DRAFT')]}
        selectedId="v2"
        onSelect={vi.fn()}
      />,
    );
    openDropdown(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    expect(within(list).getByText(/버전 2/)).toBeInTheDocument();
    expect(within(list).getByText(/버전 1/)).toBeInTheDocument();
  });

  it('항목 클릭 시 onSelect 호출', async () => {
    const onSelect = vi.fn();
    render(
      <VersionSelector
        versions={[makeVer(2, 'FINAL'), makeVer(1, 'DRAFT')]}
        selectedId="v2"
        onSelect={onSelect}
      />,
    );
    openDropdown(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    await waitFor(() => {
      fireEvent.click(within(list).getByText(/버전 1/));
    });
    expect(onSelect).toHaveBeenCalledWith('v1');
  });

  it('versions가 비어있으면 비활성 상태', () => {
    render(<VersionSelector versions={[]} selectedId={undefined} onSelect={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
