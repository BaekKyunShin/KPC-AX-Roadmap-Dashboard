/**
 * SttInsightsCards 공용 컴포넌트 테스트
 *
 * RoadmapInterviewSummary·PblInterviewSummary·InterviewReviewClient 양쪽에서
 * 재사용되는 6 카테고리(추가_업무·추가_페인포인트·숨은_니즈·조직_맥락·AI_태도·
 * 주요_인용) 카드 그리드. 비어 있는 카테고리는 카드 자체를 렌더하지 않으며,
 * 6 필드 모두 비어 있으면 컴포넌트가 null 을 반환한다.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

import { SttInsightsCards, hasAnyStt } from './SttInsightsCards';

describe('SttInsightsCards', () => {
  it('stt 가 undefined 면 null 을 반환한다 (DOM 미렌더)', () => {
    const { container } = render(<SttInsightsCards stt={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stt 6 필드가 모두 비어 있으면 null 을 반환한다', () => {
    const empty: SttInsights = {
      추가_업무: [],
      추가_페인포인트: [],
      숨은_니즈: [],
      조직_맥락: '',
      AI_태도: '',
      주요_인용: [],
    };
    const { container } = render(<SttInsightsCards stt={empty} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('배열 카테고리(추가_업무) 가 채워지면 "추가 업무" 카드와 항목을 표시한다', () => {
    render(
      <SttInsightsCards
        stt={{ 추가_업무: ['데이터 정리', '주간 보고 자동화'] }}
      />,
    );
    expect(screen.getByText('추가 업무')).toBeInTheDocument();
    expect(screen.getByText('데이터 정리')).toBeInTheDocument();
    expect(screen.getByText('주간 보고 자동화')).toBeInTheDocument();
  });

  it('문자열 카테고리(조직_맥락) 가 채워지면 "조직 맥락" 카드와 본문을 표시한다', () => {
    render(<SttInsightsCards stt={{ 조직_맥락: 'TF 신설 직후' }} />);
    expect(screen.getByText('조직 맥락')).toBeInTheDocument();
    expect(screen.getByText('TF 신설 직후')).toBeInTheDocument();
  });

  it('6 카테고리가 모두 채워지면 6 개의 카드가 모두 표시된다', () => {
    const full: SttInsights = {
      추가_업무: ['업무1'],
      추가_페인포인트: ['페인1'],
      숨은_니즈: ['니즈1'],
      조직_맥락: '맥락 본문',
      AI_태도: '태도 본문',
      주요_인용: ['"인용1"'],
    };
    render(<SttInsightsCards stt={full} />);
    expect(screen.getByText('추가 업무')).toBeInTheDocument();
    expect(screen.getByText('추가 페인포인트')).toBeInTheDocument();
    expect(screen.getByText('숨은 니즈')).toBeInTheDocument();
    expect(screen.getByText('조직 맥락')).toBeInTheDocument();
    expect(screen.getByText('AI 태도')).toBeInTheDocument();
    expect(screen.getByText('주요 인용')).toBeInTheDocument();
  });

  it('grid 컨테이너 클래스가 sm:grid-cols-2 (1열→2열 반응형) 다', () => {
    const { container } = render(
      <SttInsightsCards stt={{ 추가_업무: ['x'] }} />,
    );
    const grid = container.querySelector('div.grid');
    expect(grid).not.toBeNull();
    expect(grid!.className).toMatch(/grid-cols-1/);
    expect(grid!.className).toMatch(/sm:grid-cols-2/);
  });
});

describe('hasAnyStt 헬퍼', () => {
  it('undefined → false', () => {
    expect(hasAnyStt(undefined)).toBe(false);
  });
  it('모든 필드 비어 있음 → false', () => {
    expect(
      hasAnyStt({
        추가_업무: [],
        추가_페인포인트: [],
        숨은_니즈: [],
        조직_맥락: '',
        AI_태도: '',
        주요_인용: [],
      }),
    ).toBe(false);
  });
  it('한 필드라도 채워지면 → true', () => {
    expect(hasAnyStt({ 조직_맥락: 'X' })).toBe(true);
    expect(hasAnyStt({ 추가_업무: ['Y'] })).toBe(true);
  });
});
