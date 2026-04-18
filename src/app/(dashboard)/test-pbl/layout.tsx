/**
 * 테스트 PBL 라우트의 maxDuration 설정 (test-roadmap과 동일 패턴)
 * LLM 호출 4분 + 후처리 여유 1분.
 */
export const maxDuration = 300;

export default function TestPBLLayout({ children }: { children: React.ReactNode }) {
  return children;
}
