import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VersionStatusBadge } from '../VersionStatusBadge';

describe('VersionStatusBadge', () => {
  it.each([
    ['DRAFT', 1, '초안 v1'],
    ['FINAL', 2, '최종 v2'],
    ['ARCHIVED', 3, '이전 v3'],
  ] as const)(
    '%s 상태는 "%s" 라벨을 렌더한다',
    (status, version, expectedLabel) => {
      const { getByText } = render(
        <VersionStatusBadge status={status} versionNumber={version} />,
      );
      expect(getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it('DRAFT 상태는 slate 색상 토큰을 사용한다', () => {
    const { container } = render(
      <VersionStatusBadge status="DRAFT" versionNumber={1} />,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/slate/);
  });

  it('FINAL 상태는 green 색상 토큰을 사용한다', () => {
    const { container } = render(
      <VersionStatusBadge status="FINAL" versionNumber={1} />,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/green/);
  });

  it('ARCHIVED 상태는 gray 색상 토큰을 사용한다', () => {
    const { container } = render(
      <VersionStatusBadge status="ARCHIVED" versionNumber={1} />,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/gray/);
  });

  it('className props 가 상태 기반 클래스와 병합된다', () => {
    const { container } = render(
      <VersionStatusBadge status="DRAFT" versionNumber={1} className="ml-4" />,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/ml-4/);
    // 상태 클래스도 유지되는지 확인 (병합 보장)
    expect((container.firstChild as HTMLElement).className).toMatch(/slate/);
  });
});
