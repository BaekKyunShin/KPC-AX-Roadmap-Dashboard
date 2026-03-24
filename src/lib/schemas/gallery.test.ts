import { describe, it, expect } from 'vitest';
import {
  galleryFiltersSchema,
  toggleLikeSchema,
  toggleShareSchema,
  copyRoadmapSchema,
} from './gallery';

describe('galleryFiltersSchema', () => {
  it('빈 객체에 기본값 적용', () => {
    const result = galleryFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('');
      expect(result.data.industry).toBe('');
      expect(result.data.sort).toBe('latest');
    }
  });

  it('유효한 필터 값 통과', () => {
    const result = galleryFiltersSchema.safeParse({
      search: '전자',
      industry: '제조업',
      sort: 'popular',
    });
    expect(result.success).toBe(true);
  });

  it('관리자 전용 필터 통과', () => {
    const result = galleryFiltersSchema.safeParse({
      status: 'FINAL',
      isShared: 'true',
      consultantId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 sort 값 거부', () => {
    const result = galleryFiltersSchema.safeParse({ sort: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('잘못된 status 값 거부', () => {
    const result = galleryFiltersSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  describe('page/limit 필드', () => {
    it('기본값: page=1, limit=12', () => {
      const result = galleryFiltersSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(12);
    });

    it('page=2, limit=6 파싱 성공', () => {
      const result = galleryFiltersSchema.parse({ page: '2', limit: '6' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(6);
    });

    it('page=0 거부', () => {
      const result = galleryFiltersSchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('limit=0 거부', () => {
      const result = galleryFiltersSchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });

    it('limit=51 거부 (최대 50)', () => {
      const result = galleryFiltersSchema.safeParse({ limit: '51' });
      expect(result.success).toBe(false);
    });

    it('소수점 page 거부', () => {
      const result = galleryFiltersSchema.safeParse({ page: '1.5' });
      expect(result.success).toBe(false);
    });
  });
});

describe('toggleLikeSchema', () => {
  it('유효한 UUID 통과', () => {
    const result = toggleLikeSchema.safeParse({
      roadmapVersionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 UUID 거부', () => {
    const result = toggleLikeSchema.safeParse({ roadmapVersionId: 'not-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('toggleShareSchema', () => {
  it('유효한 UUID 통과', () => {
    const result = toggleShareSchema.safeParse({
      roadmapVersionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('copyRoadmapSchema', () => {
  it('유효한 두 UUID 통과', () => {
    const result = copyRoadmapSchema.safeParse({
      sourceRoadmapVersionId: '550e8400-e29b-41d4-a716-446655440000',
      targetProjectId: '660e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('누락된 targetProjectId 거부', () => {
    const result = copyRoadmapSchema.safeParse({
      sourceRoadmapVersionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });
});
