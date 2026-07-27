import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { VersionHistoryList } from './VersionHistoryList';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// ============================================================================
// 테스트 데이터 헬퍼 (산인공 양식 v2 구조)
// ============================================================================

function makeVersion(overrides: Partial<RoadmapVersionUI> = {}): RoadmapVersionUI {
  return {
    id: 'v-1',
    version_number: 1,
    status: 'DRAFT',
    diagnosis_summary: '진단 요약',
    setup_necessity: '',
    outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
    course_specs: [],
    revision_prompt: null,
    is_shared: false,
    created_at: '2026-01-20T10:00:00Z',
    finalized_at: null,
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('VersionHistoryList', () => {
  const defaultProps = {
    versions: [] as RoadmapVersionUI[],
    selectedVersionId: undefined,
    onVersionSelect: vi.fn(),
  };

  describe('빈 목록', () => {
    it('버전이 없으면 안내 메시지를 표시한다', () => {
      render(<VersionHistoryList {...defaultProps} versions={[]} />);
      expect(screen.getByText('아직 생성된 로드맵이 없습니다.')).toBeInTheDocument();
    });
  });

  describe('버전 목록 렌더링', () => {
    it('버전 번호를 표시한다', () => {
      const versions = [makeVersion({ id: 'v1', version_number: 1 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      expect(screen.getByText(/버전 1/)).toBeInTheDocument();
    });

    it('여러 버전을 렌더링한다', () => {
      const versions = [
        makeVersion({ id: 'v1', version_number: 1 }),
        makeVersion({ id: 'v2', version_number: 2 }),
        makeVersion({ id: 'v3', version_number: 3 }),
      ];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      expect(screen.getByText(/버전 1/)).toBeInTheDocument();
      expect(screen.getByText(/버전 2/)).toBeInTheDocument();
      expect(screen.getByText(/버전 3/)).toBeInTheDocument();
    });
  });

  describe('상태 배지', () => {
    it('DRAFT 상태 (버전 1)는 "초안"으로 표시한다', () => {
      const versions = [makeVersion({ status: 'DRAFT', version_number: 1 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      expect(screen.getByText('초안')).toBeInTheDocument();
    });

    it('DRAFT 상태 (버전 2 이상)는 "수정본"으로 표시한다', () => {
      const versions = [makeVersion({ status: 'DRAFT', version_number: 2 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      expect(screen.getByText('수정본')).toBeInTheDocument();
    });

    it('FINAL 상태는 "확정본"으로 표시한다', () => {
      const versions = [makeVersion({ status: 'FINAL', version_number: 1 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      expect(screen.getByText('확정본')).toBeInTheDocument();
    });

    it('ARCHIVED 상태는 "이전 확정본"으로 표시한다', () => {
      const versions = [makeVersion({ status: 'ARCHIVED', version_number: 1 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      expect(screen.getByText('이전 확정본')).toBeInTheDocument();
    });
  });

  describe('선택 상태 하이라이트', () => {
    it('선택된 버전에 하이라이트 스타일을 적용한다', () => {
      const versions = [makeVersion({ id: 'v1' }), makeVersion({ id: 'v2', version_number: 2 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} selectedVersionId="v1" />);
      const selectedButton = screen.getByText(/버전 1/).closest('button');
      expect(selectedButton).toHaveClass('bg-purple-50');
      expect(selectedButton).toHaveClass('border-purple-500');
    });

    it('선택되지 않은 버전에는 하이라이트 스타일을 적용하지 않는다', () => {
      const versions = [makeVersion({ id: 'v1' }), makeVersion({ id: 'v2', version_number: 2 })];
      render(<VersionHistoryList {...defaultProps} versions={versions} selectedVersionId="v1" />);
      const unselectedButton = screen.getByText(/버전 2/).closest('button');
      expect(unselectedButton).not.toHaveClass('bg-purple-50');
    });

    it('selectedVersionId가 undefined이면 어떤 버전도 하이라이트하지 않는다', () => {
      const versions = [makeVersion({ id: 'v1' })];
      render(
        <VersionHistoryList {...defaultProps} versions={versions} selectedVersionId={undefined} />
      );
      const button = screen.getByText(/버전 1/).closest('button');
      expect(button).not.toHaveClass('bg-purple-50');
    });
  });

  describe('날짜 포맷', () => {
    it('생성일을 한국어 날짜 형식으로 표시한다', () => {
      const versions = [makeVersion({ created_at: '2026-03-15T10:00:00Z' })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      // ko-KR 포맷: "2026. 3. 15." 또는 유사 형태
      expect(screen.getByText(/2026/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
    });
  });

  describe('버전 클릭 콜백', () => {
    it('버전 클릭 시 onVersionSelect를 해당 버전 ID와 함께 호출한다', async () => {
      const user = userEvent.setup();
      const onVersionSelect = vi.fn();
      const versions = [makeVersion({ id: 'v-42' })];
      render(
        <VersionHistoryList
          versions={versions}
          selectedVersionId={undefined}
          onVersionSelect={onVersionSelect}
        />
      );

      await user.click(screen.getByText(/버전 1/).closest('button')!);
      expect(onVersionSelect).toHaveBeenCalledWith('v-42');
    });

    it('여러 버전 중 특정 버전 클릭 시 올바른 ID를 전달한다', async () => {
      const user = userEvent.setup();
      const onVersionSelect = vi.fn();
      const versions = [
        makeVersion({ id: 'v-1', version_number: 1 }),
        makeVersion({ id: 'v-2', version_number: 2 }),
      ];
      render(
        <VersionHistoryList
          versions={versions}
          selectedVersionId={undefined}
          onVersionSelect={onVersionSelect}
        />
      );

      await user.click(screen.getByText(/버전 2/).closest('button')!);
      expect(onVersionSelect).toHaveBeenCalledWith('v-2');
    });
  });

  describe('ARCHIVED 스타일', () => {
    it('ARCHIVED 상태의 버전에 opacity 스타일을 적용한다', () => {
      const versions = [makeVersion({ id: 'v1', status: 'ARCHIVED' })];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      const button = screen.getByText(/버전 1/).closest('button');
      expect(button).toHaveClass('opacity-50');
    });

    it('DRAFT/FINAL 상태에는 opacity 스타일을 적용하지 않는다', () => {
      const versions = [
        makeVersion({ id: 'v1', status: 'DRAFT' }),
        makeVersion({ id: 'v2', status: 'FINAL', version_number: 2 }),
      ];
      render(<VersionHistoryList {...defaultProps} versions={versions} />);
      const draftButton = screen.getByText(/버전 1/).closest('button');
      const finalButton = screen.getByText(/버전 2/).closest('button');
      expect(draftButton).not.toHaveClass('opacity-50');
      expect(finalButton).not.toHaveClass('opacity-50');
    });
  });

  describe('FINAL 체크 아이콘', () => {
    it('FINAL 상태의 버전에 체크 아이콘 SVG가 렌더링된다', () => {
      const versions = [makeVersion({ id: 'v1', status: 'FINAL' })];
      const { container } = render(<VersionHistoryList {...defaultProps} versions={versions} />);
      // lucide-react의 CheckCircle은 svg로 렌더링됨
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });

    it('DRAFT 상태의 버전에는 체크 아이콘이 없다', () => {
      const versions = [makeVersion({ id: 'v1', status: 'DRAFT' })];
      const { container } = render(<VersionHistoryList {...defaultProps} versions={versions} />);
      // DRAFT에는 CheckCircle SVG가 없어야 함
      // 다만 RoadmapStatusBadge에는 SVG가 없으므로 SVG 개수 확인
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(0);
    });
  });
});
