import { describe, test, expect } from 'vitest';
import { aggregateProjectStats, formatRelativeTime, formatActivityMessage, getActivityAction, getActivityTagInfo } from './consultant-home';

// =============================================================================
// aggregateProjectStats
// =============================================================================

describe('aggregateProjectStats', () => {
  test('빈 배열이면 모든 값이 0', () => {
    const result = aggregateProjectStats([]);
    expect(result).toEqual({
      total: 0,
      waitingInterview: 0,
      interviewDone: 0,
      draftingRoadmap: 0,
      roadmapCompleted: 0,
      byStatus: {},
    });
  });

  test('상태별로 정확하게 집계 (4분류)', () => {
    const projects = [
      { status: 'ASSIGNED' },
      { status: 'ASSIGNED' },
      { status: 'INTERVIEWED' },
      { status: 'ROADMAP_DRAFTED' },
      { status: 'ROADMAP_DRAFTED' },
      { status: 'ROADMAP_DRAFTED' },
      { status: 'FINALIZED' },
      { status: 'FINALIZED' },
    ];
    const result = aggregateProjectStats(projects);

    expect(result.total).toBe(8);
    expect(result.waitingInterview).toBe(2);    // ASSIGNED
    expect(result.interviewDone).toBe(1);        // INTERVIEWED
    expect(result.draftingRoadmap).toBe(3);      // ROADMAP_DRAFTED
    expect(result.roadmapCompleted).toBe(2);     // FINALIZED
  });

  test('byStatus에 상태별 개수 포함', () => {
    const projects = [
      { status: 'ASSIGNED' },
      { status: 'INTERVIEWED' },
      { status: 'FINALIZED' },
    ];
    const result = aggregateProjectStats(projects);

    expect(result.byStatus).toEqual({
      ASSIGNED: 1,
      INTERVIEWED: 1,
      FINALIZED: 1,
    });
  });

  test('합산 검증: 4분류 합계 === total', () => {
    const projects = [
      { status: 'ASSIGNED' },
      { status: 'ASSIGNED' },
      { status: 'ASSIGNED' },
      { status: 'INTERVIEWED' },
      { status: 'INTERVIEWED' },
      { status: 'ROADMAP_DRAFTED' },
      { status: 'ROADMAP_DRAFTED' },
      { status: 'ROADMAP_DRAFTED' },
      { status: 'FINALIZED' },
      { status: 'FINALIZED' },
      { status: 'FINALIZED' },
      { status: 'FINALIZED' },
    ];
    const result = aggregateProjectStats(projects);

    expect(
      result.waitingInterview + result.interviewDone + result.draftingRoadmap + result.roadmapCompleted
    ).toBe(result.total);
  });
});

// =============================================================================
// formatRelativeTime
// =============================================================================

describe('formatRelativeTime', () => {
  test('오늘 날짜면 "오늘 HH:MM" 형식 반환', () => {
    const now = new Date();
    now.setHours(14, 30, 0, 0);
    const result = formatRelativeTime(now.toISOString());

    expect(result).toMatch(/^오늘 \d{2}:\d{2}$/);
  });

  test('어제 날짜면 "어제 HH:MM" 형식 반환', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(16, 45, 0, 0);
    const result = formatRelativeTime(yesterday.toISOString());

    expect(result).toMatch(/^어제 \d{2}:\d{2}$/);
  });

  test('2~6일 전이면 "N일 전" 형식 반환', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = formatRelativeTime(threeDaysAgo.toISOString());

    expect(result).toBe('3일 전');
  });

  test('7일 이상이면 날짜 형식 반환', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const result = formatRelativeTime(tenDaysAgo.toISOString());

    // "1월 30일" 같은 형식
    expect(result).toMatch(/\d{1,2}월 \d{1,2}일/);
  });
});

// =============================================================================
// formatActivityMessage
// =============================================================================

describe('formatActivityMessage', () => {
  test('사전조사 타입이면 기업명 + 사전조사 메모 작성 멘트', () => {
    const result = formatActivityMessage('pre_research', '한국전력');
    expect(result).toBe('한국전력의 사전조사 메모를 작성했습니다.');
  });

  test('현장메모 타입이면 기업명 + 현장메모 작성 멘트', () => {
    const result = formatActivityMessage('field_note', '한국전력');
    expect(result).toBe('한국전력의 현장메모를 작성했습니다.');
  });

  test('후속조치 타입이면 기업명 + 후속조치 기록 멘트', () => {
    const result = formatActivityMessage('follow_up', '삼성전자');
    expect(result).toBe('삼성전자의 후속조치를 기록했습니다.');
  });

  test('기업피드백 타입이면 기업명 + 기업피드백 기록 멘트', () => {
    const result = formatActivityMessage('client_feedback', 'LG에너지');
    expect(result).toBe('LG에너지의 기업피드백을 기록했습니다.');
  });

  test('system_auto 타입이면 기업명 + DB content를 조합', () => {
    const result = formatActivityMessage('system_auto', '한국전력', '인터뷰가 저장되었습니다.');
    expect(result).toBe('한국전력의 인터뷰를 저장했습니다.');
  });

  test('system_auto: 인터뷰 수정', () => {
    const result = formatActivityMessage('system_auto', '삼성전자', '인터뷰가 수정되었습니다.');
    expect(result).toBe('삼성전자의 인터뷰를 수정했습니다.');
  });

  test('system_auto: 로드맵 생성', () => {
    const result = formatActivityMessage('system_auto', '한국전력', '로드맵이 생성되었습니다.');
    expect(result).toBe('한국전력의 로드맵을 생성했습니다.');
  });

  test('system_auto: 새 로드맵 버전 생성', () => {
    const result = formatActivityMessage('system_auto', '한국전력', '새 로드맵 버전이 생성되었습니다.');
    expect(result).toBe('한국전력의 새 로드맵 버전을 생성했습니다.');
  });

  test('system_auto: 로드맵 최종 확정', () => {
    const result = formatActivityMessage('system_auto', 'LG에너지', '로드맵이 최종 확정되었습니다.');
    expect(result).toBe('LG에너지의 로드맵을 최종 확정했습니다.');
  });

  test('system_auto: 매칭되지 않는 content면 기업명 + content 그대로', () => {
    const result = formatActivityMessage('system_auto', '한국전력', '알 수 없는 작업이 수행되었습니다.');
    expect(result).toBe('한국전력 — 알 수 없는 작업이 수행되었습니다.');
  });

  test('알 수 없는 타입이면 기업명 + content 그대로', () => {
    const result = formatActivityMessage('unknown_type', '한국전력', '어떤 내용');
    expect(result).toBe('한국전력 — 어떤 내용');
  });
});

// =============================================================================
// getActivityAction
// =============================================================================

describe('getActivityAction', () => {
  test('수동 타입이면 "의 {멘트}" 반환', () => {
    expect(getActivityAction('pre_research')).toBe('의 사전조사 메모를 작성했습니다.');
    expect(getActivityAction('field_note')).toBe('의 현장메모를 작성했습니다.');
    expect(getActivityAction('follow_up')).toBe('의 후속조치를 기록했습니다.');
    expect(getActivityAction('client_feedback')).toBe('의 기업피드백을 기록했습니다.');
  });

  test('system_auto면 "의 {능동형 멘트}" 반환', () => {
    expect(getActivityAction('system_auto', '인터뷰가 저장되었습니다.')).toBe('의 인터뷰를 저장했습니다.');
    expect(getActivityAction('system_auto', '로드맵이 최종 확정되었습니다.')).toBe('의 로드맵을 최종 확정했습니다.');
  });

  test('폴백이면 " — {content}" 반환', () => {
    expect(getActivityAction('unknown', '어떤 내용')).toBe(' — 어떤 내용');
  });
});

// =============================================================================
// getActivityTagInfo
// =============================================================================

describe('getActivityTagInfo', () => {
  test('수동 타입 4종 모두 "활동메모" 태그 반환', () => {
    for (const type of ['pre_research', 'field_note', 'follow_up', 'client_feedback']) {
      const tag = getActivityTagInfo(type);
      expect(tag.label).toBe('활동메모');
      expect(tag.bgColor).toBe('bg-emerald-50');
      expect(tag.textColor).toBe('text-emerald-700');
    }
  });

  test('system_auto 인터뷰 관련이면 "인터뷰" 태그', () => {
    const tag = getActivityTagInfo('system_auto', '인터뷰가 저장되었습니다.');
    expect(tag.label).toBe('인터뷰');
    expect(tag.bgColor).toBe('bg-blue-50');
    expect(tag.textColor).toBe('text-blue-700');
  });

  test('system_auto 인터뷰 수정도 "인터뷰" 태그', () => {
    const tag = getActivityTagInfo('system_auto', '인터뷰가 수정되었습니다.');
    expect(tag.label).toBe('인터뷰');
  });

  test('system_auto 로드맵 관련이면 "로드맵" 태그', () => {
    const tag = getActivityTagInfo('system_auto', '로드맵이 생성되었습니다.');
    expect(tag.label).toBe('로드맵');
    expect(tag.bgColor).toBe('bg-purple-50');
    expect(tag.textColor).toBe('text-purple-700');
  });

  test('system_auto 로드맵 확정도 "로드맵" 태그', () => {
    const tag = getActivityTagInfo('system_auto', '로드맵이 최종 확정되었습니다.');
    expect(tag.label).toBe('로드맵');
  });

  test('system_auto 새 버전도 "로드맵" 태그', () => {
    const tag = getActivityTagInfo('system_auto', '새 로드맵 버전이 생성되었습니다.');
    expect(tag.label).toBe('로드맵');
  });

  test('매칭 안 되는 system_auto면 "시스템" 폴백', () => {
    const tag = getActivityTagInfo('system_auto', '알 수 없는 작업');
    expect(tag.label).toBe('시스템');
    expect(tag.bgColor).toBe('bg-gray-50');
    expect(tag.textColor).toBe('text-gray-500');
  });

  test('알 수 없는 타입이면 "시스템" 폴백', () => {
    const tag = getActivityTagInfo('unknown_type');
    expect(tag.label).toBe('시스템');
  });
});
