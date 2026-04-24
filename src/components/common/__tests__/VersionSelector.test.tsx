import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionSelector, type VersionLike } from '../VersionSelector';

const makeVersion = (overrides: Partial<VersionLike> = {}): VersionLike => ({
  id: 'v1',
  version_number: 1,
  status: 'DRAFT',
  created_at: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

describe('VersionSelector', () => {
  it('versions 가 비어있으면 disabled 상태로 렌더한다', () => {
    render(
      <VersionSelector versions={[]} selectedId={undefined} onSelect={() => {}} />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('versions 가 1개 이상이면 활성화된다', () => {
    render(
      <VersionSelector
        versions={[makeVersion()]}
        selectedId={undefined}
        onSelect={() => {}}
      />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).not.toBeDisabled();
  });

  it('placeholder 가 기본값 "버전 선택" 이다', () => {
    render(
      <VersionSelector versions={[]} selectedId={undefined} onSelect={() => {}} />,
    );
    expect(screen.getByText('버전 선택')).toBeInTheDocument();
  });

  it('placeholder props 를 커스터마이즈할 수 있다', () => {
    render(
      <VersionSelector
        versions={[]}
        selectedId={undefined}
        onSelect={() => {}}
        placeholder="다른 placeholder"
      />,
    );
    expect(screen.getByText('다른 placeholder')).toBeInTheDocument();
  });

  it('className props 가 trigger 에 적용된다', () => {
    render(
      <VersionSelector
        versions={[]}
        selectedId={undefined}
        onSelect={() => {}}
        className="custom-class"
      />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.className).toMatch(/custom-class/);
  });

  it('className 미지정 시 기본 min-w-[240px] 가 적용된다', () => {
    render(
      <VersionSelector versions={[]} selectedId={undefined} onSelect={() => {}} />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.className).toMatch(/min-w-\[240px\]/);
  });

  it('T 가 VersionLike 확장 필드를 가져도 타입 체크를 통과한다', () => {
    // 이 테스트는 TypeScript 제네릭 제약을 검증 (컴파일 타임)
    type ExtendedVersion = VersionLike & { extra: string };
    const versions: ExtendedVersion[] = [
      { ...makeVersion(), extra: 'hello' },
    ];
    render(
      <VersionSelector
        versions={versions}
        selectedId={undefined}
        onSelect={() => {}}
      />,
    );
    // 렌더 성공만 확인 (타입 체크가 통과해야 이 테스트 존재 가능)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
