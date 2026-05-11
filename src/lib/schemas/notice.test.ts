import { describe, it, expect } from 'vitest';
import {
  noticeInputSchema,
  noticeUpdateSchema,
  attachmentInputSchema,
  noticeSearchSchema,
} from './notice';

describe('noticeInputSchema', () => {
  it('제목 1~200자만 허용', () => {
    expect(
      noticeInputSchema.safeParse({ title: '', body: 'x', is_pinned: false })
        .success,
    ).toBe(false);
    expect(
      noticeInputSchema.safeParse({
        title: 'a'.repeat(201),
        body: 'x',
        is_pinned: false,
      }).success,
    ).toBe(false);
    expect(
      noticeInputSchema.safeParse({ title: '유효', body: 'x', is_pinned: false })
        .success,
    ).toBe(true);
  });

  it('본문 50000자 초과 불허', () => {
    expect(
      noticeInputSchema.safeParse({
        title: 't',
        body: 'a'.repeat(50001),
        is_pinned: false,
      }).success,
    ).toBe(false);
  });

  it('is_pinned 기본값 false', () => {
    const result = noticeInputSchema.safeParse({ title: 't', body: 'x' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_pinned).toBe(false);
    }
  });
});

describe('noticeUpdateSchema', () => {
  it('부분 업데이트 허용 (title만 존재해도 통과)', () => {
    expect(noticeUpdateSchema.safeParse({ title: '변경' }).success).toBe(true);
    expect(noticeUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('title 길이 제약 유지', () => {
    expect(
      noticeUpdateSchema.safeParse({ title: 'a'.repeat(201) }).success,
    ).toBe(false);
  });
});

describe('attachmentInputSchema', () => {
  it('정확히 30MB 는 허용', () => {
    const exactly30mb = {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 30 * 1024 * 1024,
      storage_path: 'x',
    };
    expect(attachmentInputSchema.safeParse(exactly30mb).success).toBe(true);
  });

  it('30MB 초과 거부', () => {
    const big = {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 30 * 1024 * 1024 + 1,
      storage_path: 'x',
    };
    expect(attachmentInputSchema.safeParse(big).success).toBe(false);
  });

  it('허용 확장자만 통과', () => {
    const okExts = [
      '.hwpx',
      '.hwp',
      '.pdf',
      '.docx',
      '.xlsx',
      '.txt',
      '.ppt',
      '.pptx',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
    ];
    for (const ext of okExts) {
      const input = {
        file_name: `file${ext}`,
        mime_type: 'x',
        file_size: 100,
        storage_path: 'x',
      };
      expect(attachmentInputSchema.safeParse(input).success).toBe(true);
    }
    expect(
      attachmentInputSchema.safeParse({
        file_name: 'bad.exe',
        mime_type: 'x',
        file_size: 100,
        storage_path: 'x',
      }).success,
    ).toBe(false);
  });

  it('file_size 0 이하 거부', () => {
    expect(
      attachmentInputSchema.safeParse({
        file_name: 'a.pdf',
        mime_type: 'x',
        file_size: 0,
        storage_path: 'x',
      }).success,
    ).toBe(false);
  });

  it('storage_path 빈 문자열 거부', () => {
    expect(
      attachmentInputSchema.safeParse({
        file_name: 'a.pdf',
        mime_type: 'x',
        file_size: 10,
        storage_path: '',
      }).success,
    ).toBe(false);
  });
});

describe('noticeSearchSchema', () => {
  it('기본값 적용', () => {
    const result = noticeSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filter_by).toBe('title');
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(10);
    }
  });

  it('filter_by는 title 또는 author만 허용', () => {
    expect(noticeSearchSchema.safeParse({ filter_by: 'title' }).success).toBe(
      true,
    );
    expect(noticeSearchSchema.safeParse({ filter_by: 'author' }).success).toBe(
      true,
    );
    expect(noticeSearchSchema.safeParse({ filter_by: 'body' }).success).toBe(
      false,
    );
  });

  it('per_page 최대 50 제한', () => {
    expect(noticeSearchSchema.safeParse({ per_page: 51 }).success).toBe(false);
    expect(noticeSearchSchema.safeParse({ per_page: 50 }).success).toBe(true);
  });

  it('문자열 숫자도 coerce', () => {
    const result = noticeSearchSchema.safeParse({ page: '3', per_page: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.per_page).toBe(20);
    }
  });
});
