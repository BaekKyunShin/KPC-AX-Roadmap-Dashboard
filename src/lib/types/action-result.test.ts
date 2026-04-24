import { describe, expect, it } from 'vitest';
import { errorResult, simpleSuccess, successResult } from './action-result';

describe('action-result 헬퍼', () => {
  it('successResult 는 success:true 와 전달된 data 를 담은다', () => {
    const result = successResult({ id: 'abc', count: 3 });
    expect(result).toEqual({ success: true, data: { id: 'abc', count: 3 } });
  });

  it('successResult 는 원시값 data 도 수용한다', () => {
    expect(successResult('ok')).toEqual({ success: true, data: 'ok' });
    expect(successResult(0)).toEqual({ success: true, data: 0 });
    expect(successResult(null)).toEqual({ success: true, data: null });
  });

  it('errorResult 는 success:false 와 메시지를 담는다', () => {
    const result = errorResult('권한이 없습니다.');
    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('simpleSuccess 는 data 없이 success:true 만 반환한다', () => {
    const result = simpleSuccess();
    expect(result).toEqual({ success: true });
  });
});
