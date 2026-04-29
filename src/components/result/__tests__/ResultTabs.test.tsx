import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultTabs, type ResultTabItem } from '../ResultTabs';

const mockReplace = vi.fn();
let mockSearchParamsValue = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsValue),
}));

const TABS: ResultTabItem[] = [
  { value: 'overview', label: 'Ⅰ. 개요', content: <div>개요 콘텐츠</div> },
  {
    value: 'requirements',
    label: 'Ⅱ. 요구분석',
    content: <div>요구분석 콘텐츠</div>,
  },
  {
    value: 'training',
    label: 'Ⅲ. 훈련체계',
    content: <div>훈련체계 콘텐츠</div>,
  },
];

describe('ResultTabs', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParamsValue = '';
  });

  it('첫 탭이 기본 활성 상태로 렌더된다', () => {
    render(<ResultTabs tabs={TABS} />);
    // Radix Tabs 는 활성 탭의 content 만 렌더
    expect(screen.getByText('개요 콘텐츠')).toBeInTheDocument();
  });

  it('URL ?tab=requirements 가 있으면 해당 탭이 활성이 된다', () => {
    mockSearchParamsValue = 'tab=requirements';
    render(<ResultTabs tabs={TABS} />);
    expect(screen.getByText('요구분석 콘텐츠')).toBeInTheDocument();
  });

  it('탭 변경 시 router.replace 가 ?tab={value} 로 호출된다', async () => {
    const user = userEvent.setup();
    render(<ResultTabs tabs={TABS} />);
    await user.click(screen.getByRole('tab', { name: /요구분석/ }));
    // Radix Tabs 는 focus + click 시 onValueChange 를 여러 번 호출할 수 있으므로
    // 호출 횟수 자체가 아니라 "최소 1회 이상 + 올바른 인자" 를 검증한다.
    expect(mockReplace).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('tab=requirements'),
      { scroll: false },
    );
  });

  it('탭 클릭 시 새 탭 콘텐츠가 즉시 표시된다 (useSearchParams 갱신 대기 없이) — #13', async () => {
    // mockSearchParamsValue 는 변경하지 않는다. 즉 router.replace 가 호출돼도
    // useSearchParams 는 빈 값 그대로. local state 기반이 아니라면 새 탭이
    // 활성화되지 않는다. local state 기반(#13 fix) 이라면 즉시 새 탭 콘텐츠 표시.
    const user = userEvent.setup();
    render(<ResultTabs tabs={TABS} />);
    expect(screen.getByText('개요 콘텐츠')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /훈련체계/ }));
    expect(screen.getByText('훈련체계 콘텐츠')).toBeInTheDocument();
  });

  it('URL 에 유효하지 않은 tab 값이 있으면 fallback (첫 탭) 이 활성화된다', () => {
    mockSearchParamsValue = 'tab=invalid';
    render(<ResultTabs tabs={TABS} />);
    expect(screen.getByText('개요 콘텐츠')).toBeInTheDocument();
  });

  it('defaultValue props 가 fallback 으로 사용된다', () => {
    render(<ResultTabs tabs={TABS} defaultValue="training" />);
    expect(screen.getByText('훈련체계 콘텐츠')).toBeInTheDocument();
  });

  it('전체 펼치기 토글 시 모든 탭 콘텐츠가 한번에 보인다', async () => {
    const user = userEvent.setup();
    render(<ResultTabs tabs={TABS} />);
    // 초기: 첫 탭만 보임
    expect(screen.getByText('개요 콘텐츠')).toBeInTheDocument();
    expect(screen.queryByText('요구분석 콘텐츠')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /전체 펼치기/ }));

    expect(screen.getByText('개요 콘텐츠')).toBeInTheDocument();
    expect(screen.getByText('요구분석 콘텐츠')).toBeInTheDocument();
    expect(screen.getByText('훈련체계 콘텐츠')).toBeInTheDocument();
  });

  it('전체 펼치기 상태에서 토글 버튼 라벨이 "탭별 보기" 로 바뀐다', async () => {
    const user = userEvent.setup();
    render(<ResultTabs tabs={TABS} />);
    await user.click(screen.getByRole('button', { name: /전체 펼치기/ }));
    expect(
      screen.getByRole('button', { name: /탭별 보기/ }),
    ).toBeInTheDocument();
  });

  it('searchParamName prop 으로 쿼리 파라미터 이름을 커스터마이즈할 수 있다', () => {
    mockSearchParamsValue = 'section=training';
    render(<ResultTabs tabs={TABS} searchParamName="section" />);
    expect(screen.getByText('훈련체계 콘텐츠')).toBeInTheDocument();
  });

  it('className prop 이 root div 에 합성된다', () => {
    const { container } = render(
      <ResultTabs tabs={TABS} className="custom-root" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/result-tabs-root/);
    expect(root.className).toMatch(/custom-root/);
  });
});
