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

// 4섹션 컴포넌트 모킹
vi.mock('@/components/roadmap/CompetencyModelingTable', () => ({
  CompetencyModelingTable: () => (
    <div data-testid="competency-modeling-table">역량 모델링 컴포넌트</div>
  ),
}));

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: () => <div data-testid="roadmap-matrix">훈련체계도 컴포넌트</div>,
}));

vi.mock('@/components/roadmap/AnnualTrainingPlanTable', () => ({
  AnnualTrainingPlanTable: () => (
    <div data-testid="annual-plan">연간 훈련계획 컴포넌트</div>
  ),
}));

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: () => <div data-testid="courses-list">훈련과정 명세서 컴포넌트</div>,
}));

// demo-sample 데이터 모킹
vi.mock('@/lib/data/demo-sample', () => ({
  SAMPLE_ROADMAP_RESULT: {
    diagnosis_summary: '샘플 진단 요약',
    competencies: [],
    training_structure: [],
    annual_plan: { items: [], usage_plan: '' },
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
        screen.getByText(/산인공 공식 양식에 맞춘 기업 맞춤형 교육 로드맵/),
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
  // 2. 4개 탭(슬라이드) 렌더링
  // --------------------------------------------------------------------------
  describe('슬라이드 네비게이션 탭 렌더링', () => {
    it('4개의 슬라이드 탭 라벨이 모두 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getAllByText('역량 모델링').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('훈련체계도').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('연간 훈련계획').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('훈련과정 명세서').length).toBeGreaterThanOrEqual(1);
    });

    it('슬라이드 카운터가 초기에 "1 / 4"을 표시한다', () => {
      render(<DemoSection />);
      expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });

    it('이전/다음 슬라이드 화살표 버튼이 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getByRole('button', { name: '이전 슬라이드' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다음 슬라이드' })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 탭 클릭 시 콘텐츠 전환
  // --------------------------------------------------------------------------
  describe('탭 클릭 시 콘텐츠 전환', () => {
    it('첫 번째 슬라이드(역량 모델링)가 초기에 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });

    it('"훈련체계도" 탭 클릭 시 슬라이드 카운터가 "2 / 4"으로 변경된다', () => {
      render(<DemoSection />);
      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('훈련체계도'),
      );
      fireEvent.click(tabButtons[0]);
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('"연간 훈련계획" 탭 클릭 시 슬라이드 카운터가 "3 / 4"으로 변경된다', () => {
      render(<DemoSection />);
      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('연간 훈련계획'),
      );
      fireEvent.click(tabButtons[0]);
      expect(screen.getByText('3 / 4')).toBeInTheDocument();
    });

    it('"훈련과정 명세서" 탭 클릭 시 슬라이드 카운터가 "4 / 4"으로 변경된다', () => {
      render(<DemoSection />);
      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('훈련과정 명세서'),
      );
      fireEvent.click(tabButtons[0]);
      expect(screen.getByText('4 / 4')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 화살표 네비게이션
  // --------------------------------------------------------------------------
  describe('화살표 네비게이션', () => {
    it('다음 슬라이드 버튼 클릭 시 슬라이드가 진행된다', () => {
      render(<DemoSection />);
      expect(screen.getByText('1 / 4')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('이전 슬라이드 버튼 클릭 시 슬라이드가 역방향으로 이동한다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '이전 슬라이드' }));
      expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });

    it('첫 번째 슬라이드에서 이전 버튼 클릭 시 마지막 슬라이드로 순환한다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '이전 슬라이드' }));
      expect(screen.getByText('4 / 4')).toBeInTheDocument();
    });

    it('마지막 슬라이드에서 다음 버튼 클릭 시 첫 번째 슬라이드로 순환한다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('4 / 4')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 5. 마우스 호버 시 자동재생 일시정지
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
          await vi.advanceTimersByTimeAsync(6000);
        });

        expect(screen.getByText('1 / 4')).toBeInTheDocument();
      }

      teardownFakeTimers();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Description Bar
  // --------------------------------------------------------------------------
  describe('Description Bar', () => {
    it('첫 번째 슬라이드 설명을 표시한다', () => {
      render(<DemoSection />);
      expect(
        screen.getAllByText(/NCS 기반 역량 모델링/).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('탭 클릭 시 해당 슬라이드 설명으로 업데이트된다', () => {
      render(<DemoSection />);
      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('훈련과정 명세서'),
      );
      fireEvent.click(tabButtons[0]);
      expect(
        screen.getAllByText(/훈련과정별 상세 명세서/).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('현재 슬라이드 라벨 뱃지가 표시된다', () => {
      render(<DemoSection />);
      const labels = screen.getAllByText('역량 모델링');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
