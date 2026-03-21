/**
 * 공유 next/link 모킹
 *
 * next/link의 <Link> 컴포넌트를 일반 <a> 태그로 대체합니다.
 * 모든 props를 그대로 전파하므로 className, data-* 등도 정상 동작합니다.
 *
 * 사용 예:
 *   import '@/test/helpers/mock-next-link';
 *
 * 파일 최상단에서 import만 하면 vi.mock이 자동 호이스팅됩니다.
 */

import React from 'react';
import { vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));
