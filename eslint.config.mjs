import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // _prefix 변수를 허용 (destructuring rest 패턴 등)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      // 프로덕션에서 console.log 누출 방지 (warn/error만 허용)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // E2E 테스트 파일: 성능 메트릭 리포팅용 console.log 허용
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // 계층 경계: 기반 계층(src/lib)은 상위 계층(app 라우트·components·hooks)을 import 할 수 없다 (P7)
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**'],
              message:
                '기반 계층(src/lib)은 app 라우트를 import 할 수 없습니다. 라우트 전용 코드는 해당 라우트의 _components 로 옮기고, 공용 로직은 lib 안에서 해결하세요.',
            },
            {
              group: ['@/components/**', '@/hooks/**'],
              message:
                '기반 계층(src/lib)은 공용 UI 계층(components·hooks)을 import 할 수 없습니다. 공유 상수·유틸은 src/lib 으로 내리세요.',
            },
          ],
        },
      ],
    },
  },
  // lib 테스트 파일은 검증 대상 참조를 위해 예외.
  // (auth-order-verification.test.ts 의 동적 await import('@/app/...') 는
  //  정적 import 규칙에 애초에 걸리지 않지만, 의도를 명시해 파일 단위로 제외해 둔다.)
  {
    files: ['src/lib/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // 계층 경계: 공용 계층(src/components·src/hooks)은 app 라우트를 import 할 수 없다 (P7)
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**'],
              message:
                '공용 계층(src/components·src/hooks)은 app 라우트를 import 할 수 없습니다. 단일 라우트 전용 컴포넌트는 해당 라우트의 _components 로 옮기고, 여러 라우트가 공유하면 action 을 prop 으로 주입받게 하세요.',
            },
          ],
        },
      ],
    },
  },
  // 기존 위반 2파일 예외 — P7 단계 5(공유 컴포넌트 의존성 역전)가 진행되는 만큼 이 목록은 줄어든다.
  // 신규 파일을 여기에 추가하지 말 것: 예외는 가드 도입 시점의 기존 부채 동결 목적이다.
  // (components 하위 테스트의 vi.mock('@/app/...') 은 정적 import 규칙에 걸리지 않아 예외 불필요)
  {
    files: [
      'src/components/consultant/ProfileForm.tsx',
      'src/components/notices/AttachmentList.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 생성 파일
    'coverage/**',
    // Reference files (외부 라이브러리 등 참조용 파일)
    '_reference/**',
    // Git worktree 빌드 아티팩트
    '.worktrees/**',
    // Playwright 리포트 (로컬 생성 파일)
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
