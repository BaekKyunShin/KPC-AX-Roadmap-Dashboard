import { describe, expect, it } from 'vitest';

import {
  DETAIL_BULLET,
  bulletize,
  bulletizeDetails,
  bulletizeText,
  parseBullets,
  splitByUnit,
} from './list-format';

describe('bulletize', () => {
  it('항목이 없으면 빈 문자열', () => {
    expect(bulletize([])).toBe('');
    expect(bulletize(null)).toBe('');
    expect(bulletize(undefined)).toBe('');
  });

  it('항목마다 `• ` 머리기호 + 줄바꿈으로 결합', () => {
    expect(bulletize(['AI 기초', 'ML 이해', '도구 활용'])).toBe(
      '• AI 기초\n• ML 이해\n• 도구 활용'
    );
  });

  it('공백·빈 문자열 항목 제거', () => {
    expect(bulletize(['AI', '', '  ', 'ML'])).toBe('• AI\n• ML');
  });

  it('커스텀 머리기호 지원', () => {
    expect(bulletize(['a', 'b'], '· ')).toBe('· a\n· b');
  });
});

describe('splitByUnit', () => {
  it('빈 값은 빈 문자열', () => {
    expect(splitByUnit('')).toBe('');
    expect(splitByUnit(null)).toBe('');
    expect(splitByUnit(undefined)).toBe('');
  });

  it('단일 단원 문자열은 그대로 trim', () => {
    expect(splitByUnit('1단원: AI 개요')).toBe('1단원: AI 개요');
  });

  it('쉼표 구분 여러 단원은 단원 앞에 줄바꿈 삽입', () => {
    expect(splitByUnit('1단원: AI 개요, 2단원: 프롬프트 작성, 3단원: 실습')).toBe(
      '1단원: AI 개요\n2단원: 프롬프트 작성\n3단원: 실습'
    );
  });

  it('공백 구분도 처리', () => {
    expect(splitByUnit('1단원: A 2단원: B')).toBe('1단원: A\n2단원: B');
  });

  it('이미 줄바꿈 있으면 원본 유지', () => {
    expect(splitByUnit('1단원: A\n2단원: B')).toBe('1단원: A\n2단원: B');
  });

  it('큰 숫자 단원도 매칭 (예: 10단원)', () => {
    expect(splitByUnit('9단원: X, 10단원: Y')).toBe('9단원: X\n10단원: Y');
  });
});

describe('parseBullets', () => {
  it('빈 입력은 빈 배열', () => {
    expect(parseBullets('')).toEqual([]);
    expect(parseBullets('   ')).toEqual([]);
    expect(parseBullets('\n\n')).toEqual([]);
  });

  it('머리기호 `• ` prefix 제거 후 항목 추출', () => {
    expect(parseBullets('• AI 기초\n• ML 이해\n• 도구 활용')).toEqual([
      'AI 기초',
      'ML 이해',
      '도구 활용',
    ]);
  });

  it('머리기호가 없어도 줄 단위로 추출 (사용자 직접 입력 허용)', () => {
    expect(parseBullets('A\nB\nC')).toEqual(['A', 'B', 'C']);
  });

  it('가운뎃점·하이픈·별표 머리기호도 제거', () => {
    expect(parseBullets('· A\n- B\n* C')).toEqual(['A', 'B', 'C']);
  });

  it('교과목 세부내용 머리기호 ▪ 도 제거 (중복 부여 방지)', () => {
    expect(parseBullets('▪ A\n▪ B')).toEqual(['A', 'B']);
  });

  it('빈 줄과 공백만 있는 줄은 무시', () => {
    expect(parseBullets('• A\n\n• B\n   \n• C')).toEqual(['A', 'B', 'C']);
  });

  it('각 항목 양 끝 공백 trim', () => {
    expect(parseBullets('•   AI  \n•  ML  ')).toEqual(['AI', 'ML']);
  });

  it('bulletize ↔ parseBullets 라운드트립', () => {
    const items = ['노코드 AI 도구 활용', '데이터 전처리', '모델 검증'];
    expect(parseBullets(bulletize(items))).toEqual(items);
  });
});

describe('bulletizeText', () => {
  it('빈 입력은 빈 문자열', () => {
    expect(bulletizeText('')).toBe('');
    expect(bulletizeText(null)).toBe('');
    expect(bulletizeText(undefined)).toBe('');
    expect(bulletizeText('   \n  \n')).toBe('');
  });

  it('줄바꿈 텍스트 각 라인에 `• ` 머리기호 prepend', () => {
    expect(bulletizeText('AI 기초\nML 이해\n도구 활용')).toBe('• AI 기초\n• ML 이해\n• 도구 활용');
  });

  it('이미 머리기호가 붙어있어도 중복 prefix 없이 정규화', () => {
    expect(bulletizeText('• AI\n· ML\n- 도구')).toBe('• AI\n• ML\n• 도구');
  });

  it('빈 줄과 공백 줄은 무시', () => {
    expect(bulletizeText('A\n\nB\n   \nC')).toBe('• A\n• B\n• C');
  });

  it('단일 라인도 머리기호 prepend', () => {
    expect(bulletizeText('AI 기초')).toBe('• AI 기초');
  });
});

describe('bulletizeDetails', () => {
  it('글머리 문자는 HWPX(generate.py) 와 동일한 ▪', () => {
    expect(DETAIL_BULLET).toBe('▪ ');
  });

  it('빈 값은 빈 문자열 (셀 fallback 처리는 호출부 책임)', () => {
    expect(bulletizeDetails('')).toBe('');
    expect(bulletizeDetails(null)).toBe('');
    expect(bulletizeDetails(undefined)).toBe('');
    expect(bulletizeDetails('  \n ')).toBe('');
  });

  it('줄바꿈 구분 항목마다 ▪ 부여 (LLM 산출 형식)', () => {
    expect(bulletizeDetails('AI 개념 강의\n데이터 수집 실습\n품질 기준 워크숍')).toBe(
      '▪ AI 개념 강의\n▪ 데이터 수집 실습\n▪ 품질 기준 워크숍'
    );
  });

  it('쉼표로 연결된 레거시 단원 문자열은 단원 경계로 분리 후 ▪ 부여', () => {
    expect(bulletizeDetails('1단원: AI 개요, 2단원: 프롬프트 작성')).toBe(
      '▪ 1단원: AI 개요\n▪ 2단원: 프롬프트 작성'
    );
  });

  it('이미 ▪ 가 붙은 값에 중복 부여하지 않음', () => {
    expect(bulletizeDetails('▪ AI 개념\n▪ 실습')).toBe('▪ AI 개념\n▪ 실습');
  });

  it('다른 머리기호(•·-*)가 섞여 있어도 ▪ 로 정규화', () => {
    expect(bulletizeDetails('• AI\n- 실습\n* 산출물')).toBe('▪ AI\n▪ 실습\n▪ 산출물');
  });

  it('단일 라인도 ▪ 부여', () => {
    expect(bulletizeDetails('AI 개념 강의')).toBe('▪ AI 개념 강의');
  });
});
