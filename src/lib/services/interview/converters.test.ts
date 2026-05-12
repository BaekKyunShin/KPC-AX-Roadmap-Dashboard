/**
 * 인터뷰 camelCase 스키마 ↔ DB snake_case 컬럼 converter 테스트
 *
 * Task 2.7-b (PR #2) — 신규 camelCase Zod 스키마(Task 2.1/2.2) 를 Server Action
 * 경계에서 DB(interviews 테이블) 에 저장/복원할 때 쓰는 converter 함수들.
 *
 * 핵심 검증:
 *   - 로드맵: 11개 필드 매핑 (Task 2.7-a 리포트에 명시된 경로 그대로)
 *   - PBL: pbl_data JSONB 통째 저장 (기존 방식 유지 + camelCase 직통)
 *   - HRD PDF 의 extracted_text / parse_error 는 내부 보존 (camelCase 스키마에 노출 X)
 *   - targetTask 단일 객체 ↔ improvement_goals[0] 배열 1원소 변환
 *   - taskAnalysis[] ↔ job_tasks[] 필드명 매핑
 */

import { describe, it, expect } from 'vitest';

import {
  mapRoadmapInterviewToDb,
  mapDbToRoadmapInterview,
  mapPBLInterviewToDb,
  mapDbToPBLInterview,
} from './converters';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

// ============================================================================
// 로드맵 — camelCase → DB
// ============================================================================

function validRoadmapCamelCase(): RoadmapInterviewStrict {
  return {
    // Ⅰ 개요
    establishmentNecessity: '공정 품질 편차 개선을 위한 AI 훈련 체계를 수립한다.',
    performanceActivities: [
      {
        round: 1,
        date: '2026-05-01',
        timeRange: '09:00~11:00',
        content: '현장 인터뷰',
        method: 'ONSITE',
        pmName: '김PM',
        expertName: '이전문가',
      },
    ],
    aiLevel: 'INTERMEDIATE',
    selectedTask: '품질검사 자동화',

    // Ⅱ 요구분석
    hrdReportPdf: {
      fileName: 'hrd-report.pdf',
      url: 'projects/xxx/hrd-abc.pdf',
      size: 1024,
    },
    companyRequirements: {
      status: '제조업 중소기업',
      problem: '수작업 품질 검사 편차',
      will: '경영진 강한 추진 의지',
      outcomes: '품질 불량률 15% 개선',
    },
    taskAnalysis: [
      {
        domain: '생산',
        task: '완제품 품질 검사',
        asIs: '육안 검사 중심',
        problem: '검사자별 편차',
        dataTiming: '출하 직전, 이미지 2년치',
        aiScore: 4,
      },
    ],
    taskAnalysisNote: '대상 과업: 품질검사 자동화 (AI 도입 필요도 4 이상)',
    taskAnalysisAttachment: {
      fileName: 'note-attach.pdf',
      url: 'projects/xxx/note-def.pdf',
    },
    targetTask: {
      name: '품질검사 자동화',
      reason: 'AI 도입 필요도 4 이상',
      expectedAsIs: '육안 검사 중심 / 편차 존재',
      expectedToBe: 'AI 1차 검사 + 사람 최종 확인',
    },

    // Ⅲ-1 역량 모델링
    competencies: [
      {
        name: '품질 검사 데이터 해석',
        definition: '불량 이미지 데이터에서 패턴을 식별한다.',
        knowledge: '이미지 분류 기초',
        skill: '이미지 레이블링',
        attitude: '데이터 기반 의사결정',
      },
    ],
    ncsUsed: false,
    ncsDerivationMethod: '현장 인터뷰 + 업계 벤치마킹',
  };
}

describe('mapRoadmapInterviewToDb', () => {
  it('11개 필드를 DB snake_case 경로로 정확히 매핑한다', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());

    // company_details.roadmap_overview
    const overview = db.company_details.roadmap_overview;
    expect(overview.establishment_necessity).toBe(
      '공정 품질 편차 개선을 위한 AI 훈련 체계를 수립한다.',
    );
    expect(overview.performance_activities).toHaveLength(1);
    expect(overview.performance_activities[0]).toMatchObject({
      round: 1,
      date: '2026-05-01',
      time_range: '09:00~11:00',
      content: '현장 인터뷰',
      method: 'ONSITE',
      pm_name: '김PM',
      expert_name: '이전문가',
    });
    expect(overview.ai_competency_level).toBe('INTERMEDIATE');
    expect(overview.selected_tasks_summary).toBe('품질검사 자동화');

    // HRD PDF 구조 변환 (fileName↔file_name, url↔storage_path, size↔size)
    expect(overview.hrd_report_attachment).toMatchObject({
      file_name: 'hrd-report.pdf',
      storage_path: 'projects/xxx/hrd-abc.pdf',
      size: 1024,
    });
  });

  it('companyRequirements.{status,problem,will,outcomes} 를 snake_case 로 변환한다', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    expect(db.company_details.roadmap_company_requirements).toMatchObject({
      company_status: '제조업 중소기업',
      main_problems: '수작업 품질 검사 편차',
      push_willingness: '경영진 강한 추진 의지',
      expected_outcomes: '품질 불량률 15% 개선',
    });
  });

  it('companyRequirements.remarks 4 키를 JSONB remarks 로 보존한다 (#6)', () => {
    const camel = validRoadmapCamelCase();
    camel.companyRequirements = {
      ...camel.companyRequirements,
      remarks: {
        status: '특이-A',
        problem: '특이-B',
        will: '특이-C',
        outcomes: '특이-D',
      },
    };
    const db = mapRoadmapInterviewToDb(camel);
    expect(db.company_details.roadmap_company_requirements.remarks).toEqual({
      status: '특이-A',
      problem: '특이-B',
      will: '특이-C',
      outcomes: '특이-D',
    });
  });

  it('companyRequirements.remarks 누락 시에도 매퍼는 정상 동작한다', () => {
    const camel = validRoadmapCamelCase();
    delete camel.companyRequirements.remarks;
    const db = mapRoadmapInterviewToDb(camel);
    expect(db.company_details.roadmap_company_requirements).toMatchObject({
      company_status: '제조업 중소기업',
    });
    // remarks 미정의 — undefined 또는 빈 객체 둘 다 허용 (JSONB 직렬화 시 무해)
    const remarks = db.company_details.roadmap_company_requirements.remarks;
    expect(remarks === undefined || Object.keys(remarks).length === 0).toBe(true);
  });

  it('taskAnalysis[] 를 job_tasks[] 로 변환 (legacy 필드명 매핑)', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    expect(db.job_tasks).toHaveLength(1);
    expect(db.job_tasks[0]).toMatchObject({
      roadmap_job: '생산',
      task_name: '완제품 품질 검사',
      task_description: '육안 검사 중심',
      roadmap_problems: '검사자별 편차',
      roadmap_data_availability: '출하 직전, 이미지 2년치',
      roadmap_ai_necessity: 4,
    });
  });

  it('taskAnalysisNote 는 company_details.roadmap_analysis_notes.text 에 저장', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    expect(db.company_details.roadmap_analysis_notes?.text).toBe(
      '대상 과업: 품질검사 자동화 (AI 도입 필요도 4 이상)',
    );
  });

  it('taskAnalysisAttachment 는 analysis_notes.attachment_files[0] 에 단일 객체로 저장', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    const files = db.company_details.roadmap_analysis_notes?.attachment_files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      file_name: 'note-attach.pdf',
      storage_path: 'projects/xxx/note-def.pdf',
    });
  });

  it('targetTask 단일 객체는 improvement_goals[0] 배열 1원소로 저장', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    expect(db.improvement_goals).toHaveLength(1);
    expect(db.improvement_goals[0]).toMatchObject({
      kpi: '품질검사 자동화',
      goal_description: 'AI 도입 필요도 4 이상',
      roadmap_as_is: '육안 검사 중심 / 편차 존재',
      roadmap_to_be: 'AI 1차 검사 + 사람 최종 확인',
    });
  });

  it('competencies[] 를 roadmap_competency_models 로 변환 (legacy 필드명)', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    const models = db.company_details.roadmap_competency_models;
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      competency_name: '품질 검사 데이터 해석',
      competency_definition: '불량 이미지 데이터에서 패턴을 식별한다.',
      knowledge: '이미지 분류 기초',
      skill: '이미지 레이블링',
      attitude: '데이터 기반 의사결정',
    });
  });

  it('ncsUsed=false + ncsDerivationMethod → roadmap_ncs_usage 키명 변환', () => {
    const db = mapRoadmapInterviewToDb(validRoadmapCamelCase());
    expect(db.company_details.roadmap_ncs_usage).toEqual({
      uses_ncs: false,
      competency_derivation_method: '현장 인터뷰 + 업계 벤치마킹',
    });
  });

  it('ncsUsed=true + ncsMethodology → ncs_usage_method 로 저장', () => {
    const data = { ...validRoadmapCamelCase(), ncsUsed: true, ncsMethodology: 'NCS 200107 활용' };
    const db = mapRoadmapInterviewToDb(data);
    expect(db.company_details.roadmap_ncs_usage).toEqual({
      uses_ncs: true,
      ncs_usage_method: 'NCS 200107 활용',
    });
  });

  it('hrdReportPdf=null → overview.hrd_report_attachment=null', () => {
    const data = { ...validRoadmapCamelCase(), hrdReportPdf: null };
    const db = mapRoadmapInterviewToDb(data);
    expect(db.company_details.roadmap_overview.hrd_report_attachment).toBeNull();
  });

  it('taskAnalysisAttachment 가 undefined 면 attachment_files 는 빈 배열', () => {
    const data = { ...validRoadmapCamelCase() };
    delete (data as { taskAnalysisAttachment?: unknown }).taskAnalysisAttachment;
    const db = mapRoadmapInterviewToDb(data);
    expect(db.company_details.roadmap_analysis_notes?.attachment_files).toEqual([]);
  });

  it('data.sttInsights 를 stt_insights 컬럼 update payload 에 포함한다', () => {
    const data: Partial<RoadmapInterviewStrict> = {
      ...validRoadmapCamelCase(),
      sttInsights: {
        추가_업무: ['데이터 정리'],
        추가_페인포인트: ['Excel 수기 복붙'],
        숨은_니즈: ['PDF 자동 분류'],
        조직_맥락: 'TF 신설 직후',
        AI_태도: '호의적이나 보안 우려',
        주요_인용: ['실무자 시간이 부족'],
      },
    };
    const db = mapRoadmapInterviewToDb(data);
    expect(db.stt_insights).toEqual(data.sttInsights);
  });

  it('data.sttInsights 가 undefined 면 stt_insights=null 로 명시한다', () => {
    const data = { ...validRoadmapCamelCase() };
    delete (data as { sttInsights?: unknown }).sttInsights;
    const db = mapRoadmapInterviewToDb(data);
    expect(db.stt_insights).toBeNull();
  });
});

// ============================================================================
// 로드맵 — DB → camelCase
// ============================================================================

describe('mapDbToRoadmapInterview', () => {
  it('DB snake_case row 를 camelCase 로 복원한다 (round-trip 무손실 핵심 필드)', () => {
    const original = validRoadmapCamelCase();
    const db = mapRoadmapInterviewToDb(original);

    // DB row 는 interviews 테이블 형태 — converter 출력을 row 로 가정
    const row = {
      interview_date: '2026-05-01',
      company_details: db.company_details,
      job_tasks: db.job_tasks,
      improvement_goals: db.improvement_goals,
    };

    const restored = mapDbToRoadmapInterview(row);

    // Ⅰ 개요
    expect(restored.establishmentNecessity).toBe(original.establishmentNecessity);
    expect(restored.performanceActivities).toEqual(original.performanceActivities);
    expect(restored.aiLevel).toBe(original.aiLevel);
    expect(restored.selectedTask).toBe(original.selectedTask);

    // HRD PDF — 핵심 3필드만 camelCase 로 복원 (extracted_text / parse_error 는 camelCase 에 노출 X)
    expect(restored.hrdReportPdf).toEqual(original.hrdReportPdf);

    // 기업 요구분석
    expect(restored.companyRequirements).toEqual(original.companyRequirements);

    // 과업 분석 표
    expect(restored.taskAnalysis).toEqual(original.taskAnalysis);
    expect(restored.taskAnalysisNote).toBe(original.taskAnalysisNote);
    expect(restored.taskAnalysisAttachment).toEqual(original.taskAnalysisAttachment);

    // 훈련대상 과업
    expect(restored.targetTask).toEqual(original.targetTask);

    // Ⅲ-1 역량
    expect(restored.competencies).toEqual(original.competencies);
    expect(restored.ncsUsed).toBe(original.ncsUsed);
    expect(restored.ncsDerivationMethod).toBe(original.ncsDerivationMethod);
  });

  it('companyRequirements.remarks 4 키가 round-trip 에서 보존된다 (#6)', () => {
    const original = validRoadmapCamelCase();
    original.companyRequirements = {
      ...original.companyRequirements,
      remarks: { status: 'a', problem: 'b', will: 'c', outcomes: 'd' },
    };
    const db = mapRoadmapInterviewToDb(original);
    const row = {
      company_details: db.company_details,
      job_tasks: db.job_tasks,
      improvement_goals: db.improvement_goals,
    };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.companyRequirements?.remarks).toEqual({
      status: 'a',
      problem: 'b',
      will: 'c',
      outcomes: 'd',
    });
  });

  it('DB extracted_text / parse_error 가 camelCase 의 extractedText / parseError 로 보존된다', () => {
    const row = {
      company_details: {
        roadmap_overview: {
          establishment_necessity: 'x',
          performance_activities: [],
          ai_competency_level: 'BEGINNER',
          selected_tasks_summary: 'x',
          hrd_report_attachment: {
            file_name: 'a.pdf',
            storage_path: 'p/a.pdf',
            mime_type: 'application/pdf',
            size: 100,
            uploaded_at: '2026-05-01T00:00:00Z',
            extracted_text: '내부 전용 파싱 본문',
            parse_error: '',
          },
        },
      },
    };
    const restored = mapDbToRoadmapInterview(row);
    // UI 에 필요한 3필드 + LLM 내부 2필드(extractedText/parseError) 가 모두 전달된다.
    expect(restored.hrdReportPdf).toEqual({
      fileName: 'a.pdf',
      url: 'p/a.pdf',
      size: 100,
      extractedText: '내부 전용 파싱 본문',
      parseError: '',
    });
    // snake_case 원본 키는 camelCase 출력에 노출되지 않음
    expect(restored.hrdReportPdf).not.toHaveProperty('extracted_text');
    expect(restored.hrdReportPdf).not.toHaveProperty('parse_error');
  });

  // Critical 수정 (Task 2.7-b 리뷰) — LLM 프롬프트가 읽을 PDF 본문이 save 시
  // 버려지지 않도록 양방향 왕복에서 extractedText / parseError 가 보존되는지 검증.
  it('hrdReportPdf.extractedText 를 save 할 때 DB 의 extracted_text 로 직렬화한다', () => {
    const data = {
      ...validRoadmapCamelCase(),
      hrdReportPdf: {
        fileName: 'hrd.pdf',
        url: 'p/hrd.pdf',
        size: 1024,
        extractedText: 'PDF 본문: 역량 점수 분포 ...',
        parseError: undefined,
      },
    };
    const db = mapRoadmapInterviewToDb(data);
    const att = db.company_details.roadmap_overview.hrd_report_attachment;
    expect(att).not.toBeNull();
    expect(att?.file_name).toBe('hrd.pdf');
    expect(att?.storage_path).toBe('p/hrd.pdf');
    expect(att?.size).toBe(1024);
    expect(att?.extracted_text).toBe('PDF 본문: 역량 점수 분포 ...');
    // parseError 가 undefined 이면 DB payload 에도 키 미포함
    expect(att).not.toHaveProperty('parse_error');
  });

  it('hrdReportPdf round-trip: camelCase → DB → camelCase 에서 extractedText 보존', () => {
    const pdf = {
      fileName: 'hrd.pdf',
      url: 'p/hrd.pdf',
      size: 2048,
      extractedText: '파싱된 본문 키워드',
      parseError: '파싱 경고: 표 일부 누락',
    };
    const data = { ...validRoadmapCamelCase(), hrdReportPdf: pdf };
    const db = mapRoadmapInterviewToDb(data);
    const row = {
      company_details: db.company_details,
      job_tasks: db.job_tasks,
      improvement_goals: db.improvement_goals,
    };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.hrdReportPdf).toEqual(pdf);
  });

  it('taskAnalysisAttachment.extractedText 도 DB attachment_files[0] 로 직렬화된다', () => {
    const data = {
      ...validRoadmapCamelCase(),
      taskAnalysisAttachment: {
        fileName: 'note-attach.pdf',
        url: 'p/note.pdf',
        extractedText: '분석 노트 본문',
        parseError: '',
      },
    };
    const db = mapRoadmapInterviewToDb(data);
    const files = db.company_details.roadmap_analysis_notes?.attachment_files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      file_name: 'note-attach.pdf',
      storage_path: 'p/note.pdf',
      extracted_text: '분석 노트 본문',
      parse_error: '',
    });
  });

  it('taskAnalysisAttachment round-trip: camelCase → DB → camelCase 에서 extractedText 보존', () => {
    const attachment = {
      fileName: 'note.pdf',
      url: 'p/note.pdf',
      extractedText: '분석 노트 본문 키워드',
      parseError: '',
    };
    const data = { ...validRoadmapCamelCase(), taskAnalysisAttachment: attachment };
    const db = mapRoadmapInterviewToDb(data);
    const row = {
      company_details: db.company_details,
      job_tasks: db.job_tasks,
      improvement_goals: db.improvement_goals,
    };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.taskAnalysisAttachment).toEqual(attachment);
  });

  it('빈 row → 빈 객체 (모든 필드 optional / 기본값)', () => {
    const restored = mapDbToRoadmapInterview({});
    // 필수 필드가 없으면 빈 문자열/빈 배열 기본값으로 복원
    expect(restored.establishmentNecessity).toBe('');
    expect(restored.performanceActivities).toEqual([]);
    expect(restored.taskAnalysis).toEqual([]);
    expect(restored.competencies).toEqual([]);
    expect(restored.ncsUsed).toBe(false);
  });

  it('ncsUsed=true → ncsMethodology 복원', () => {
    const row = {
      company_details: {
        roadmap_ncs_usage: {
          uses_ncs: true,
          ncs_usage_method: 'NCS 200107 활용',
        },
      },
    };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.ncsUsed).toBe(true);
    expect(restored.ncsMethodology).toBe('NCS 200107 활용');
  });

  it('targetTask — improvement_goals[0] 배열 원소를 단일 객체로 복원', () => {
    const row = {
      improvement_goals: [
        {
          kpi: '품질검사 자동화',
          goal_description: 'AI 도입 필요도 4 이상',
          roadmap_as_is: '육안 검사',
          roadmap_to_be: 'AI 1차 검사',
        },
      ],
    };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.targetTask).toEqual({
      name: '품질검사 자동화',
      reason: 'AI 도입 필요도 4 이상',
      expectedAsIs: '육안 검사',
      expectedToBe: 'AI 1차 검사',
    });
  });

  it('row.stt_insights 를 camelCase sttInsights 키로 그대로 노출한다', () => {
    const stt = {
      추가_업무: ['데이터 정리', '주간 보고 자동화'],
      추가_페인포인트: ['Excel 수기 복붙'],
      숨은_니즈: ['PDF 자동 분류'],
      조직_맥락: 'TF 신설 직후',
      AI_태도: '호의적이나 보안 우려',
      주요_인용: ['실무자 시간이 부족'],
    };
    const row = { stt_insights: stt };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.sttInsights).toEqual(stt);
  });

  it('row.stt_insights 가 null 이면 sttInsights 키는 결과에 등장하지 않는다', () => {
    const row = { stt_insights: null };
    const restored = mapDbToRoadmapInterview(row);
    expect(restored.sttInsights).toBeUndefined();
  });
});

// ============================================================================
// PBL — camelCase → DB
// ============================================================================

function validPBLCamelCase(): PBLInterviewStrict {
  return {
    // Ⅰ 훈련과정 개요
    companyName: '테스트 기업',
    courseName: 'AI 현장 문제해결 과정',
    ncsCode: '200107',
    trainingHours: 40,
    trainingTarget: '생산팀 주임급',
    trainingForm: '사내·집체',
    trainingPeriod: '2026-05 ~ 2026-06',
    businessIssues: '경영 이슈: 품질 불량률 상승',

    // Ⅱ 훈련 요구 분석
    companyIssues: '제조 공정 전반 품질 편차',
    organization: {
      orgTree: [
        { id: 'root', name: '대표이사', children: [] },
      ],
      mainWork: [
        { dept: '생산', role: '품질검사', description: '출하 전 품질검사' },
      ],
    },
    trainingEnv: {
      properTrainingHours: '',
      internalPlace: '사내 교육장 보유',
      externalPlace: '',
      internalInstructors: [],
      externalInstructors: [],
      aiInfrastructure: 'AI 도구 가능',
    },
    hrdReportPdf: {
      fileName: 'pbl-hrd.pdf',
      url: 'projects/yyy/pbl-hrd.pdf',
      size: 2048,
    },
    courseNecessity: 'AI 도입을 통한 품질 편차 개선 필요',

    // Ⅲ AI기반 훈련과제 도출
    activities: [
      // R8 PBL-자체-03 — 평면 4행 배열
      { round: 1, role: 'PM' as const, personName: '홍길동', date: '2026-05-15', content: '1차 수행활동', method: '대면' },
      { round: 1, role: 'EXTERNAL_EXPERT' as const, personName: '', date: '2026-05-15', content: '1차 수행활동', method: '대면' },
      { round: 1, role: 'INTERNAL_EXPERT' as const, personName: '김철수', date: '2026-05-15', content: '1차 수행활동', method: '대면' },
      { round: 1, role: 'JURISDICTION_MANAGER' as const, personName: '', date: '2026-05-15', content: '1차 수행활동', method: '대면' },
    ],
    problemDefinitionSheet: {
      background: '검사자별 편차 발생, 고객 클레임 증가.',
      core: '품질 편차',
      scope: '생산·품질 부서',
      constraints: '예산·일정 한계',
    },
    priority: {
      items: [{ problem: '품질 편차', score: 5, rank: 1 }],
      method: 'AHP',
    },
    target: {
      name: '품질검사 자동화',
      code: '200107',
      scope: '생산팀 15명',
      necessity: '검사 편차 해결',
      necessity_score: 5,
      details: [
        {
          title: '품질 검사 자동화',
          as_is: '육안 검사',
          to_be: 'AI 비전 자동 검사',
          required_knowledge: '결함 유형 카탈로그',
          required_skill: 'CV 모델 운영',
        },
      ],
    },
    currentAiLevel: { level: 'BASIC', note: '일부 임직원 ChatGPT 활용' },
    expectedAiLevel: { level: 'USER', note: '부서 단위 AI 도구 활용' },
  };
}

describe('mapPBLInterviewToDb', () => {
  it('camelCase PBL 인터뷰를 pbl_data JSONB 하나에 통째 저장한다', () => {
    const input = validPBLCamelCase();
    const db = mapPBLInterviewToDb(input);

    // pbl_data 에 camelCase 가 그대로 보존 (Record<string, unknown> 로 반환되므로 단언 필요)
    const pbl = db.pbl_data as PBLInterviewStrict;
    expect(pbl.companyName).toBe('테스트 기업');
    expect(pbl.courseName).toBe('AI 현장 문제해결 과정');
    expect(pbl.organization?.orgTree[0].name).toBe('대표이사');
    expect(pbl.target.name).toBe('품질검사 자동화');
    expect(pbl.currentAiLevel.level).toBe('BASIC');
    expect(pbl.expectedAiLevel.level).toBe('USER');
  });

  it('round-trip: DB→camelCase→DB 무손실', () => {
    const original = validPBLCamelCase();
    const db1 = mapPBLInterviewToDb(original);
    const restored = mapDbToPBLInterview({ pbl_data: db1.pbl_data });
    const db2 = mapPBLInterviewToDb(restored as PBLInterviewStrict);
    expect(db2.pbl_data).toEqual(db1.pbl_data);
  });
});

// ============================================================================
// PBL — DB → camelCase
// ============================================================================

describe('mapDbToPBLInterview', () => {
  it('pbl_data JSONB 를 camelCase 로 복원 (통째 스루)', () => {
    const original = validPBLCamelCase();
    const row = { pbl_data: original };
    const restored = mapDbToPBLInterview(row);
    expect(restored).toEqual(original);
  });

  it('pbl_data=null → 빈 객체 반환', () => {
    const restored = mapDbToPBLInterview({ pbl_data: null });
    expect(restored).toEqual({});
  });

  it('row=null → 빈 객체 반환', () => {
    const restored = mapDbToPBLInterview(null);
    expect(restored).toEqual({});
  });
});
