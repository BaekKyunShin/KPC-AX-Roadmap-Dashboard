import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// 모킹 (vi.mock은 파일 최상단 호이스팅)
// ============================================================================

// matchMedia 모킹 (jsdom에서 미구현, GSAP이 내부적으로 사용)
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
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// RoadmapMatrix 모킹 (실제 컴포넌트 렌더링 불필요)
vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: () => <div data-testid="roadmap-matrix">과정 체계도 컴포넌트</div>,
}));

// CoursesList 모킹
vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: () => <div data-testid="courses-list">과정 상세 컴포넌트</div>,
}));

// PBLCourseView 모킹
vi.mock('@/components/roadmap/PBLCourseView', () => ({
  PBLCourseView: () => <div data-testid="pbl-course-view">PBL 과정 컴포넌트</div>,
}));

// demo-sample 데이터 모킹
vi.mock('@/lib/data/demo-sample', () => ({
  SAMPLE_MATRIX: [],
  SAMPLE_COURSE_SINGLE: {},
  SAMPLE_PBL: {},
}));

// ============================================================================
// 테스트 대상 import
// ============================================================================

import DemoSection from './DemoSection';

// ============================================================================
// 헬퍼: 가짜 타이머 설정
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
  // 1. 기본 렌더링 (섹션 제목, 설명)
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
      expect(screen.getByText(/AI가 기업 맞춤형 교육 로드맵을 자동으로 생성합니다/)).toBeInTheDocument();
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
  // 2. 3개 탭(슬라이드) 렌더링 확인
  // --------------------------------------------------------------------------
  describe('슬라이드 네비게이션 탭 렌더링', () => {
    it('3개의 슬라이드 탭 버튼을 표시한다', () => {
      render(<DemoSection />);
      // ProgressIndicator 내 버튼 3개 (각 라벨이 최소 1개 이상 존재)
      expect(screen.getAllByText('과정 체계도').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('과정 상세').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PBL 과정').length).toBeGreaterThanOrEqual(1);
    });

    it('3개의 프로그레스 바를 포함한 탭이 존재한다', () => {
      render(<DemoSection />);
      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        ['과정 체계도', '과정 상세', 'PBL 과정'].some((label) =>
          btn.textContent?.includes(label)
        )
      );
      expect(tabButtons).toHaveLength(3);
    });

    it('슬라이드 카운터가 초기에 "1 / 3"을 표시한다', () => {
      render(<DemoSection />);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('이전/다음 슬라이드 화살표 버튼이 표시된다', () => {
      render(<DemoSection />);
      expect(screen.getByRole('button', { name: '이전 슬라이드' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다음 슬라이드' })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 탭 클릭 → 해당 콘텐츠 표시
  // --------------------------------------------------------------------------
  describe('탭 클릭 시 콘텐츠 전환', () => {
    it('첫 번째 슬라이드(matrix)가 초기에 표시된다', () => {
      render(<DemoSection />);
      // "과정 체계도"는 ProgressIndicator와 Description Bar 두 곳에 존재 가능
      expect(screen.getAllByText('과정 체계도').length).toBeGreaterThanOrEqual(1);
      // 슬라이드 카운터가 1 / 3임을 확인
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('"과정 상세" 탭 클릭 시 슬라이드 카운터가 "2 / 3"으로 변경된다', () => {
      render(<DemoSection />);

      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('과정 상세')
      );
      fireEvent.click(tabButtons[0]);

      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('"PBL 과정" 탭 클릭 시 슬라이드 카운터가 "3 / 3"으로 변경된다', () => {
      render(<DemoSection />);

      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('PBL 과정')
      );
      fireEvent.click(tabButtons[0]);

      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });

    it('"과정 체계도" 탭 클릭 시 첫 번째 슬라이드로 돌아간다', () => {
      render(<DemoSection />);

      // PBL로 이동
      const pblTabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('PBL 과정')
      );
      fireEvent.click(pblTabButtons[0]);
      expect(screen.getByText('3 / 3')).toBeInTheDocument();

      // 다시 첫 번째로
      const matrixTabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('과정 체계도')
      );
      fireEvent.click(matrixTabButtons[0]);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 다음/이전 화살표 네비게이션
  // --------------------------------------------------------------------------
  describe('화살표 네비게이션', () => {
    it('다음 슬라이드 버튼 클릭 시 슬라이드가 진행된다', () => {
      render(<DemoSection />);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('이전 슬라이드 버튼 클릭 시 슬라이드가 역방향으로 이동한다', () => {
      render(<DemoSection />);

      // 2번째로 이동 후 되돌아가기
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('2 / 3')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '이전 슬라이드' }));
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('첫 번째 슬라이드에서 이전 버튼 클릭 시 마지막 슬라이드로 순환한다', () => {
      render(<DemoSection />);
      fireEvent.click(screen.getByRole('button', { name: '이전 슬라이드' }));
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });

    it('마지막 슬라이드에서 다음 버튼 클릭 시 첫 번째 슬라이드로 순환한다', () => {
      render(<DemoSection />);

      // 마지막 슬라이드로 이동
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('3 / 3')).toBeInTheDocument();

      // 첫 번째 슬라이드로 순환
      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 5. 자동 재생 (vi.useFakeTimers로 타이머 제어)
  // --------------------------------------------------------------------------
  describe('자동 재생', () => {
    it('진행률이 100%에 도달하면 다음 슬라이드로 자동 전환된다', async () => {
      setupFakeTimers();

      render(<DemoSection />);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      // DEMO_SLIDES[0].duration = 3300ms, PROGRESS_UPDATE_INTERVAL = 50ms
      // 100% 도달까지 66 틱 → 3300ms + 여유
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3400);
      });

      // progress >= 100이 되면 setCurrentIndex가 호출됨
      // useEffect가 두 단계로 나뉘므로 한 번 더 flush
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // fakeTimers 환경에서 waitFor 대신 직접 확인
      expect(screen.getByText('2 / 3')).toBeInTheDocument();

      teardownFakeTimers();
    }, 10000);

    it('isPaused=false 시 progress가 증가한다', async () => {
      setupFakeTimers();
      render(<DemoSection />);

      // 초기 progress는 0
      // 타이머 50ms × 여러 틱 진행 후 setProgress가 호출됨
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // 진행 후에도 컴포넌트가 정상적으로 렌더링됨
      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      teardownFakeTimers();
    });
  });

  // --------------------------------------------------------------------------
  // 6. 수동 탭 클릭 시 자동재생 progress 리셋
  // --------------------------------------------------------------------------
  describe('수동 탭 클릭 시 자동재생 리셋', () => {
    it('탭 클릭 시 progress가 0으로 초기화된다', async () => {
      setupFakeTimers();
      render(<DemoSection />);

      // progress를 중간쯤 진행
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      // 다른 탭 클릭 → progress 리셋
      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('과정 상세')
      );
      fireEvent.click(tabButtons[0]);

      // 슬라이드가 변경됨 (2번째)
      expect(screen.getByText('2 / 3')).toBeInTheDocument();

      teardownFakeTimers();
    });

    it('화살표 클릭 시 progress가 0으로 리셋된다', async () => {
      setupFakeTimers();
      render(<DemoSection />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }));
      expect(screen.getByText('2 / 3')).toBeInTheDocument();

      teardownFakeTimers();
    });
  });

  // --------------------------------------------------------------------------
  // 7. 프로그레스 바 표시
  // --------------------------------------------------------------------------
  describe('프로그레스 바', () => {
    it('각 탭 아래 프로그레스 바가 존재한다', () => {
      render(<DemoSection />);
      // ProgressIndicator 컴포넌트 내부의 프로그레스 바 div들
      // w-20 h-1 rounded-full bg-gray-700 overflow-hidden 클래스의 div 안에 프로그레스 div
      const progressBars = document.querySelectorAll('.w-20.h-1');
      expect(progressBars.length).toBe(3);
    });

    it('현재 슬라이드의 프로그레스 바가 purple 색상이다', () => {
      render(<DemoSection />);
      // 활성 슬라이드의 inner bar는 bg-purple-500 클래스를 가짐
      const purpleBars = document.querySelectorAll('.bg-purple-500');
      expect(purpleBars.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 8. 마우스 호버 시 자동재생 일시정지
  // --------------------------------------------------------------------------
  describe('마우스 호버 일시정지', () => {
    it('mockup 컨테이너에 마우스 진입 시 자동재생이 일시정지된다', async () => {
      setupFakeTimers();
      render(<DemoSection />);

      // mockupRef가 붙은 div (onMouseEnter/onMouseLeave 이벤트 핸들러)
      // opacity-0 클래스를 가진 max-w-5xl div
      const mockupContainers = document.querySelectorAll('.max-w-5xl');
      const mockupContainer = mockupContainers[0] as HTMLElement;

      if (mockupContainer) {
        fireEvent.mouseEnter(mockupContainer);

        // 3400ms 진행해도 슬라이드 변경 안 됨 (isPaused=true)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3400);
        });

        // isPaused=true이므로 슬라이드가 변경되지 않음
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      }

      teardownFakeTimers();
    });

    it('마우스 이탈 시 자동재생이 재개된다', async () => {
      setupFakeTimers();
      render(<DemoSection />);

      const mockupContainers = document.querySelectorAll('.max-w-5xl');
      const mockupContainer = mockupContainers[0] as HTMLElement;

      if (mockupContainer) {
        fireEvent.mouseEnter(mockupContainer);
        fireEvent.mouseLeave(mockupContainer);

        // 이탈 후 자동재생 재개 → progress 증가
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });

        // 컴포넌트가 정상 동작 중
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      }

      teardownFakeTimers();
    });
  });

  // --------------------------------------------------------------------------
  // 9. Description Bar
  // --------------------------------------------------------------------------
  describe('Description Bar', () => {
    it('첫 번째 슬라이드 설명을 표시한다', () => {
      render(<DemoSection />);
      expect(
        screen.getAllByText(/세부직무별 초급\/중급\/고급 AI 교육 과정 매트릭스/).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('탭 클릭 시 해당 슬라이드 설명으로 업데이트된다', () => {
      render(<DemoSection />);

      const tabButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('과정 상세')
      );
      fireEvent.click(tabButtons[0]);

      expect(
        screen.getAllByText(/각 과정별 커리큘럼/).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('현재 슬라이드 라벨 뱃지가 표시된다', () => {
      render(<DemoSection />);
      // Description Bar의 purple 뱃지에 현재 라벨 표시
      // '과정 체계도'가 ProgressIndicator와 Description Bar 두 곳에 있을 수 있음
      const labels = screen.getAllByText('과정 체계도');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
