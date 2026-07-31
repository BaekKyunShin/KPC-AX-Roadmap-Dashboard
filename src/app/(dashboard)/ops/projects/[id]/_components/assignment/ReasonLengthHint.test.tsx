import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// ─── Import ──────────────────────────────────────────────────────────────────

import ReasonLengthHint from './ReasonLengthHint';
import { REASON_LENGTH } from './constants';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReasonLengthHint', () => {
  describe('최소 글자수 미달 시 경고 스타일', () => {
    it('currentLength=0일 때 amber 색상 텍스트가 렌더링된다', () => {
      render(<ReasonLengthHint currentLength={0} />);
      const hintSpan = screen.getByText(/자 더 입력 필요/);
      expect(hintSpan.className).toContain('text-amber-600');
    });

    it('currentLength가 MIN보다 1 적을 때 경고 스타일이다', () => {
      const oneUnder = REASON_LENGTH.MIN - 1;
      render(<ReasonLengthHint currentLength={oneUnder} />);
      const hintSpan = screen.getByText(/자 더 입력 필요/);
      expect(hintSpan.className).toContain('text-amber-600');
    });

    it('currentLength=0일 때 남은 글자수 메시지가 표시된다', () => {
      render(<ReasonLengthHint currentLength={0} />);
      expect(screen.getByText(`${REASON_LENGTH.MIN}자 더 입력 필요`)).toBeInTheDocument();
    });

    it('currentLength=5일 때 남은 5자 메시지가 표시된다', () => {
      render(<ReasonLengthHint currentLength={5} />);
      // REASON_LENGTH.MIN=10, 남은 글자 = 10-5 = 5
      expect(screen.getByText('5자 더 입력 필요')).toBeInTheDocument();
    });

    it('currentLength=0일 때 green 색상 클래스가 없다', () => {
      render(<ReasonLengthHint currentLength={0} />);
      const hintSpan = screen.getByText(/자 더 입력 필요/);
      expect(hintSpan.className).not.toContain('text-green-600');
    });
  });

  describe('최소 글자수 충족 시 정상 스타일', () => {
    it('currentLength가 MIN 이상일 때 green 색상 텍스트가 렌더링된다', () => {
      render(<ReasonLengthHint currentLength={REASON_LENGTH.MIN} />);
      const hintSpan = screen.getByText('입력 완료');
      expect(hintSpan.className).toContain('text-green-600');
    });

    it('currentLength가 MIN보다 클 때 "입력 완료" 텍스트가 표시된다', () => {
      render(<ReasonLengthHint currentLength={REASON_LENGTH.MIN + 10} />);
      expect(screen.getByText('입력 완료')).toBeInTheDocument();
    });

    it('currentLength=MIN일 때 "입력 완료" 텍스트가 표시된다', () => {
      render(<ReasonLengthHint currentLength={REASON_LENGTH.MIN} />);
      expect(screen.getByText('입력 완료')).toBeInTheDocument();
    });

    it('currentLength가 MIN 이상일 때 amber 색상 클래스가 없다', () => {
      render(<ReasonLengthHint currentLength={REASON_LENGTH.MIN} />);
      const hintSpan = screen.getByText('입력 완료');
      expect(hintSpan.className).not.toContain('text-amber-600');
    });

    it('currentLength=MAX일 때도 "입력 완료" 텍스트가 표시된다', () => {
      render(<ReasonLengthHint currentLength={REASON_LENGTH.MAX} />);
      expect(screen.getByText('입력 완료')).toBeInTheDocument();
    });
  });

  describe('현재/최대 글자수 표시', () => {
    it('현재 글자수와 최대 글자수가 표시된다', () => {
      render(<ReasonLengthHint currentLength={25} />);
      expect(screen.getByText(`25/${REASON_LENGTH.MAX}자`)).toBeInTheDocument();
    });

    it('currentLength=0일 때 0/{MAX}자가 표시된다', () => {
      render(<ReasonLengthHint currentLength={0} />);
      expect(screen.getByText(`0/${REASON_LENGTH.MAX}자`)).toBeInTheDocument();
    });

    it('currentLength=MAX일 때 {MAX}/{MAX}자가 표시된다', () => {
      render(<ReasonLengthHint currentLength={REASON_LENGTH.MAX} />);
      expect(screen.getByText(`${REASON_LENGTH.MAX}/${REASON_LENGTH.MAX}자`)).toBeInTheDocument();
    });

    it('글자수 표시에 gray 색상 클래스가 적용된다', () => {
      render(<ReasonLengthHint currentLength={10} />);
      const countSpan = screen.getByText(`10/${REASON_LENGTH.MAX}자`);
      expect(countSpan.className).toContain('text-gray-500');
    });
  });

  describe('레이아웃', () => {
    it('힌트와 카운터가 나란히 렌더링된다 (flex justify-between)', () => {
      render(<ReasonLengthHint currentLength={5} />);
      const container = screen.getByText(/자 더 입력 필요/).parentElement;
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('justify-between');
    });
  });
});
