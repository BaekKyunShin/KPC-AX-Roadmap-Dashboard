'use strict';

import { z } from 'zod';

/** 갤러리 조회 필터 스키마 */
export const galleryFiltersSchema = z.object({
  search: z.string().max(200).optional().default(''),
  industry: z.string().max(50).optional().default(''),
  sort: z.enum(['latest', 'popular']).optional().default('latest'),
  // 트랙 필터 (ALL/ROADMAP/PBL) — 기본 ALL
  track: z.enum(['ALL', 'ROADMAP', 'PBL']).optional().default('ALL'),
  // 본인 산출물 필터 (all/mine) — 기본 all. mine 일 때 created_by = currentUser.id 만 노출
  scope: z.enum(['all', 'mine']).optional().default('all'),
  // 관리자 전용 필터
  status: z.enum(['DRAFT', 'FINAL', 'ARCHIVED']).optional(),
  isShared: z.enum(['true', 'false']).optional(),
  consultantId: z.string().uuid().optional(),
  // 페이지네이션
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

/** 좋아요 토글 스키마 */
export const toggleLikeSchema = z.object({
  roadmapVersionId: z.string().uuid('유효하지 않은 로드맵 ID입니다.'),
});

/** 공유 토글 스키마 */
export const toggleShareSchema = z.object({
  roadmapVersionId: z.string().uuid('유효하지 않은 로드맵 ID입니다.'),
});

/** PBL 좋아요 토글 스키마 */
export const togglePBLLikeSchema = z.object({
  pblReportId: z.string().uuid('유효하지 않은 PBL 보고서 ID입니다.'),
});

/** PBL 공유 토글 스키마 */
export const togglePBLShareSchema = z.object({
  pblReportId: z.string().uuid('유효하지 않은 PBL 보고서 ID입니다.'),
});

/** 로드맵 복제 스키마 */
export const copyRoadmapSchema = z.object({
  sourceRoadmapVersionId: z.string().uuid('유효하지 않은 원본 로드맵 ID입니다.'),
  targetProjectId: z.string().uuid('유효하지 않은 프로젝트 ID입니다.'),
});
