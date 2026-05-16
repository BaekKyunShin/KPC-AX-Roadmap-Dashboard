import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScopeFilter } from './ScopeFilter';

const routerPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
  usePathname: () => '/gallery',
  useSearchParams: () => mockSearchParams,
}));

let mockSearchParams: URLSearchParams;

beforeEach(() => {
  routerPush.mockClear();
  mockSearchParams = new URLSearchParams();
});

describe('ScopeFilter', () => {
  it('2개 토글 (전체 갤러리 / 내 산출물) 렌더', () => {
    render(<ScopeFilter />);
    expect(screen.getByTestId('scope-filter-all')).toHaveTextContent('전체 갤러리');
    expect(screen.getByTestId('scope-filter-mine')).toHaveTextContent('내 산출물');
  });

  it('URL ?scope 없으면 "전체 갤러리" 활성화', () => {
    render(<ScopeFilter />);
    expect(screen.getByTestId('scope-filter-all').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('scope-filter-mine').getAttribute('aria-selected')).toBe('false');
  });

  it('URL ?scope=mine → 내 산출물 활성화', () => {
    mockSearchParams = new URLSearchParams('scope=mine');
    render(<ScopeFilter />);
    expect(screen.getByTestId('scope-filter-mine').getAttribute('aria-selected')).toBe('true');
  });

  it('잘못된 scope 값은 무시 → 전체 갤러리 활성화', () => {
    mockSearchParams = new URLSearchParams('scope=others');
    render(<ScopeFilter />);
    expect(screen.getByTestId('scope-filter-all').getAttribute('aria-selected')).toBe('true');
  });

  it('내 산출물 클릭 시 URL에 scope=mine 설정', () => {
    render(<ScopeFilter />);
    fireEvent.click(screen.getByTestId('scope-filter-mine'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?scope=mine');
  });

  it('전체 갤러리 클릭 시 URL에서 scope 제거', () => {
    mockSearchParams = new URLSearchParams('scope=mine&search=foo');
    render(<ScopeFilter />);
    fireEvent.click(screen.getByTestId('scope-filter-all'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?search=foo');
  });

  it('필터 변경 시 기존 page 파라미터 제거', () => {
    mockSearchParams = new URLSearchParams('page=3');
    render(<ScopeFilter />);
    fireEvent.click(screen.getByTestId('scope-filter-mine'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?scope=mine');
  });

  it('제어형: value/onChange 사용 시 URL 직접 변경 없음', () => {
    const onChange = vi.fn();
    render(<ScopeFilter value="mine" onChange={onChange} />);
    expect(screen.getByTestId('scope-filter-mine').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('scope-filter-all'));
    expect(onChange).toHaveBeenCalledWith('all');
    expect(routerPush).not.toHaveBeenCalled();
  });

  describe('freeze 방지: 낙관적 active + useTransition', () => {
    it('클릭 즉시 aria-selected 가 갱신된다 (URL 변경 대기 없이)', () => {
      render(<ScopeFilter />);
      // 클릭 전: 전체 갤러리 active
      expect(screen.getByTestId('scope-filter-all').getAttribute('aria-selected')).toBe('true');
      expect(screen.getByTestId('scope-filter-mine').getAttribute('aria-selected')).toBe('false');

      // 클릭 직후: 내 산출물 active (URL 변경 완료를 기다리지 않음)
      fireEvent.click(screen.getByTestId('scope-filter-mine'));
      expect(screen.getByTestId('scope-filter-mine').getAttribute('aria-selected')).toBe('true');
      expect(screen.getByTestId('scope-filter-all').getAttribute('aria-selected')).toBe('false');
    });

    it('같은 토글을 다시 클릭해도 router.push 가 호출되지 않는다 (중복 navigation 방지)', () => {
      render(<ScopeFilter />);
      fireEvent.click(screen.getByTestId('scope-filter-all'));
      expect(routerPush).not.toHaveBeenCalled();
    });

    it('외부에서 URL 이 변경되면 토글 active 상태가 따라온다', () => {
      const { rerender } = render(<ScopeFilter />);
      expect(screen.getByTestId('scope-filter-all').getAttribute('aria-selected')).toBe('true');

      // 외부에서 URL 이 ?scope=mine 으로 변경 (예: 다른 컴포넌트에서 navigate)
      mockSearchParams = new URLSearchParams('scope=mine');
      rerender(<ScopeFilter />);
      expect(screen.getByTestId('scope-filter-mine').getAttribute('aria-selected')).toBe('true');
    });
  });
});
