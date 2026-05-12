/**
 * ops/projects/new/loading.tsx 회귀 가드.
 *
 * 실제 page.tsx 는 (1) 프로젝트 트랙 라디오 그룹(ROADMAP/PBL) 과
 * (2) "신청서 자동표출 정보" fieldset(5필드)을 포함하나, 이전 스켈레톤은 둘 다 누락하여
 * loading → content 전환 시 100px 이상의 시각적 점프가 발생했음.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NewProjectLoading from '../loading';

describe('ops/projects/new/loading.tsx', () => {
  it('프로젝트 트랙 라디오 그룹이 1개 존재한다', () => {
    const { container } = render(<NewProjectLoading />);
    expect(container.querySelectorAll('[role="radiogroup"]').length).toBe(1);
  });

  it('트랙 라디오 옵션 자리가 2개 존재한다 (ROADMAP/PBL)', () => {
    const { container } = render(<NewProjectLoading />);
    const radiogroup = container.querySelector('[role="radiogroup"]')!;
    expect(radiogroup.querySelectorAll('[role="radio"]').length).toBe(2);
  });

  it('신청서 자동표출 fieldset 이 존재하고 5개 input 자리를 가진다', () => {
    const { container } = render(<NewProjectLoading />);
    const fieldset = container.querySelector(
      'fieldset[data-testid="skeleton-autofill-fieldset"]',
    );
    expect(fieldset).toBeInTheDocument();
    expect(fieldset!.querySelectorAll('.h-10').length).toBeGreaterThanOrEqual(5);
  });
});
