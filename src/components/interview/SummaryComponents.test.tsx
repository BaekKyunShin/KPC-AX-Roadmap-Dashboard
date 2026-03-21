import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import {
  SummarySection,
  SeverityBadge,
  StatCard,
  InfoBox,
  formatKoreanDate,
} from './SummaryComponents';

// =============================================================================
// formatKoreanDate 테스트
// =============================================================================

describe('formatKoreanDate', () => {
  it('유효한 날짜 문자열을 한국어 형식으로 변환한다', () => {
    const result = formatKoreanDate('2024-01-15');
    expect(result).toContain('2024');
    expect(result).toContain('1');
    expect(result).toContain('15');
  });

  it('toLocaleDateString ko-KR 형식을 반환한다', () => {
    const result = formatKoreanDate('2024-06-01');
    // ko-KR 포맷은 "2024년 6월 1일" 형태
    expect(result).toMatch(/\d{4}.+\d{1,2}.+\d{1,2}/);
  });
});

// =============================================================================
// SeverityBadge 테스트
// =============================================================================

describe('SeverityBadge', () => {
  it('HIGH 심각도를 "높음"으로 표시한다', () => {
    render(<SeverityBadge severity="HIGH" />);
    expect(screen.getByText('높음')).toBeInTheDocument();
  });

  it('MEDIUM 심각도를 "보통"으로 표시한다', () => {
    render(<SeverityBadge severity="MEDIUM" />);
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  it('LOW 심각도를 "낮음"으로 표시한다', () => {
    render(<SeverityBadge severity="LOW" />);
    expect(screen.getByText('낮음')).toBeInTheDocument();
  });

  it('알 수 없는 심각도는 입력값 그대로 표시한다', () => {
    render(<SeverityBadge severity="UNKNOWN" />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('HIGH일 때 빨간색 스타일 클래스를 가진다', () => {
    render(<SeverityBadge severity="HIGH" />);
    const badge = screen.getByText('높음');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });

  it('MEDIUM일 때 노란색 스타일 클래스를 가진다', () => {
    render(<SeverityBadge severity="MEDIUM" />);
    const badge = screen.getByText('보통');
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-800');
  });

  it('LOW일 때 초록색 스타일 클래스를 가진다', () => {
    render(<SeverityBadge severity="LOW" />);
    const badge = screen.getByText('낮음');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('span 요소로 렌더링된다', () => {
    const { container } = render(<SeverityBadge severity="HIGH" />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });
});

// =============================================================================
// SummarySection 테스트
// =============================================================================

describe('SummarySection', () => {
  it('title을 표시한다', () => {
    render(
      <SummarySection title="테스트 섹션" onEdit={vi.fn()}>
        <p>내용</p>
      </SummarySection>,
    );
    expect(screen.getByText('테스트 섹션')).toBeInTheDocument();
  });

  it('children을 렌더링한다', () => {
    render(
      <SummarySection title="섹션" onEdit={vi.fn()}>
        <p>자식 콘텐츠</p>
      </SummarySection>,
    );
    expect(screen.getByText('자식 콘텐츠')).toBeInTheDocument();
  });

  it('수정 버튼이 렌더링된다', () => {
    render(
      <SummarySection title="섹션" onEdit={vi.fn()}>
        <p>내용</p>
      </SummarySection>,
    );
    expect(screen.getByRole('button', { name: /수정/ })).toBeInTheDocument();
  });

  it('수정 버튼 클릭 시 onEdit 핸들러가 호출된다', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <SummarySection title="섹션" onEdit={onEdit}>
        <p>내용</p>
      </SummarySection>,
    );
    await user.click(screen.getByRole('button', { name: /수정/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('isEmpty가 true이면 "입력된 내용 없음"을 표시한다', () => {
    render(
      <SummarySection title="빈 섹션" onEdit={vi.fn()} isEmpty>
        <p>children은 숨겨짐</p>
      </SummarySection>,
    );
    expect(screen.getByText('입력된 내용 없음')).toBeInTheDocument();
    expect(screen.queryByText('children은 숨겨짐')).not.toBeInTheDocument();
  });

  it('isEmpty가 false이면 children을 표시한다', () => {
    render(
      <SummarySection title="섹션" onEdit={vi.fn()} isEmpty={false}>
        <p>내용 표시</p>
      </SummarySection>,
    );
    expect(screen.getByText('내용 표시')).toBeInTheDocument();
    expect(screen.queryByText('입력된 내용 없음')).not.toBeInTheDocument();
  });

  it('isTestSection이 true이면 "(테스트 전용)" 라벨을 표시한다', () => {
    render(
      <SummarySection title="테스트" onEdit={vi.fn()} isTestSection>
        <p>내용</p>
      </SummarySection>,
    );
    expect(screen.getByText('(테스트 전용)')).toBeInTheDocument();
  });

  it('isTestSection이 false이면 "(테스트 전용)" 라벨이 없다', () => {
    render(
      <SummarySection title="일반" onEdit={vi.fn()}>
        <p>내용</p>
      </SummarySection>,
    );
    expect(screen.queryByText('(테스트 전용)')).not.toBeInTheDocument();
  });

  it('isTestSection이 true이면 amber 테두리 스타일을 가진다', () => {
    const { container } = render(
      <SummarySection title="테스트" onEdit={vi.fn()} isTestSection>
        <p>내용</p>
      </SummarySection>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('border-amber-200');
  });

  it('isTestSection이 false이면 gray 테두리 스타일을 가진다', () => {
    const { container } = render(
      <SummarySection title="일반" onEdit={vi.fn()}>
        <p>내용</p>
      </SummarySection>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('border-gray-200');
  });
});

// =============================================================================
// InfoBox 테스트
// =============================================================================

describe('InfoBox', () => {
  it('title을 표시한다', () => {
    render(<InfoBox title="안내 제목">내용</InfoBox>);
    expect(screen.getByText('안내 제목')).toBeInTheDocument();
  });

  it('children을 렌더링한다', () => {
    render(<InfoBox title="제목">박스 내용</InfoBox>);
    expect(screen.getByText('박스 내용')).toBeInTheDocument();
  });

  it('파란색 배경 스타일을 가진다', () => {
    const { container } = render(<InfoBox title="제목">내용</InfoBox>);
    const box = container.firstChild as HTMLElement;
    expect(box.className).toContain('bg-blue-50');
    expect(box.className).toContain('border-blue-200');
  });

  it('SVG 아이콘이 포함된다', () => {
    const { container } = render(<InfoBox title="제목">내용</InfoBox>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

// =============================================================================
// StatCard 테스트
// =============================================================================

describe('StatCard', () => {
  it('value를 표시한다', () => {
    render(<StatCard value={42} label="총 건수" colorScheme="blue" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('label을 표시한다', () => {
    render(<StatCard value={10} label="완료" colorScheme="green" />);
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('blue 색상 스킴이 적용된다', () => {
    const { container } = render(
      <StatCard value={1} label="테스트" colorScheme="blue" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-blue-50');
  });

  it('indigo 색상 스킴이 적용된다', () => {
    const { container } = render(
      <StatCard value={1} label="테스트" colorScheme="indigo" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-indigo-50');
  });

  it('red 색상 스킴이 적용된다', () => {
    const { container } = render(
      <StatCard value={1} label="테스트" colorScheme="red" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-red-50');
  });

  it('green 색상 스킴이 적용된다', () => {
    const { container } = render(
      <StatCard value={1} label="테스트" colorScheme="green" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-green-50');
  });

  it('0값도 올바르게 표시한다', () => {
    render(<StatCard value={0} label="없음" colorScheme="blue" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
