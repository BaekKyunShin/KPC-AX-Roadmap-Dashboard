import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormSection } from '../FormSection';

describe('FormSection', () => {
  it('number 와 title 을 렌더한다', () => {
    render(
      <FormSection number="Ⅰ-1" title="기업 개요">
        <p>내용</p>
      </FormSection>,
    );
    expect(screen.getByText('Ⅰ-1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '기업 개요' })).toBeInTheDocument();
    expect(screen.getByText('내용')).toBeInTheDocument();
  });

  it('label 옵션을 표시한다', () => {
    render(
      <FormSection number="Ⅱ-3" title="학습 목표" label="[인터뷰 입력]">
        <p>내용</p>
      </FormSection>,
    );
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
  });

  it('description 옵션을 표시한다', () => {
    render(
      <FormSection
        number="Ⅲ-1"
        title="결론"
        description="본 절은 결론 작성용입니다."
      >
        <p>내용</p>
      </FormSection>,
    );
    expect(screen.getByText('본 절은 결론 작성용입니다.')).toBeInTheDocument();
  });

  it('className 이 루트 section 에 합성된다', () => {
    const { container } = render(
      <FormSection number="Ⅰ-1" title="제목" className="custom-section">
        <p>내용</p>
      </FormSection>,
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('custom-section');
    // 기본 클래스도 유지
    expect(section).toHaveClass('space-y-4');
  });

  // R2 #2 — 로마자/숫자 폰트 본문과 통일 회귀 차단
  it('number span 에 font-mono 클래스가 없고 본문(text-xl font-semibold)과 동일 폰트로 렌더된다', () => {
    render(
      <FormSection number="Ⅰ-1" title="기업 개요">
        <p>내용</p>
      </FormSection>,
    );
    const numberEl = screen.getByText('Ⅰ-1');
    expect(numberEl).not.toHaveClass('font-mono');
    expect(numberEl).toHaveClass('text-xl');
    expect(numberEl).toHaveClass('font-semibold');
  });
});
