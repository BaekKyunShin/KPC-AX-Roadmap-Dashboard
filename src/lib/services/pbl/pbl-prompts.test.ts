import { describe, expect, it } from 'vitest';
import { buildPBLSystemPrompt, buildPBLUserPrompt } from './pbl-prompts';

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
});

describe('buildPBLUserPrompt', () => {
  const fakeInterview = {
    courseOverview: {
      company_name: '테스트 기업',
      course_name: 'AI 활용 업무 혁신 과정',
      training_hours: 32,
      trainee_count: 5,
      training_job: '생산 관리',
      ai_level: 'AI탐구형',
      training_goals: ['기술문제 해결'],
    },
    companyStatus: {
      business_issues: '불량률 증가로 인한 생산성 저하',
      organization: [{ id: '1', department_name: '생산부', tasks: ['품질 검사'] }],
    },
    trainingEnvironment: {
      proper_training_hours: 32,
      training_place: { types: ['사내'], location: '본사 2층', special_notes: '' },
      internal_instructor: { used: true, name: '홍길동', position: '과장' },
      target_count: 5,
      target_characteristics: { career: '5년 이상', level: '중급' },
      ai_infrastructure: { ai_tools: '가능', network: '양호', pc_count: 10, etc_equipment: '' },
      training_needs_analysis: 'AI 품질 검사 도구 도입 필요',
      expectation: { as_is: '수동 검사 의존', to_be: 'AI 자동화 검사 도입' },
    },
    hrdNecessity: {
      course_development_necessity: '현장 맞춤형 AI 과정 개발 필요',
      training_history: [],
      recommendations: [],
    },
    performanceActivities: {
      performance_activities: [
        {
          id: '1',
          round: 1,
          date: '2026-04-01',
          content: '현장 인터뷰',
          method: '대면 인터뷰',
          operation_mode: '대면',
          participants: { pm: '김PM', external_expert: '', internal_expert: '이내부', jurisdiction_manager: '' },
        },
      ],
    },
    problemDefinition: {
      problem_definition: {
        background: '불량률 높음',
        core_problem: 'AI 품질 검사 미적용',
        scope: '생산부 전체',
        constraints: '예산 제한',
      },
      problem_priorities: [{ id: '1', problem_name: '불량 검사 자동화', priority: 1, selected: true }],
    },
    targetTasks: {
      target_tasks: [{ id: '1', task_name: '품질 검사', necessity: 5, selected: true }],
      selection_reason: 'AI 적용 시 효과가 크고 즉시 개선 가능',
      target_task_details: [
        {
          id: '1',
          task_name: '품질 검사',
          as_is: '수동 육안 검사',
          to_be: 'AI 이미지 인식 검사',
          required_knowledge: '머신러닝 기초',
          required_skill: 'AI 도구 활용',
        },
      ],
    },
    aiLevelDiagnosis: {
      current_ai_level: 'AI탐구형',
      expected_ai_level: 'AI활용형',
      improvement_reason: '훈련 후 실무 적용 가능 수준 도달',
    },
  };

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

  // ISSUE-14 PBL 확장: Ⅱ-3-가 HRD이음 첨부 본문을 프롬프트에 병합
  describe('Ⅱ-3-가 HRD이음 보고서 첨부 통합 (ISSUE-14 PBL)', () => {
    it('extracted_text 가 있으면 attachment_body 태그로 본문이 포함된다', () => {
      const interview = {
        ...fakeInterview,
        hrdNecessity: {
          ...fakeInterview.hrdNecessity,
          hrd_report_attachment: {
            storage_path: 'p/note-x.pdf',
            file_name: 'HRD이음 결과 2026.pdf',
            mime_type: 'application/pdf',
            size: 512000,
            extracted_text: '본 보고서는 스마트팩토리 도입 컨설팅 요약임.',
          },
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).toContain('Ⅱ-3-가. 기업HRD이음컨설팅 결과');
      expect(result).toContain('HRD이음 결과 2026.pdf');
      expect(result).toContain('<attachment_body');
      expect(result).toContain(
        '본 보고서는 스마트팩토리 도입 컨설팅 요약임.',
      );
      expect(result).toContain('</attachment_body>');
    });

    it('parse_error 만 있을 때 본문 추출 실패 안내가 포함된다', () => {
      const interview = {
        ...fakeInterview,
        hrdNecessity: {
          ...fakeInterview.hrdNecessity,
          hrd_report_attachment: {
            storage_path: 'p/note-broken.pdf',
            file_name: 'broken.pdf',
            mime_type: 'application/pdf',
            parse_error: '손상된 PDF',
          },
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).toContain('broken.pdf');
      expect(result).toContain('본문 추출 실패');
      expect(result).toContain('손상된 PDF');
    });

    it('첨부가 없으면 Ⅱ-3-가 HRD이음 섹션이 렌더링되지 않는다', () => {
      const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
      expect(result).not.toContain('Ⅱ-3-가. 기업HRD이음컨설팅 결과');
      expect(result).not.toContain('<attachment_body');
    });

    it('첨부 본문 내 따옴표는 file 속성에서 escape 된다 (Prompt-injection 방어)', () => {
      const interview = {
        ...fakeInterview,
        hrdNecessity: {
          ...fakeInterview.hrdNecessity,
          hrd_report_attachment: {
            storage_path: 'p/note-x.pdf',
            file_name: 'he"llo".pdf',
            extracted_text: 'dummy',
          },
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      // file="..." 값 안에는 " 대신 &quot; 만 존재해야 한다
      const match = result.match(/<attachment_body file="([^"]*)"/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('&quot;');
      expect(match?.[1]).not.toContain('"');
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

  // hrdNecessity.support_history (Ⅱ-3 정부 지원 이력) — recommended_program 추천
  // 정확도에 영향. 기존에 누락 → 본 PR 에서 프롬프트에 추가.
  describe('hrdNecessity.support_history (정부 지원 이력)', () => {
    it('support_history 가 있으면 지원 이력 섹션이 포함된다', () => {
      const interview = {
        ...fakeInterview,
        hrdNecessity: {
          ...fakeInterview.hrdNecessity,
          support_history: [
            { id: 's1', year: '2024', annual_limit: 10, supported: 8, ratio: '80%' },
            { id: 's2', year: '2025', annual_limit: 12, supported: 5, ratio: '42%' },
          ],
        },
      };
      const result = buildPBLUserPrompt(interview, {}, null, '요약');
      expect(result).toContain('지원 이력');
      expect(result).toContain('"2024"');
      expect(result).toContain('"2025"');
      expect(result).toContain('80%');
    });

    it('support_history 가 비어있으면 빈 배열로 렌더(JSON.stringify)', () => {
      const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
      // fakeInterview.hrdNecessity 에는 support_history 가 없으므로 빈 배열로 출력
      expect(result).toContain('지원 이력');
    });
  });
});
