import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Import ──────────────────────────────────────────────────────────────────

import TabNavigation from './TabNavigation';
import type { TabType } from './TabNavigation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Tab {
  id: TabType;
  label: string;
  badge?: number;
}

const defaultTabs: Tab[] = [
  { id: 'auto', label: 'AI 자동 매칭', badge: 3 },
  { id: 'manual', label: '직접 선택' },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TabNavigation', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('탭 렌더링', () => {
    it('tabs 배열의 모든 탭이 렌더링된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      expect(screen.getByText('AI 자동 매칭')).toBeInTheDocument();
      expect(screen.getByText('직접 선택')).toBeInTheDocument();
    });

    it('tab 버튼이 탭 수만큼 렌더링된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('단일 탭도 올바르게 렌더링된다', () => {
      const singleTab: Tab[] = [{ id: 'auto', label: 'AI 자동 매칭' }];
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={singleTab} />,
      );
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
  });

  describe('활성 탭 스타일', () => {
    it('activeTab과 일치하는 탭 버튼에 border-blue-500 클래스가 포함된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      const autoButton = screen.getByText('AI 자동 매칭').closest('button');
      expect(autoButton?.className).toContain('border-blue-500');
      expect(autoButton?.className).toContain('text-blue-600');
    });

    it('비활성 탭 버튼에 border-transparent 클래스가 포함된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      const manualButton = screen.getByText('직접 선택').closest('button');
      expect(manualButton?.className).toContain('border-transparent');
    });

    it('manual 탭이 활성화되면 manual 버튼에 border-blue-500이 포함된다', () => {
      render(
        <TabNavigation activeTab="manual" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      const manualButton = screen.getByText('직접 선택').closest('button');
      expect(manualButton?.className).toContain('border-blue-500');
      expect(manualButton?.className).toContain('text-blue-600');
    });

    it('manual 탭이 활성화되면 auto 버튼은 비활성 스타일이다', () => {
      render(
        <TabNavigation activeTab="manual" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      const autoButton = screen.getByText('AI 자동 매칭').closest('button');
      expect(autoButton?.className).toContain('border-transparent');
    });
  });

  describe('탭 클릭 콜백', () => {
    it('탭 클릭 시 onTabChange가 해당 탭 id와 함께 호출된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      fireEvent.click(screen.getByText('직접 선택'));
      expect(mockOnTabChange).toHaveBeenCalledWith('manual');
    });

    it('이미 활성화된 탭 클릭 시에도 onTabChange가 호출된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      fireEvent.click(screen.getByText('AI 자동 매칭'));
      expect(mockOnTabChange).toHaveBeenCalledWith('auto');
    });

    it('auto 탭 클릭 시 onTabChange가 "auto"와 함께 호출된다', () => {
      render(
        <TabNavigation activeTab="manual" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      fireEvent.click(screen.getByText('AI 자동 매칭'));
      expect(mockOnTabChange).toHaveBeenCalledWith('auto');
    });
  });

  describe('뱃지 숫자', () => {
    it('badge가 있는 탭에 "명" 단위로 뱃지가 표시된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      expect(screen.getByText('3명')).toBeInTheDocument();
    });

    it('badge=0인 경우 뱃지가 표시되지 않는다', () => {
      const tabsWithZeroBadge: Tab[] = [
        { id: 'auto', label: 'AI 자동 매칭', badge: 0 },
        { id: 'manual', label: '직접 선택' },
      ];
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={tabsWithZeroBadge} />,
      );
      expect(screen.queryByText('0명')).not.toBeInTheDocument();
    });

    it('badge가 없는 탭에는 뱃지가 표시되지 않는다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      // '직접 선택' 탭에는 badge가 없음
      const manualButton = screen.getByText('직접 선택').closest('button');
      expect(manualButton?.textContent).not.toContain('명');
    });

    it('badge가 있는 경우 뱃지에 bg-blue-100 스타일이 적용된다', () => {
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={defaultTabs} />,
      );
      const badge = screen.getByText('3명');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-800');
    });

    it('badge=5인 경우 "5명"이 표시된다', () => {
      const tabs: Tab[] = [{ id: 'auto', label: 'AI 자동 매칭', badge: 5 }];
      render(
        <TabNavigation activeTab="auto" onTabChange={mockOnTabChange} tabs={tabs} />,
      );
      expect(screen.getByText('5명')).toBeInTheDocument();
    });
  });
});
