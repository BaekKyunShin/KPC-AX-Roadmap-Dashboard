import { describe, expect, it } from 'vitest';
import { buildPBLSystemPrompt, buildPBLUserPrompt } from './pbl-prompts';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

describe('buildPBLSystemPrompt', () => {
  it('평가방법 3종이 모두 포함된다', () => {
    const prompt = buildPBLSystemPrompt();
    expect(prompt).toContain('포트폴리오');
    expect(prompt).toContain('문제해결시나리오');
    expect(prompt).toContain('작업장 평가');
  });

  it('AI 도구 활용 계획 최소 3단계 이상 안내가 포함된다', () => {
    const prompt = buildPBLSystemPrompt();
    const has3Stage = prompt.includes('최소 3단계') || prompt.includes('3단계 이상');
    expect(has3Stage).toBe(true);
  });

  it('결과평가 설문 문항 수 5/3/5/4가 모두 명시된다', () => {
    const prompt = buildPBLSystemPrompt();
    // 만족도 길이 5 (satisfaction_survey 근처에 5 등장)
    expect(prompt).toContain('satisfaction_survey');
    expect(prompt).toContain('길이 **5**');
    // 성취도 길이 3
    expect(prompt).toContain('achievement_survey');
    expect(prompt).toContain('길이 **3**');
    // 외부전문가 만족도 길이 5
    expect(prompt).toContain('external_expert_survey');
    // 현업적용도 길이 4
    expect(prompt).toContain('practical_application_survey');
    expect(prompt).toContain('길이 **4**');
  });

  it("evaluation_result '예정' 고정이 명시된다", () => {
    const prompt = buildPBLSystemPrompt();
    expect(prompt).toContain('예정');
  });

  // 공단 훈련코치 강사료 지원 상한이 30시간이므로, AI 초안은 가급적 30시간 이내로
  // 구성하도록 권고한다. 단, 기업이 제시한 적정 훈련시간이 30시간을 초과하면 그에
  // 맞춰 확장한다. 강제 상한은 두지 않고 권고만 한다.
  it('total_hours 권장 상한 30시간 가이드가 명시된다', () => {
    const prompt = buildPBLSystemPrompt();
    expect(prompt).toContain('30시간');
    const hasRecommendationWord =
      prompt.includes('권장') || prompt.includes('권고');
    expect(hasRecommendationWord).toBe(true);
  });
});

describe('buildPBLUserPrompt', () => {
  // V2 (PBLInterviewStrict, flat camelCase) — 인터뷰 제출(`submitPBLInterviewV2`)이
  // 저장하는 정본 모양과 동일하다.
  const fakeInterview = PBL_INTERVIEW_SAMPLE as unknown as Record<string, unknown>;

  it('예외 없이 문자열을 반환한다', () => {
    const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('revisionPrompt 제공 시 수정 요청 섹션이 포함된다', () => {
    const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약', 'revision');
    const hasRevision =
      result.includes('수정 요청') ||
      result.includes('수정이 요청') ||
      result.includes('재생성');
    expect(hasRevision).toBe(true);
  });

  it('revisionPrompt 없을 때 수정 요청 섹션이 포함되지 않는다', () => {
    const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
    expect(result).not.toContain('수정 요청');
  });

  it('진단 요약 내용이 포함된다', () => {
    const result = buildPBLUserPrompt(fakeInterview, {}, null, '기업 AI 역량 향상 필요');
    expect(result).toContain('기업 AI 역량 향상 필요');
  });

  it('컨설턴트 프로필이 있으면 해당 섹션이 포함된다', () => {
    const fakeConsultant = {
      id: 'c1',
      user_id: 'u1',
      expertise_domains: ['AI 교육', '데이터 분석'],
      available_industries: ['제조'],
      sub_industries: ['자동차'],
      teaching_levels: ['INTERMEDIATE' as const],
      coaching_methods: ['LECTURE' as const],
      skill_tags: ['ChatGPT', 'Python'],
      years_of_experience: 8,
      affiliation: '한국AI컨설팅',
      representative_experience: '다수 제조 기업 AI 교육 수행',
      portfolio: '',
      strengths_constraints: '',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    const result = buildPBLUserPrompt(fakeInterview, {}, fakeConsultant, '요약');
    expect(result).toContain('컨설턴트 프로필');
    expect(result).toContain('AI 교육');
  });

  // ISSUE-14 PBL 확장: Ⅱ-3-가 HRD이음 첨부 본문을 프롬프트에 병합 (V2 hrdReportPdf).
  describe('Ⅱ-3-가 HRD이음 보고서 첨부 통합 (ISSUE-14 PBL)', () => {
    it('extractedText 가 있으면 본문이 프롬프트에 포함된다', () => {
      const interview = {
        ...fakeInterview,
        hrdReportPdf: {
          fileName: 'HRD이음 결과 2026.pdf',
          url: 'https://example/p/note-x.pdf',
          size: 512000,
          extractedText: '본 보고서는 스마트팩토리 도입 컨설팅 요약임.',
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).toContain('Ⅱ-3-가. 기업HRD이음컨설팅 결과');
      expect(result).toContain('HRD이음 결과 2026.pdf');
      expect(result).toContain(
        '본 보고서는 스마트팩토리 도입 컨설팅 요약임.',
      );
    });

    it('parseError 만 있을 때 본문 추출 실패 안내가 포함된다', () => {
      const interview = {
        ...fakeInterview,
        hrdReportPdf: {
          fileName: 'broken.pdf',
          url: 'https://example/p/note-broken.pdf',
          size: 0,
          parseError: '손상된 PDF',
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).toContain('broken.pdf');
      expect(result).toContain('파싱 실패');
      expect(result).toContain('손상된 PDF');
    });

    it('첨부가 없으면 Ⅱ-3-가 HRD이음 섹션이 렌더링되지 않는다', () => {
      const interview = { ...fakeInterview, hrdReportPdf: null };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).not.toContain('Ⅱ-3-가. 기업HRD이음컨설팅 결과 (첨부 보고서)');
    });
  });

  // PBL 인터뷰 스키마(interview-pbl.ts)는 sttInsights 를 camelCase 로 저장한다.
  // STT 인사이트가 있으면 LLM 프롬프트에 반드시 반영되어야 한다.
  describe('STT 인사이트 (sttInsights)', () => {
    it('sttInsights 가 있으면 STT 인사이트 섹션이 포함된다', () => {
      const interview = {
        ...fakeInterview,
        sttInsights: {
          숨은_니즈: ['부서 간 데이터 사일로 해소'],
          AI_태도: 'PBL 도입에 적극적이나 학습 부담 우려',
          주요_인용: ['"우리도 ChatGPT를 써보고 싶다"'],
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).toContain('### STT 인터뷰 분석 인사이트');
      expect(result).toContain('**숨은 니즈:**');
      expect(result).toContain('부서 간 데이터 사일로 해소');
      expect(result).toContain('PBL 도입에 적극적이나 학습 부담 우려');
    });

    it('sttInsights 가 없으면 STT 섹션이 렌더되지 않는다', () => {
      const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
      expect(result).not.toContain('### STT 인터뷰 분석 인사이트');
    });
  });

  // 자가진단 점수 — 로드맵과 동일하게 기업이 사전 입력한 점수를 LLM 에 전달한다.
  // 5번째 인자 selfAssessment 로 받아 scores JSON 을 프롬프트에 직접 출력한다.
  describe('자가진단 결과 (selfAssessment)', () => {
    it('selfAssessment.scores 가 있으면 자가진단 결과 섹션이 포함된다', () => {
      const selfAssessment = {
        scores: {
          data_capability: 3,
          ai_awareness: 4,
          process_maturity: 2,
        },
      };
      const result = buildPBLUserPrompt(
        fakeInterview,
        {},
        null,
        '요약',
        undefined,
        selfAssessment,
      );
      expect(result).toContain('자가진단 결과');
      expect(result).toContain('"data_capability"');
      expect(result).toContain('"ai_awareness"');
      expect(result).toContain('"process_maturity"');
    });

    it('selfAssessment 가 없으면 자가진단 결과 섹션이 렌더되지 않는다', () => {
      const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
      expect(result).not.toContain('## 자가진단 결과');
    });

    it('selfAssessment.scores 가 빈 객체여도 섹션이 렌더된다(객체 형태로)', () => {
      const result = buildPBLUserPrompt(
        fakeInterview,
        {},
        null,
        '요약',
        undefined,
        { scores: {} },
      );
      expect(result).toContain('## 자가진단 결과');
    });
  });

  // V2 (PBLInterviewStrict) 에는 V1 의 support_history(정부 지원 이력) 필드가 없다.
  // 폼에서 입력받지 않으므로 LLM 프롬프트에서도 해당 섹션을 렌더하지 않는 게 정합.
  // V1 시절 어설션 제거.
});
