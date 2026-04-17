import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form-field';

describe('FormField', () => {
  it('라벨과 children을 렌더한다', () => {
    render(
      <FormField label="테스트">
        <input aria-label="test-input" />
      </FormField>
    );
    expect(screen.getByText('테스트')).toBeInTheDocument();
    expect(screen.getByLabelText('test-input')).toBeInTheDocument();
  });

  it('required=true면 별표(*) 표시', () => {
    render(
      <FormField label="필수" required>
        <input aria-label="req" />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('hint가 있으면 안내 문구를 렌더한다', () => {
    render(
      <FormField label="라벨" hint="입력 예시 안내">
        <input aria-label="h" />
      </FormField>
    );
    expect(screen.getByText('입력 예시 안내')).toBeInTheDocument();
  });

  it('error가 있으면 FieldError 메시지 렌더', () => {
    render(
      <FormField label="라벨" error="필수 입력">
        <input aria-label="e" />
      </FormField>
    );
    expect(screen.getByText('필수 입력')).toBeInTheDocument();
  });

  it('htmlFor로 라벨-입력 연결', () => {
    render(
      <FormField label="이름" htmlFor="my-input">
        <input id="my-input" />
      </FormField>
    );
    expect(screen.getByLabelText('이름')).toHaveAttribute('id', 'my-input');
  });
});
