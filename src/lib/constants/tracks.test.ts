import { describe, it, expect } from 'vitest';
import { PROJECT_TRACKS, TRACK_LABELS, TRACK_BADGE_COLORS } from './tracks';

describe('tracks constants', () => {
  it('ROADMAP과 PBL 두 트랙만 존재한다', () => {
    expect(PROJECT_TRACKS).toEqual(['ROADMAP', 'PBL']);
  });

  it('모든 트랙이 레이블을 가진다', () => {
    for (const t of PROJECT_TRACKS) {
      expect(TRACK_LABELS[t]).toBeTruthy();
    }
  });

  it('모든 트랙이 뱃지 색상 클래스를 가진다', () => {
    for (const t of PROJECT_TRACKS) {
      expect(TRACK_BADGE_COLORS[t]).toBeTruthy();
    }
  });

  it('ROADMAP 레이블은 AI 훈련로드맵이다', () => {
    expect(TRACK_LABELS.ROADMAP).toBe('AI 훈련로드맵');
  });

  it('PBL 레이블은 문제해결형(PBL) AI+직무 훈련과정이다', () => {
    expect(TRACK_LABELS.PBL).toBe('문제해결형(PBL) AI+직무 훈련과정');
  });
});
