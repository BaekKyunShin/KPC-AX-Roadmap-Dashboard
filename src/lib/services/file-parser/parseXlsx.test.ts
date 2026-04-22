/**
 * parseXlsx 테스트 — xlsx-js-style 로 시트별 텍스트 추출
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseXlsx } from './parseXlsx';

const fixturePath = (name: string) =>
  resolve(__dirname, '__fixtures__', name);

describe('parseXlsx', () => {
  it('정상 XLSX → 모든 시트 셀 텍스트 결합', async () => {
    const buffer = readFileSync(fixturePath('sample.xlsx'));
    const text = await parseXlsx(buffer);

    expect(text).toContain('항목');
    expect(text).toContain('AI 역량 점수');
    expect(text).toContain('75');
    expect(text).toContain('주요 직무');
    expect(text).toContain('품질검사');
  });

  it('손상된 버퍼 → 시트 헤더만 (xlsx-js-style 은 관대 처리)', async () => {
    // xlsx-js-style 은 손상된 버퍼를 빈 Sheet1 로 파싱한다.
    // extractText 디스패처에서 결과 길이 검증으로 fallback 을 결정한다.
    const corrupt = Buffer.from('not an xlsx');
    const result = await parseXlsx(corrupt);
    // 빈 워크북이라도 [시트명] 헤더는 포함되므로 정상 종료
    expect(result).toContain('[');
  });
});
