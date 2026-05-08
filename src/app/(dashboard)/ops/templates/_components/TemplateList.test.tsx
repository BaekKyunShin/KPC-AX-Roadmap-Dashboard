import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import type { SelfAssessmentQuestion } from '@/types/database';
import TemplateList from './TemplateList';

// Radix UI는 jsdom에서 PointerEvent가 필요
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;
  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.button = props.button ?? 0;
    this.ctrlKey = props.ctrlKey ?? false;
    this.pointerType = props.pointerType ?? 'mouse';
  }
}
window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

function openDropdown(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
}

// =============================================================================
// 모킹
// =============================================================================

type SimpleResult = { success: true } | { success: false; error: string };
const mockSetActiveTemplate = vi.fn<() => Promise<SimpleResult>>().mockResolvedValue({ success: true });
const mockDuplicateTemplate = vi.fn<() => Promise<SimpleResult>>().mockResolvedValue({ success: true });
const mockDeleteTemplate = vi.fn<() => Promise<SimpleResult>>().mockResolvedValue({ success: true });

vi.mock('../actions', () => ({
  setActiveTemplate: (...args: unknown[]) => mockSetActiveTemplate(...args as []),
  duplicateTemplate: (...args: unknown[]) => mockDuplicateTemplate(...args as []),
  deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args as []),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeQuestion(id: string, order: number): SelfAssessmentQuestion {
  return {
    id,
    order,
    dimension: '데이터 활용',
    question_text: `테스트 질문 ${order}`,
    weight: 1,
  };
}

const activeTemplate = {
  id: 'tmpl-1',
  name: 'AX 진단 템플릿',
  description: 'AI 성숙도, 데이터/인프라',
  version: 1,
  is_active: true,
  questions: Array.from({ length: 30 }, (_, i) => makeQuestion(`q-${i}`, i + 1)),
  created_at: '2026-01-26T00:00:00Z',
  updated_at: '2026-01-26T00:00:00Z',
  created_by: 'user-1',
  usage_count: 10,
};

const inactiveUnusedTemplate = {
  id: 'tmpl-2',
  name: '제조업 AI 성숙도 진단 v2',
  description: '템플릿 테스트',
  version: 3,
  is_active: false,
  questions: [makeQuestion('q-1', 1)],
  created_at: '2026-02-13T00:00:00Z',
  updated_at: '2026-02-13T00:00:00Z',
  created_by: 'user-1',
  usage_count: 0,
};

const inactiveUsedTemplate = {
  id: 'tmpl-3',
  name: 'AX 진단 템플릿 (복사본)',
  description: undefined,
  version: 2,
  is_active: false,
  questions: Array.from({ length: 30 }, (_, i) => makeQuestion(`q-${i}`, i + 1)),
  created_at: '2026-02-12T00:00:00Z',
  updated_at: '2026-02-12T00:00:00Z',
  created_by: 'user-1',
  usage_count: 5,
};

const allTemplates = [inactiveUnusedTemplate, inactiveUsedTemplate, activeTemplate];

// =============================================================================
// Helpers
// =============================================================================

/**
 * 데스크톱 테이블 컨테이너를 반환한다.
 * 모바일 카드 뷰도 동시에 DOM에 렌더링되므로(jsdom은 CSS 미디어쿼리 미지원),
 * 쿼리 범위를 테이블로 제한하여 중복 요소 문제를 방지한다.
 */
function getTable() {
  return within(screen.getByRole('table'));
}

// =============================================================================
// 테스트
// =============================================================================

describe('TemplateList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('케밥 메뉴 렌더링', () => {
    it('각 행에 케밥 메뉴(⋮) 트리거 버튼이 있어야 한다', () => {
      render(<TemplateList templates={allTemplates} />);

      const menuTriggers = getTable().getAllByRole('button', { name: /더보기|작업 메뉴/i });
      expect(menuTriggers).toHaveLength(allTemplates.length);
    });

    it('인라인 "상세" 텍스트 버튼이 없어야 한다 (이름 링크로 대체)', () => {
      render(<TemplateList templates={allTemplates} />);

      // 테이블 내 "상세" 텍스트 링크/버튼이 없어야 함
      const detailButtons = screen.queryAllByRole('button', { name: '상세' });
      const detailLinks = screen.queryAllByRole('link', { name: '상세' });
      expect(detailButtons).toHaveLength(0);
      expect(detailLinks).toHaveLength(0);
    });

    it('템플릿 이름이 상세 페이지로의 링크여야 한다', () => {
      render(<TemplateList templates={[activeTemplate]} />);

      const nameLink = getTable().getByRole('link', { name: 'AX 진단 템플릿' });
      expect(nameLink).toHaveAttribute('href', '/ops/templates/tmpl-1');
    });
  });

  describe('비활성 + 미사용 템플릿 메뉴', () => {
    it('활성화, 복제, 삭제 메뉴 아이템이 모두 표시되어야 한다', async () => {
      render(<TemplateList templates={[inactiveUnusedTemplate]} />);

      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /활성화/ })).toBeInTheDocument();
      });
      expect(screen.getByRole('menuitem', { name: /복제/ })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /삭제/ })).toBeInTheDocument();
    });
  });

  describe('비활성 + 사용중 템플릿 메뉴', () => {
    it('활성화, 복제만 표시되고 삭제는 없어야 한다', async () => {
      render(<TemplateList templates={[inactiveUsedTemplate]} />);

      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /활성화/ })).toBeInTheDocument();
      });
      expect(screen.getByRole('menuitem', { name: /복제/ })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /삭제/ })).not.toBeInTheDocument();
    });
  });

  describe('활성 템플릿 메뉴', () => {
    it('복제만 표시되고 활성화와 삭제는 없어야 한다', async () => {
      render(<TemplateList templates={[activeTemplate]} />);

      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /복제/ })).toBeInTheDocument();
      });
      expect(screen.queryByRole('menuitem', { name: /활성화/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /삭제/ })).not.toBeInTheDocument();
    });
  });

  describe('빈 상태', () => {
    it('템플릿이 없을 때 빈 상태 메시지를 표시해야 한다', () => {
      render(<TemplateList templates={[]} />);

      expect(screen.getByText('등록된 템플릿이 없습니다')).toBeInTheDocument();
    });

    // #4 — 운영관리 빈 목록 EmptyState 통일
    it('templates 배열이 비었을 때 "등록된 템플릿이 없습니다" + 설명 + "새 템플릿 생성" 링크를 노출한다', () => {
      render(<TemplateList templates={[]} />);
      expect(screen.getByText('등록된 템플릿이 없습니다')).toBeInTheDocument();
      expect(screen.getByText('새 템플릿을 생성하여 시작하세요')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /새 템플릿 생성/ });
      expect(link).toHaveAttribute('href', '/ops/templates/new');
    });
  });

  describe('테이블 헤더', () => {
    it('작업 컬럼 헤더의 텍스트가 sr-only로 숨겨져 있어야 한다', () => {
      render(<TemplateList templates={allTemplates} />);

      const headers = screen.getAllByRole('columnheader');
      const lastHeader = headers[headers.length - 1];
      const srOnlySpan = lastHeader.querySelector('.sr-only');
      expect(srOnlySpan).toBeInTheDocument();
      expect(srOnlySpan?.textContent).toBe('작업');
    });
  });

  // =====================================================================
  // 추가: executeAction·handleSetActive·handleDuplicate·handleDelete 커버리지
  // =====================================================================

  describe('handleSetActive — 활성화 액션 (#2 H4·H5 — AlertDialog 통일)', () => {
    it('활성화 메뉴 클릭 → AlertDialog "활성화" 확인 후 setActiveTemplate 호출', async () => {
      mockSetActiveTemplate.mockResolvedValue({ success: true });

      render(<TemplateList templates={[inactiveUnusedTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /활성화/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /활성화/ }));

      // AlertDialog 노출 검증 + 다이얼로그 내 "활성화" 클릭
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText(/이 템플릿을 활성화하시겠습니까/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: '활성화' }));

      await waitFor(() => {
        expect(mockSetActiveTemplate).toHaveBeenCalledWith(inactiveUnusedTemplate.id);
      });
    });

    it('AlertDialog "취소" 클릭 시 setActiveTemplate가 호출되지 않는다', async () => {
      mockSetActiveTemplate.mockResolvedValue({ success: true });
      mockSetActiveTemplate.mockClear();

      render(<TemplateList templates={[inactiveUnusedTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /활성화/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /활성화/ }));

      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));

      expect(mockSetActiveTemplate).not.toHaveBeenCalled();
    });
  });

  describe('handleDuplicate — 복제 액션', () => {
    it('복제 메뉴 클릭 시 duplicateTemplate 호출', async () => {
      mockDuplicateTemplate.mockResolvedValue({ success: true });

      render(<TemplateList templates={[activeTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /복제/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /복제/ }));

      await waitFor(() => {
        expect(mockDuplicateTemplate).toHaveBeenCalledWith(activeTemplate.id);
      });
    });

    it('복제 실패 시 에러 메시지가 표시된다', async () => {
      mockDuplicateTemplate.mockResolvedValue({ success: false, error: '복제 서버 오류' });

      render(<TemplateList templates={[activeTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /복제/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /복제/ }));

      await waitFor(() => {
        expect(screen.getByText('복제 서버 오류')).toBeInTheDocument();
      });
    });
  });

  describe('handleDelete — 삭제 액션 (#2 H4·H5 — AlertDialog 통일)', () => {
    it('삭제 메뉴 클릭 → AlertDialog "삭제" 확인 후 deleteTemplate 호출', async () => {
      mockDeleteTemplate.mockResolvedValue({ success: true });

      render(<TemplateList templates={[inactiveUnusedTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /삭제/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /삭제/ }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText(/이 템플릿을 삭제하시겠습니까/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }));

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalledWith(inactiveUnusedTemplate.id);
      });
    });

    it('삭제 실패 시 에러 메시지가 표시된다', async () => {
      mockDeleteTemplate.mockResolvedValue({ success: false, error: '삭제 권한 없음' });

      render(<TemplateList templates={[inactiveUnusedTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /삭제/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /삭제/ }));

      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }));

      await waitFor(() => {
        expect(screen.getByText('삭제 권한 없음')).toBeInTheDocument();
      });
    });
  });

  describe('executeAction — 예외 처리', () => {
    it('action이 throw할 때 서버 통신 오류 메시지를 표시한다', async () => {
      mockDuplicateTemplate.mockRejectedValue(new Error('네트워크 에러'));

      render(<TemplateList templates={[activeTemplate]} />);
      const trigger = getTable().getByRole('button', { name: /더보기|작업 메뉴/i });
      openDropdown(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /복제/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('menuitem', { name: /복제/ }));

      await waitFor(() => {
        expect(screen.getByText('서버와 통신 중 오류가 발생했습니다.')).toBeInTheDocument();
      });
    });
  });
});
