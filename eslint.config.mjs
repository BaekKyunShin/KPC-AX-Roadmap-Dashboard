import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // _prefix 변수를 허용 (destructuring rest 패턴 등)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      // 프로덕션에서 console.log 누출 방지 (warn/error만 허용)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 생성 파일
    "coverage/**",
    // Reference files (외부 라이브러리 등 참조용 파일)
    "_reference/**",
  ]),
]);

export default eslintConfig;
