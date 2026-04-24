'use client';

/**
 * 하위 호환 alias — 실 구현은 PBLResultClient 로 이관(Task 2.11-a).
 * page.tsx rewiring 은 Task 2.11-b 이 담당하며, 그 전까지 기존 import 를 보존한다.
 */

import {
  PBLResultClient,
  type PBLResultClientProps,
} from './PBLResultClient';

export type ConsultantPBLClientV2Props = Omit<PBLResultClientProps, 'role'> & {
  onEdit: NonNullable<PBLResultClientProps['onEdit']>;
  onGenerate: NonNullable<PBLResultClientProps['onGenerate']>;
};

export function ConsultantPBLClientV2(props: ConsultantPBLClientV2Props) {
  return <PBLResultClient role="CONSULTANT" {...props} />;
}

export { PBLResultClient };
