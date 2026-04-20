/**
 * 로드맵 테스트 라우트의 maxDuration 설정
 * Vercel 배포 시 Server Action 타임아웃을 5분으로 확장
 * (LLM 호출 4분 + 후처리 여유 1분)
 */
export const maxDuration = 300;

export default function TestRoadmapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
