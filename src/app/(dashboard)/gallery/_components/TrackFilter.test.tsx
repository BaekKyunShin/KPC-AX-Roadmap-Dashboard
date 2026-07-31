import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackFilter } from './TrackFilter';

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

describe('TrackFilter', () => {
  it('3개 토글(전체/로드맵/PBL) 렌더', () => {
    render(<TrackFilter />);
    expect(screen.getByTestId('track-filter-ALL')).toHaveTextContent('전체');
    expect(screen.getByTestId('track-filter-ROADMAP')).toHaveTextContent('로드맵');
    expect(screen.getByTestId('track-filter-PBL')).toHaveTextContent('PBL');
  });

  it('URL ?track 없으면 "전체" 활성화', () => {
    render(<TrackFilter />);
    expect(screen.getByTestId('track-filter-ALL').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('track-filter-ROADMAP').getAttribute('aria-selected')).toBe('false');
  });

  it('URL ?track=ROADMAP → 로드맵 활성화', () => {
    mockSearchParams = new URLSearchParams('track=ROADMAP');
    render(<TrackFilter />);
    expect(screen.getByTestId('track-filter-ROADMAP').getAttribute('aria-selected')).toBe('true');
  });

  it('URL ?track=PBL → PBL 활성화', () => {
    mockSearchParams = new URLSearchParams('track=PBL');
    render(<TrackFilter />);
    expect(screen.getByTestId('track-filter-PBL').getAttribute('aria-selected')).toBe('true');
  });

  it('잘못된 track 값은 무시 → 전체 활성화', () => {
    mockSearchParams = new URLSearchParams('track=INVALID');
    render(<TrackFilter />);
    expect(screen.getByTestId('track-filter-ALL').getAttribute('aria-selected')).toBe('true');
  });

  it('로드맵 클릭 시 URL에 track=ROADMAP 설정 (scroll: false)', () => {
    render(<TrackFilter />);
    fireEvent.click(screen.getByTestId('track-filter-ROADMAP'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?track=ROADMAP', { scroll: false });
  });

  it('PBL 클릭 시 URL에 track=PBL 설정 (scroll: false)', () => {
    render(<TrackFilter />);
    fireEvent.click(screen.getByTestId('track-filter-PBL'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?track=PBL', { scroll: false });
  });

  it('전체 클릭 시 URL에서 track 제거 (scroll: false)', () => {
    mockSearchParams = new URLSearchParams('track=PBL&search=foo');
    render(<TrackFilter />);
    fireEvent.click(screen.getByTestId('track-filter-ALL'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?search=foo', { scroll: false });
  });

  it('필터 변경 시 기존 page 파라미터 제거 (첫 페이지로 이동, scroll: false)', () => {
    mockSearchParams = new URLSearchParams('page=3');
    render(<TrackFilter />);
    fireEvent.click(screen.getByTestId('track-filter-PBL'));
    expect(routerPush).toHaveBeenCalledWith('/gallery?track=PBL', { scroll: false });
  });

  it('제어형: value/onChange 사용 시 URL 직접 변경 없음', () => {
    const onChange = vi.fn();
    render(<TrackFilter value="PBL" onChange={onChange} />);
    expect(screen.getByTestId('track-filter-PBL').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('track-filter-ROADMAP'));
    expect(onChange).toHaveBeenCalledWith('ROADMAP');
    expect(routerPush).not.toHaveBeenCalled();
  });
});
