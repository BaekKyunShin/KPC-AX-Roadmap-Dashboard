'use client';

/**
 * 하위 호환 alias — 실 구현은 RoadmapResultClient 로 이관(Task 2.11-a).
 * page.tsx rewiring 은 Task 2.11-b 이 담당하며, 그 전까지 기존 import 를 보존한다.
 */

import {
  RoadmapResultClient,
  type RoadmapResultClientProps,
} from './RoadmapResultClient';

export type ConsultantRoadmapClientV2Props = Omit<RoadmapResultClientProps, 'role'> & {
  onEdit: NonNullable<RoadmapResultClientProps['onEdit']>;
  onGenerate: NonNullable<RoadmapResultClientProps['onGenerate']>;
};

export function ConsultantRoadmapClientV2(props: ConsultantRoadmapClientV2Props) {
  return <RoadmapResultClient role="CONSULTANT" {...props} />;
}

export { RoadmapResultClient };
