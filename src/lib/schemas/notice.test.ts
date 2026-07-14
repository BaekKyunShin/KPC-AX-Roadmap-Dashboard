import { describe, it, expect } from 'vitest';
import {
  noticeInputSchema,
  noticeUpdateSchema,
  attachmentInputSchema,
  noticeSearchSchema,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_LABEL,
  ATTACHMENT_TOO_LARGE_MESSAGE,
} from './notice';

describe('noticeInputSchema', () => {
  it('제목 1~200자만 허용', () => {
    expect(noticeInputSchema.safeParse({ title: '', body: 'x', is_pinned: false }).success).toBe(
      false
    );
    expect(
      noticeInputSchema.safeParse({
        title: 'a'.repeat(201),
        body: 'x',
        is_pinned: false,
      }).success
    ).toBe(false);
    expect(
      noticeInputSchema.safeParse({ title: '유효', body: 'x', is_pinned: false }).success
    ).toBe(true);
  });

  it('본문 50000자 초과 불허', () => {
    expect(
      noticeInputSchema.safeParse({
        title: 't',
        body: 'a'.repeat(50001),
        is_pinned: false,
      }).success
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
    expect(noticeUpdateSchema.safeParse({ title: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('attachmentInputSchema', () => {
  it('정확히 100MB 는 허용', () => {
    const exactly100mb = {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100 * 1024 * 1024,
      storage_path: 'x',
    };
    expect(attachmentInputSchema.safeParse(exactly100mb).success).toBe(true);
  });

  it('100MB 초과 거부', () => {
    const big = {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100 * 1024 * 1024 + 1,
      storage_path: 'x',
    };
    expect(attachmentInputSchema.safeParse(big).success).toBe(false);
  });

  // 상한 라벨은 MAX_ATTACHMENT_BYTES 에서 파생되어야 한다 (문자열 하드코딩 금지).
  // 상수만 올리고 메시지 문구를 빠뜨리는 drift 를 막는다.
  it('MAX_ATTACHMENT_BYTES 와 라벨·초과 메시지가 한 출처에서 파생된다', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(104857600);
    expect(MAX_ATTACHMENT_LABEL).toBe('100MB');
    expect(ATTACHMENT_TOO_LARGE_MESSAGE).toBe('파일은 100MB 이하여야 합니다.');
  });

  it('크기 초과 시 스키마 에러 메시지가 ATTACHMENT_TOO_LARGE_MESSAGE 와 동일', () => {
    const parsed = attachmentInputSchema.safeParse({
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: MAX_ATTACHMENT_BYTES + 1,
      storage_path: 'x',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0].message).toBe(ATTACHMENT_TOO_LARGE_MESSAGE);
    }
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
      }).success
    ).toBe(false);
  });

  it('file_size 0 이하 거부', () => {
    expect(
      attachmentInputSchema.safeParse({
        file_name: 'a.pdf',
        mime_type: 'x',
        file_size: 0,
        storage_path: 'x',
      }).success
    ).toBe(false);
  });

  it('storage_path 빈 문자열 거부', () => {
    expect(
      attachmentInputSchema.safeParse({
        file_name: 'a.pdf',
        mime_type: 'x',
        file_size: 10,
        storage_path: '',
      }).success
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
    expect(noticeSearchSchema.safeParse({ filter_by: 'title' }).success).toBe(true);
    expect(noticeSearchSchema.safeParse({ filter_by: 'author' }).success).toBe(true);
    expect(noticeSearchSchema.safeParse({ filter_by: 'body' }).success).toBe(false);
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
