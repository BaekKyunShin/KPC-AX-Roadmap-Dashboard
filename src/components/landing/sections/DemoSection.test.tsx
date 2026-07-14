import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// 모킹 (vi.mock은 파일 최상단 호이스팅)
// ============================================================================

// matchMedia 모킹
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// GSAP 동적 import 모킹
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn() },
}));

// Next.js Link 모킹
import '@/test/helpers/mock-next-link';

// v2 로드맵 Ⅲ장 — 훈련과정 명세서 단일 컴포넌트
vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: () => <div data-testid="courses-list">훈련과정 명세서 컴포넌트</div>,
}));

// demo-sample 데이터 모킹 (v2 구조)
vi.mock('@/lib/data/demo-sample', () => ({
  SAMPLE_ROADMAP_RESULT: {
    diagnosis_summary: '샘플 진단 요약',
    setup_necessity: '샘플 수립 배경',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks: '샘플 과업',
      main_content: '샘플 주요 내용',
    },
    course_specs: [],
  },
}));

// ============================================================================
// 테스트 대상 import
// ============================================================================

import DemoSection from './DemoSection';

// ============================================================================
// 헬퍼: 가짜 타이머
// ============================================================================

function setupFakeTimers() {
  vi.useFakeTimers();
}

function teardownFakeTimers() {
  vi.useRealTimers();
}

// ============================================================================
// 테스트
// ============================================================================

describe('DemoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('섹션 제목 "직접 경험해보세요"를 표시한다', () => {
      render(<DemoSection />);
      expect(screen.getByRole('heading', { name: /직접 경험해보세요/ })).toBeInTheDocument();
    });

    it('"제품 데모" 뱃지를 표시한다', () => {
      render(<DemoSection />);
      expect(screen.getByText('제품 데모')).toBeInTheDocument();
    });

    it('섹션 설명 텍스트를 표시한다', () => {
      render(<DemoSection />);
      expect(
        screen.getByText(/산인공 공식 양식에 맞춘 기업 맞춤형 교육 로드맵/)
      ).toBeInTheDocument();
    });

    it('section 요소에 id="demo"가 있다', () => {
      render(<DemoSection />);
      expect(document.getElementById('demo')).toBeInTheDocument();
    });

    it('"샘플 데모 보기" 링크를 표시한다', () => {
      render(<DemoSection />);
      const link = screen.getByRole('link', { name: /샘플 데모 보기/ });
      expect(link).toHaveAttribute('href', '/demo');
    });

    it('"무료로 시작하기" 링크를 표시한다', () => {
      render(<DemoSection />);
      const link = screen.getByRole('link', { name: /무료로 시작하기/ });
      expect(link).toHaveAttribute('href', '/register');
    });

    it('브라우저 주소창에 데모 URL이 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getByText('kpc-ax-roadmap-dashboard.vercel.app')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 슬라이드 렌더링 (v2: 훈련과정 명세서 1개 — 양식 개정으로 Ⅲ장 4섹션 → 1섹션)
  // --------------------------------------------------------------------------
  describe('슬라이드 네비게이션 탭 렌더링', () => {
    it('"훈련과정 명세서" 슬라이드 탭 라벨이 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getAllByText('훈련과정 명세서').length).toBeGreaterThanOrEqual(1);
    });

    it('삭제된 v1 탭 라벨(역량 모델링·훈련체계도·연간 훈련계획)은 표시되지 않는다', () => {
      render(<DemoSection />);
      expect(screen.queryByText('역량 모델링')).not.toBeInTheDocument();
      expect(screen.queryByText('훈련체계도')).not.toBeInTheDocument();
      expect(screen.queryByText('연간 훈련계획')).not.toBeInTheDocument();
    });

    it('슬라이드 카운터가 "1 / 1"을 표시한다', () => {
      render(<DemoSection />);
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    it('CoursesList 콘텐츠가 렌더링된다', () => {
      render(<DemoSection />);
      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
    });

    it('이전/다음 슬라이드 화살표 버튼이 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getByRole('button', { name: '이전 슬라이드' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다음 슬라이드' })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 화살표 네비게이션 (슬라이드 1개 → 순환해도 항상 "1 / 1")
  // --------------------------------------------------------------------------
  describe('화살표 네비게이션', () => {
    it('다음 슬라이드 버튼 클릭 시 단일 슬라이드로 순환한다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    it('이전 슬라이드 버튼 클릭 시 단일 슬라이드로 순환한다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '이전 슬라이드' }));
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 명시적 일시정지 토글 버튼 (#008)
  // --------------------------------------------------------------------------
  describe('#008 — 일시정지 토글 버튼', () => {
    it('초기에는 "자동 전환 일시정지" 라벨의 버튼이 노출된다', () => {
      render(<DemoSection />);
      expect(screen.getByRole('button', { name: '자동 전환 일시정지' })).toBeInTheDocument();
    });

    it('일시정지 버튼 클릭 시 라벨이 "자동 전환 재생"으로 변경된다', () => {
      render(<DemoSection />);
      const pauseBtn = screen.getByRole('button', { name: '자동 전환 일시정지' });
      fireEvent.click(pauseBtn);
      expect(screen.getByRole('button', { name: '자동 전환 재생' })).toBeInTheDocument();
    });

    it('일시정지 → 재생 토글 시 다시 "자동 전환 일시정지" 라벨로 돌아온다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '자동 전환 일시정지' }));
      fireEvent.click(screen.getByRole('button', { name: '자동 전환 재생' }));
      expect(screen.getByRole('button', { name: '자동 전환 일시정지' })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4b. 마우스 호버 시 자동재생 일시정지
  // --------------------------------------------------------------------------
  describe('마우스 호버 일시정지', () => {
    it('mockup 컨테이너에 마우스 진입 시 자동재생이 일시정지된다', async () => {
      setupFakeTimers();
      render(<DemoSection />);

      const mockupContainers = document.querySelectorAll('.max-w-5xl');
      const mockupContainer = mockupContainers[0] as HTMLElement;

      if (mockupContainer) {
        fireEvent.mouseEnter(mockupContainer);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(10000);
        });

        expect(screen.getByText('1 / 1')).toBeInTheDocument();
      }

      teardownFakeTimers();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Description Bar
  // --------------------------------------------------------------------------
  describe('Description Bar', () => {
    it('훈련과정 명세서 슬라이드 설명을 표시한다', () => {
      render(<DemoSection />);
      expect(screen.getAllByText(/훈련과정 명세서 6종/).length).toBeGreaterThanOrEqual(1);
    });

    it('현재 슬라이드 라벨 뱃지가 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getAllByText('훈련과정 명세서').length).toBeGreaterThanOrEqual(1);
    });
  });
});
