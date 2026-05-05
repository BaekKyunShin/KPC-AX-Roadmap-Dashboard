import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('test-roadmap/loading.tsx', () => {
  it('잘못된 안내 문구 ("시스템 사용법 연습을 위한 로드맵 테스트을 생성합니다")를 노출하지 않는다', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('시스템 사용법 연습을 위한 로드맵 테스트');
  });

  it('실제 페이지에 없는 탭 ("새 테스트", "테스트 기록")을 노출하지 않는다', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('새 테스트');
    expect(text).not.toContain('테스트 기록');
  });

  it('실제 페이지에 없는 폼 카드 텍스트 ("기업 기본정보", "세부 업무" 등)를 노출하지 않는다', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    // 실제 페이지에는 InterviewStepper + 단일 단계 폼만 있음
    expect(text).not.toContain('기업 기본정보');
    expect(text).not.toContain('세부 업무');
    expect(text).not.toContain('페인포인트');
    expect(text).not.toContain('개선 목표');
    expect(text).not.toContain('추가 요구사항');
  });

  it('animate-shimmer 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('인터뷰 폼 단일 단계 영역(min-h-[400px])을 미러링한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.min-h-\\[400px\\]')).toBeInTheDocument();
  });

  it('실제 페이지와 동일한 컨테이너 폭 (max-w-5xl mx-auto)을 사용한다', () => {
    const { container } = render(<Loading />);
    const wrapper = container.querySelector('.max-w-5xl.mx-auto');
    expect(wrapper).toBeInTheDocument();
  });
});
