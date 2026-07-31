/**
 * TrackMismatchNotice 테스트 (#015)
 *
 * 트랙이 맞지 않는 주소로 들어가 프로젝트 상세로 돌아왔을 때, 왜 돌아왔는지와
 * 어디로 가야 하는지를 알려주는 배너.
 *
 * 문구·링크를 전부 `lib/utils/project-track.ts` 헬퍼에서 만들므로,
 * 이 테스트는 **두 트랙이 서로 반대로 안내되지 않는지**를 지키는 것이 핵심이다
 * (뒤집히면 PBL 프로젝트에서 "로드맵 트랙입니다"라고 안내하게 된다).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TrackMismatchNotice } from './TrackMismatchNotice';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440033';

describe('TrackMismatchNotice', () => {
  it('PBL 프로젝트에서는 PBL 트랙임을 알리고 PBL 화면으로 링크한다', () => {
    render(<TrackMismatchNotice projectId={PROJECT_ID} track="PBL" status="FINALIZED" />);

    expect(screen.getByText('이 프로젝트는 PBL 트랙입니다')).toBeInTheDocument();
    // 열 수 없었던 쪽(반대 트랙)을 설명에 밝힌다
    expect(screen.getByText(/로드맵 화면은 열 수 없어/)).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/consultant/projects/${PROJECT_ID}/pbl`);
    expect(link).toHaveTextContent('PBL 보고서 보기');
  });

  it('로드맵 프로젝트에서는 로드맵 트랙임을 알리고 로드맵 화면으로 링크한다', () => {
    render(<TrackMismatchNotice projectId={PROJECT_ID} track="ROADMAP" status="FINALIZED" />);

    expect(screen.getByText('이 프로젝트는 로드맵 트랙입니다')).toBeInTheDocument();
    expect(screen.getByText(/PBL 화면은 열 수 없어/)).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/consultant/projects/${PROJECT_ID}/roadmap`);
    expect(link).toHaveTextContent('로드맵 보기');
  });

  it('링크 문구는 프로젝트 상태를 반영한다 (헤더 버튼과 같은 규칙)', () => {
    render(<TrackMismatchNotice projectId={PROJECT_ID} track="PBL" status="INTERVIEWED" />);

    expect(screen.getByRole('link')).toHaveTextContent('PBL 보고서 생성');
  });

  it('스크린리더에 알림으로 노출된다', () => {
    render(<TrackMismatchNotice projectId={PROJECT_ID} track="PBL" status="FINALIZED" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
