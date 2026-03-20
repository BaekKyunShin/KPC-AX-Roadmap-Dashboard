/**
 * toast.ts 테스트
 * - showErrorToast: 에러 토스트 표시
 * - showSuccessToast: 성공 토스트 표시
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { toast } from 'sonner';
import { showErrorToast, showSuccessToast } from './toast';

// ─── sonner 모킹 ──────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

// ─── showErrorToast ────────────────────────────────────────────────────────

describe('showErrorToast', () => {
  it('title만 전달하면 description 없이 호출한다', () => {
    showErrorToast('에러 발생');

    expect(toast.error).toHaveBeenCalledWith('에러 발생', undefined);
  });

  it('title과 description을 함께 전달한다', () => {
    showErrorToast('에러 발생', '상세 내용');

    expect(toast.error).toHaveBeenCalledWith('에러 발생', { description: '상세 내용' });
  });

  it('빈 title이어도 호출된다', () => {
    showErrorToast('');

    expect(toast.error).toHaveBeenCalledWith('', undefined);
  });

  it('description이 빈 문자열이면 falsy이므로 undefined로 전달', () => {
    showErrorToast('에러', '');

    expect(toast.error).toHaveBeenCalledWith('에러', undefined);
  });

  it('매우 긴 title도 그대로 전달된다', () => {
    const longTitle = '오류: ' + 'A'.repeat(500);
    showErrorToast(longTitle);

    expect(toast.error).toHaveBeenCalledWith(longTitle, undefined);
  });

  it('매우 긴 description도 그대로 전달된다', () => {
    const longDescription = '상세: ' + 'B'.repeat(500);
    showErrorToast('에러', longDescription);

    expect(toast.error).toHaveBeenCalledWith('에러', { description: longDescription });
  });

  it('특수문자가 포함된 에러 메시지도 정상 전달된다', () => {
    showErrorToast('저장 실패!', '프로젝트 "AI 기초"의 <업데이트>가 실패하였습니다.');

    expect(toast.error).toHaveBeenCalledWith('저장 실패!', {
      description: '프로젝트 "AI 기초"의 <업데이트>가 실패하였습니다.',
    });
  });
});

// ─── showSuccessToast ──────────────────────────────────────────────────────

describe('showSuccessToast', () => {
  it('title만 전달하면 description 없이 호출한다', () => {
    showSuccessToast('성공');

    expect(toast.success).toHaveBeenCalledWith('성공', undefined);
  });

  it('title과 description을 함께 전달한다', () => {
    showSuccessToast('성공', '저장되었습니다');

    expect(toast.success).toHaveBeenCalledWith('성공', { description: '저장되었습니다' });
  });

  it('빈 title이어도 호출된다', () => {
    showSuccessToast('');

    expect(toast.success).toHaveBeenCalledWith('', undefined);
  });

  it('description이 빈 문자열이면 falsy이므로 undefined로 전달', () => {
    showSuccessToast('성공', '');

    expect(toast.success).toHaveBeenCalledWith('성공', undefined);
  });

  it('긴 title도 정상 전달된다', () => {
    const longTitle = 'A'.repeat(300);
    showSuccessToast(longTitle);

    expect(toast.success).toHaveBeenCalledWith(longTitle, undefined);
  });

  it('한국어 특수문자가 포함된 메시지도 정상 전달', () => {
    showSuccessToast('저장 완료!', '프로젝트 "테스트"가 <성공>적으로 저장됨');

    expect(toast.success).toHaveBeenCalledWith('저장 완료!', {
      description: '프로젝트 "테스트"가 <성공>적으로 저장됨',
    });
  });
});
