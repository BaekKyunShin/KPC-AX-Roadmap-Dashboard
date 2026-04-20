import { describe, it, expect } from 'vitest';
import {
  projectDetailHref,
  opsProjectDetailHref,
  statusLabel,
  primaryActionLabel,
  opsPrimaryActionLabel,
  trackArtifactLabel,
  trackShortLabel,
  inferTrack,
} from './project-track';

describe('projectDetailHref', () => {
  it('ROADMAP 트랙 → /roadmap 경로', () => {
    expect(projectDetailHref('p-1', 'ROADMAP')).toBe('/consultant/projects/p-1/roadmap');
  });

  it('PBL 트랙 → /pbl 경로', () => {
    expect(projectDetailHref('p-1', 'PBL')).toBe('/consultant/projects/p-1/pbl');
  });
});

describe('opsProjectDetailHref', () => {
  it('ROADMAP 트랙 → /ops/.../roadmap', () => {
    expect(opsProjectDetailHref('p-1', 'ROADMAP')).toBe('/ops/projects/p-1/roadmap');
  });

  it('PBL 트랙 → /ops/.../pbl', () => {
    expect(opsProjectDetailHref('p-1', 'PBL')).toBe('/ops/projects/p-1/pbl');
  });
});

describe('statusLabel — 트랙 × 상태 전수', () => {
  const statuses = [
    'NEW',
    'DIAGNOSED',
    'MATCH_RECOMMENDED',
    'ASSIGNED',
    'INTERVIEWED',
    'ROADMAP_DRAFTED',
    'PBL_DRAFTED',
    'FINALIZED',
  ] as const;

  it('ROADMAP 트랙 기본 라벨', () => {
    expect(statusLabel('NEW', 'ROADMAP')).toBe('신규 등록 완료');
    expect(statusLabel('DIAGNOSED', 'ROADMAP')).toBe('진단결과 입력 완료');
    expect(statusLabel('MATCH_RECOMMENDED', 'ROADMAP')).toBe('진단결과 입력 완료');
    expect(statusLabel('ASSIGNED', 'ROADMAP')).toBe('컨설턴트 배정 완료');
    expect(statusLabel('INTERVIEWED', 'ROADMAP')).toBe('현장 인터뷰 완료');
    expect(statusLabel('ROADMAP_DRAFTED', 'ROADMAP')).toBe('로드맵 초안 완료');
    expect(statusLabel('PBL_DRAFTED', 'ROADMAP')).toBe('PBL 초안 완료');
    expect(statusLabel('FINALIZED', 'ROADMAP')).toBe('로드맵 최종 확정');
  });

  it('PBL 트랙 — FINALIZED 라벨만 분기', () => {
    expect(statusLabel('FINALIZED', 'PBL')).toBe('PBL 최종 확정');
    expect(statusLabel('PBL_DRAFTED', 'PBL')).toBe('PBL 초안 완료');
    expect(statusLabel('INTERVIEWED', 'PBL')).toBe('현장 인터뷰 완료');
  });

  it('모든 상태에 라벨이 정의됨', () => {
    for (const s of statuses) {
      expect(statusLabel(s, 'ROADMAP')).not.toBe('');
      expect(statusLabel(s, 'PBL')).not.toBe('');
    }
  });

  it('알 수 없는 상태는 문자열 그대로 반환', () => {
    expect(statusLabel('UNKNOWN', 'ROADMAP')).toBe('UNKNOWN');
  });
});

describe('primaryActionLabel', () => {
  it('ROADMAP INTERVIEWED → 로드맵 생성', () => {
    expect(primaryActionLabel('INTERVIEWED', 'ROADMAP')).toBe('로드맵 생성');
  });

  it('PBL INTERVIEWED → PBL 보고서 생성', () => {
    expect(primaryActionLabel('INTERVIEWED', 'PBL')).toBe('PBL 보고서 생성');
  });

  it('ROADMAP FINALIZED → 로드맵 보기', () => {
    expect(primaryActionLabel('FINALIZED', 'ROADMAP')).toBe('로드맵 보기');
  });

  it('PBL FINALIZED → PBL 보고서 보기', () => {
    expect(primaryActionLabel('FINALIZED', 'PBL')).toBe('PBL 보고서 보기');
  });

  it('ROADMAP_DRAFTED → 로드맵 편집', () => {
    expect(primaryActionLabel('ROADMAP_DRAFTED', 'ROADMAP')).toBe('로드맵 편집');
  });

  it('PBL_DRAFTED → PBL 보고서 편집', () => {
    expect(primaryActionLabel('PBL_DRAFTED', 'PBL')).toBe('PBL 보고서 편집');
  });
});

describe('opsPrimaryActionLabel', () => {
  it('ROADMAP FINALIZED → AI 교육 로드맵 보기', () => {
    expect(opsPrimaryActionLabel('FINALIZED', 'ROADMAP')).toBe('AI 교육 로드맵 보기');
  });

  it('PBL FINALIZED → PBL 보고서 보기', () => {
    expect(opsPrimaryActionLabel('FINALIZED', 'PBL')).toBe('PBL 보고서 보기');
  });
});

describe('trackArtifactLabel / trackShortLabel', () => {
  it('artifact label', () => {
    expect(trackArtifactLabel('ROADMAP')).toBe('AI 훈련로드맵');
    expect(trackArtifactLabel('PBL')).toBe('PBL 보고서');
  });

  it('short label', () => {
    expect(trackShortLabel('ROADMAP')).toBe('로드맵');
    expect(trackShortLabel('PBL')).toBe('PBL');
  });
});

describe('inferTrack', () => {
  it('"PBL" → PBL', () => {
    expect(inferTrack('PBL')).toBe('PBL');
  });
  it('"ROADMAP" → ROADMAP', () => {
    expect(inferTrack('ROADMAP')).toBe('ROADMAP');
  });
  it('null → ROADMAP (기본값)', () => {
    expect(inferTrack(null)).toBe('ROADMAP');
  });
  it('undefined → ROADMAP (기본값)', () => {
    expect(inferTrack(undefined)).toBe('ROADMAP');
  });
  it('unknown → ROADMAP (기본값)', () => {
    expect(inferTrack('FOO')).toBe('ROADMAP');
  });
});
