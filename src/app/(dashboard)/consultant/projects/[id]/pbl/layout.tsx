import type { ReactNode } from 'react';

export default function PBLLayout({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 sm:px-6">{children}</div>;
}
