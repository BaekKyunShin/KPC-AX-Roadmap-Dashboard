/**
 * gallery-utils.ts 테스트
 *
 * extractTags:
 *   - 업종 + 토픽 → 최대 3개 태그
 *   - 업종 슬래시 분리 ("의료/헬스케어" → "의료")
 *   - 업종 빈 문자열 → 태그에 포함 안 됨
 *   - 과정 없음 → 업종만 반환
 *   - 2~6자 한국어 단어만 추출
 *   - 불용어("기초","개론","활용","이해","실습","실전","입문","기반") 필터링
 *   - 빈도순 정렬 (높은 것 우선)
 *   - 중복 제거 (업종과 토픽 키워드 겹침 방지)
 *   - 특수문자(괄호, 슬래시 등) 분리
 *   - 1자 또는 7자 이상 단어 제외
 *   - 영문/숫자 단어 제외
 */

import { describe, it, expect } from 'vitest';
import { extractTags } from './gallery-utils';

describe('extractTags', () => {
  it('업종 + 토픽 → 최대 3개 태그 반환', () => {
    const tags = extractTags('제조', [
      { topic: '머신러닝 데이터분석 자연어처리 컴퓨터비전' },
    ]);

    expect(tags.length).toBeLessThanOrEqual(3);
    expect(tags[0]).toBe('제조');
  });

  it('업종 슬래시 분리 — "의료/헬스케어" → "의료"', () => {
    const tags = extractTags('의료/헬스케어', []);

    expect(tags).toEqual(['의료']);
  });

  it('업종 빈 문자열 → 태그에 포함되지 않음', () => {
    const tags = extractTags('', [
      { topic: '머신러닝 데이터분석' },
    ]);

    expect(tags).not.toContain('');
    expect(tags[0]).toBe('머신러닝');
  });

  it('과정 없음(빈 배열) → 업종만 반환', () => {
    const tags = extractTags('금융', []);

    expect(tags).toEqual(['금융']);
  });

  it('2~6자 한국어 단어만 추출 — 1자, 7자 이상 제외', () => {
    const tags = extractTags('', [
      // "AI" → 영문 제외, "일" → 1자 제외, "인공지능기반시스템" → 7자 이상 제외
      { topic: 'AI 일 인공지능기반시스템 딥러닝' },
    ]);

    expect(tags).toEqual(['딥러닝']);
  });

  it('불용어 필터링 — "기초","활용","실습" 등 제외', () => {
    const tags = extractTags('', [
      { topic: '기초 개론 활용 이해 실습 실전 입문 기반 딥러닝' },
    ]);

    expect(tags).toEqual(['딥러닝']);
    expect(tags).not.toContain('기초');
    expect(tags).not.toContain('활용');
  });

  it('빈도순 정렬 — 더 자주 나오는 키워드가 먼저', () => {
    const tags = extractTags('', [
      { topic: '머신러닝 데이터분석' },
      { topic: '머신러닝 자연어처리' },
      { topic: '머신러닝 데이터분석' },
    ]);

    // 머신러닝 3회, 데이터분석 2회, 자연어처리 1회
    expect(tags[0]).toBe('머신러닝');
    expect(tags[1]).toBe('데이터분석');
    expect(tags[2]).toBe('자연어처리');
  });

  it('중복 제거 — 업종과 토픽 키워드가 같으면 한 번만', () => {
    const tags = extractTags('제조', [
      { topic: '제조 자동화 품질관리' },
    ]);

    const countOfJejo = tags.filter((t) => t === '제조').length;
    expect(countOfJejo).toBe(1);
  });

  it('특수문자(괄호) 분리 — "(딥러닝)" → "딥러닝"', () => {
    const tags = extractTags('', [
      { topic: '(딥러닝) 자연어처리' },
    ]);

    expect(tags).toContain('딥러닝');
  });

  it('특수문자(슬래시, 쉼표, 플러스, 가운뎃점) 분리', () => {
    const tags = extractTags('', [
      { topic: '머신러닝/딥러닝,자연어처리+컴퓨터비전·데이터분석' },
    ]);

    // 모두 개별 단어로 분리되어 추출됨
    expect(tags).toContain('머신러닝');
  });

  it('영문/숫자 전용 단어 제외', () => {
    const tags = extractTags('', [
      { topic: 'Python TensorFlow 2024 딥러닝' },
    ]);

    expect(tags).toEqual(['딥러닝']);
    expect(tags).not.toContain('Python');
    expect(tags).not.toContain('2024');
  });

  it('topic이 undefined인 과정은 무시', () => {
    const tags = extractTags('제조', [
      { topic: undefined },
      { topic: '머신러닝' },
    ]);

    expect(tags).toEqual(['제조', '머신러닝']);
  });

  it('최대 3개 제한 — 업종 포함 시 토픽은 최대 2개', () => {
    const tags = extractTags('금융', [
      { topic: '머신러닝 데이터분석 자연어처리 컴퓨터비전' },
    ]);

    expect(tags).toHaveLength(3);
    expect(tags[0]).toBe('금융');
  });
});
