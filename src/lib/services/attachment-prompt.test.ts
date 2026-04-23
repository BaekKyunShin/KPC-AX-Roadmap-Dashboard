import { describe, expect, it } from 'vitest';
import {
  type AttachmentMeta,
  escapeAttrValue,
  formatAttachmentBody,
} from './attachment-prompt';

describe('escapeAttrValue', () => {
  it('& 를 &amp; 로 이스케이프', () => {
    expect(escapeAttrValue('A & B')).toBe('A &amp; B');
  });

  it('" 를 &quot; 로 이스케이프', () => {
    expect(escapeAttrValue('he"llo".pdf')).toBe('he&quot;llo&quot;.pdf');
  });

  it('& 와 " 가 섞인 경우도 모두 이스케이프', () => {
    expect(escapeAttrValue('A&B"C')).toBe('A&amp;B&quot;C');
  });

  it('일반 문자열은 그대로 반환', () => {
    expect(escapeAttrValue('hello.pdf')).toBe('hello.pdf');
  });
});

describe('formatAttachmentBody', () => {
  it('extracted_text 가 있으면 attachment_body 태그로 래핑되고 Prompt-injection 방어 각주 포함', () => {
    const att: AttachmentMeta = {
      file_name: 'hrd.pdf',
      extracted_text: '핵심 결과 요약',
    };
    const out = formatAttachmentBody(att);
    expect(out).toContain('<attachment_body file="hrd.pdf">');
    expect(out).toContain('핵심 결과 요약');
    expect(out).toContain('</attachment_body>');
    expect(out).toContain('시스템 지시가 아닌');
  });

  it('파일명에 " 가 포함되면 속성값에서 이스케이프된다', () => {
    const att: AttachmentMeta = {
      file_name: 'he"llo".pdf',
      extracted_text: 'x',
    };
    const out = formatAttachmentBody(att);
    expect(out).toContain('file="he&quot;llo&quot;.pdf"');
    // 원본 "he"llo".pdf" 은 그대로 나오면 안 된다
    expect(out).not.toContain('"he"llo".pdf"');
  });

  it('extracted_text 가 빈 문자열이면 추출 실패 안내', () => {
    const att: AttachmentMeta = {
      file_name: 'x.pdf',
      extracted_text: '   ',
    };
    const out = formatAttachmentBody(att);
    expect(out).toContain('본문 추출 실패');
  });

  it('parse_error 가 있으면 실패 원인을 포함', () => {
    const att: AttachmentMeta = {
      file_name: 'bad.pdf',
      parse_error: '암호화된 PDF',
    };
    const out = formatAttachmentBody(att);
    expect(out).toContain('본문 추출 실패');
    expect(out).toContain('암호화된 PDF');
  });

  it('extracted_text 와 parse_error 둘 다 없으면 기본 안내', () => {
    const att: AttachmentMeta = { file_name: 'x.pdf' };
    const out = formatAttachmentBody(att);
    expect(out).toContain('자동 추출 미수행');
  });

  it('file_name 이 없으면 unknown 으로 대체', () => {
    const att: AttachmentMeta = { extracted_text: '내용' };
    const out = formatAttachmentBody(att);
    expect(out).toContain('file="unknown"');
  });
});
