'use strict';

import { z } from 'zod';

/** 갤러리 조회 필터 스키마 */
export const galleryFiltersSchema = z.object({
  search: z.string().max(200).optional().default(''),
  industry: z.string().max(50).optional().default(''),
  sort: z.enum(['latest', 'popular']).optional().default('latest'),
  // 관리자 전용 필터
  status: z.enum(['DRAFT', 'FINAL', 'ARCHIVED']).optional(),
  isShared: z.enum(['true', 'false']).optional(),
  consultantId: z.string().uuid().optional(),
});

export type GalleryFilters = z.infer<typeof galleryFiltersSchema>;

/** 좋아요 토글 스키마 */
export const toggleLikeSchema = z.object({
  roadmapVersionId: z.string().uuid('유효하지 않은 로드맵 ID입니다.'),
});

/** 공유 토글 스키마 */
export const toggleShareSchema = z.object({
  roadmapVersionId: z.string().uuid('유효하지 않은 로드맵 ID입니다.'),
});

/** 로드맵 복제 스키마 */
export const copyRoadmapSchema = z.object({
  sourceRoadmapVersionId: z.string().uuid('유효하지 않은 원본 로드맵 ID입니다.'),
  targetProjectId: z.string().uuid('유효하지 않은 프로젝트 ID입니다.'),
});

export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>;
export type ToggleShareInput = z.infer<typeof toggleShareSchema>;
export type CopyRoadmapInput = z.infer<typeof copyRoadmapSchema>;
