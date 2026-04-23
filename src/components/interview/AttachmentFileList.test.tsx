/**
 * AttachmentFileList 컴포넌트 테스트 (ISSUE-14, Step C-5)
 *
 * 시나리오:
 * 1. 빈 상태 → "첨부된 파일이 없습니다." 노출
 * 2. 파일 있을 때 → 파일명 + size(KB) + 추출 글자수 표시
 * 3. parse_error 가 있으면 amber "본문 추출 실패" 경고 표시
 * 4. "파일 선택" 버튼 클릭 → 숨겨진 input click 트리거
 * 5. handleFiles 가 MIME 화이트리스트 외 파일 거부 (showErrorToast 호출)
 * 6. handleFiles 가 size > 10MB 파일 거부
 * 7. onUpload 성공 시 onChange + 카드 렌더 + success 토스트
 * 8. singleFile=true 일 때 두 파일 동시 업로드 거부
 * 9. handleRemove → onRemove 콜백이 정의되어 있으면 호출
 * 10. 드롭 이벤트가 handleFiles 를 트리거 (드래그앤드롭 통합 검증)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HrdReportAttachment } from '@/lib/schemas/interview-roadmap';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  };
});

import { AttachmentFileList } from './AttachmentFileList';
import { showSuccessToast, showErrorToast } from '@/lib/utils';

function makeFile(
  name: string,
  type: string,
  sizeBytes = 1024,
): File {
  // File 생성자는 size 를 콘텐츠로부터 추론하므로, 원하는 size 를 위해 임의 콘텐츠 채움
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

/**
 * accept/multiple 속성의 클라이언트 검증을 우회하고 싶을 때 사용한다.
 * `userEvent.upload` 는 `accept` 미스매치/`multiple=false` 두 파일을 자동 차단하므로,
 * 우리 컴포넌트의 자체 가드 (MIME · size · singleFile) 를 검증하려면 직접 set 한다.
 *
 * jsdom 에는 `DataTransfer` 가 없으므로 FileList 를 직접 모사한 객체를 주입한다.
 */
function makeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    *[Symbol.iterator]() {
      for (const f of files) yield f;
    },
  } as unknown as FileList;
  for (let i = 0; i < files.length; i++) {
    Object.defineProperty(list, i, { value: files[i], enumerable: true });
  }
  return list;
}
function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: makeFileList(files), configurable: true });
  fireEvent.change(input);
}

const SAMPLE_PDF: HrdReportAttachment = {
  storage_path: 'p1/note-1.pdf',
  file_name: '공정분석.pdf',
  mime_type: 'application/pdf',
  size: 12345,
  uploaded_at: '2026-04-22T00:00:00Z',
  extracted_text: '본문 추출 성공'.repeat(10),
};

const SAMPLE_FAILED: HrdReportAttachment = {
  storage_path: 'p1/note-2.png',
  file_name: '스캔이미지.png',
  mime_type: 'image/png',
  size: 5_000,
  uploaded_at: '2026-04-22T00:00:00Z',
  parse_error: 'OCR 실패',
};

describe('AttachmentFileList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. 빈 상태에서는 "첨부된 파일이 없습니다." 안내가 노출된다', () => {
    render(
      <AttachmentFileList
        files={[]}
        onChange={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText('첨부된 파일이 없습니다.')).toBeInTheDocument();
  });

  it('2. 파일이 있으면 파일명 + size(KB) + 추출 글자수가 표시된다', () => {
    render(
      <AttachmentFileList
        files={[SAMPLE_PDF]}
        onChange={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText('공정분석.pdf')).toBeInTheDocument();
    // size + 추출 길이는 같은 <p> 의 자식 텍스트 노드로 분산되므로
    // li 의 textContent 를 통째로 검사한다.
    // 12345B / 1024 = 12.05 KB → toFixed(1) = '12.1', extracted_text 길이 = 8 * 10 = 80
    const li = screen.getByText('공정분석.pdf').closest('li');
    expect(li?.textContent).toMatch(/12\.1 KB/);
    expect(li?.textContent).toMatch(/본문 80자 추출/);
  });

  it('3. parse_error 가 있으면 "본문 추출 실패" amber 경고가 표시된다', () => {
    render(
      <AttachmentFileList
        files={[SAMPLE_FAILED]}
        onChange={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText('본문 추출 실패')).toBeInTheDocument();
  });

  it('4. "파일 선택" 버튼 클릭 시 숨겨진 input.click() 이 호출된다', async () => {
    render(
      <AttachmentFileList files={[]} onChange={vi.fn()} onUpload={vi.fn()} />,
    );
    const input = screen.getByLabelText(/파일 선택/) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    await userEvent.click(screen.getByRole('button', { name: /파일 선택/ }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('5. MIME 화이트리스트 외 파일은 거부되고 showErrorToast 가 호출된다', async () => {
    const onUpload = vi.fn();
    const onChange = vi.fn();
    render(
      <AttachmentFileList files={[]} onChange={onChange} onUpload={onUpload} />,
    );
    const input = screen.getByLabelText(/파일 선택/) as HTMLInputElement;
    const badFile = makeFile('virus.exe', 'application/x-msdownload');
    // userEvent.upload 는 accept 속성과 일치하지 않으면 input 에 set 하지 않으므로
    // 우리 컴포넌트의 자체 MIME 가드를 검증하기 위해 직접 set 한다.
    setInputFiles(input, [badFile]);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('업로드 실패'),
        expect.stringContaining('지원하지 않는 파일 형식'),
      );
    });
    expect(onUpload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('6. 10MB 초과 파일은 거부된다', async () => {
    const onUpload = vi.fn();
    render(
      <AttachmentFileList files={[]} onChange={vi.fn()} onUpload={onUpload} />,
    );
    const input = screen.getByLabelText(/파일 선택/) as HTMLInputElement;
    const bigFile = makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024);
    setInputFiles(input, [bigFile]);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('업로드 실패'),
        expect.stringContaining('파일이 너무 큽니다'),
      );
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('7. onUpload 성공 시 onChange 가 호출되고 success 토스트가 발생한다', async () => {
    const onChange = vi.fn();
    const onUpload = vi.fn().mockResolvedValue({ success: true, data: SAMPLE_PDF });
    render(
      <AttachmentFileList files={[]} onChange={onChange} onUpload={onUpload} />,
    );
    const input = screen.getByLabelText(/파일 선택/) as HTMLInputElement;
    const validFile = makeFile('공정분석.pdf', 'application/pdf');
    await userEvent.upload(input, validFile);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(validFile);
      expect(onChange).toHaveBeenCalledWith([SAMPLE_PDF]);
      expect(showSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('첨부 1건 업로드 완료'),
        expect.stringContaining('LLM 생성에 반영'),
      );
    });
  });

  it('8. singleFile=true 에서 두 파일 동시 업로드는 거부된다', async () => {
    const onUpload = vi.fn();
    render(
      <AttachmentFileList
        files={[]}
        onChange={vi.fn()}
        onUpload={onUpload}
        singleFile
      />,
    );
    const input = screen.getByLabelText(/파일 선택/) as HTMLInputElement;
    const a = makeFile('a.pdf', 'application/pdf');
    const b = makeFile('b.pdf', 'application/pdf');
    // singleFile=true 면 input 에 multiple 이 없으므로 userEvent 가 두 번째 파일을 잘라낸다.
    // 내부 가드(>1 거부)를 직접 검증하려면 files 를 직접 set 한다.
    setInputFiles(input, [a, b]);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        '파일 1개만 업로드 가능',
        expect.any(String),
      );
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('9. handleRemove 가 onRemove 콜백을 호출하고 onChange 로 목록에서 제거한다', async () => {
    const onChange = vi.fn();
    const onRemove = vi.fn().mockResolvedValue({ success: true });
    render(
      <AttachmentFileList
        files={[SAMPLE_PDF]}
        onChange={onChange}
        onUpload={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /공정분석\.pdf 삭제/ }));

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith(SAMPLE_PDF.storage_path);
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  it('10. 드롭 이벤트가 handleFiles 를 트리거해 onUpload 가 호출된다', async () => {
    const onChange = vi.fn();
    const onUpload = vi.fn().mockResolvedValue({ success: true, data: SAMPLE_PDF });
    render(
      <AttachmentFileList files={[]} onChange={onChange} onUpload={onUpload} />,
    );

    const dropzone = screen.getByTestId('attachment-dropzone');
    const file = makeFile('공정분석.pdf', 'application/pdf');
    // 드롭 이벤트는 jsdom 에서 dataTransfer.files 를 직접 set 해야 한다
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith([SAMPLE_PDF]);
    });
  });
});
