/**
 * XLSX 내보내기 서비스
 * 로드맵 데이터를 Excel 파일로 변환
 */

import * as XLSX from 'xlsx';
import type { RoadmapExportData } from './export-pdf';
import type { PBLCourse } from './roadmap';
import {
  getLevelLabel,
  formatMatrixCourseNames,
  formatMatrixCourseHours,
} from '@/lib/utils/roadmap';

// ============================================================================
// PBL 데이터 추출 헬퍼 함수들
// ============================================================================

interface PBLExtendedFields {
  selected_course_name?: string;
  selected_course_level?: string;
  selected_course_task?: string;
  selection_rationale?: {
    consultant_expertise_fit?: string;
    pain_point_alignment?: string;
    feasibility_assessment?: string;
    summary?: string;
  };
  final_deliverables?: string[];
  business_impact?: string;
}

interface PBLModuleExtended {
  module_name: string;
  hours: number;
  description: string;
  practice: string;
  deliverables?: string[];
  tools?: { name: string; free_tier_info: string }[];
}

/**
 * PBL 과정에서 확장 필드 추출
 */
function extractPBLExtendedFields(pblCourse: PBLCourse): PBLExtendedFields {
  const extended = pblCourse as unknown as PBLExtendedFields;
  return {
    selected_course_name: extended.selected_course_name,
    selected_course_level: extended.selected_course_level,
    selected_course_task: extended.selected_course_task,
    selection_rationale: extended.selection_rationale,
    final_deliverables: extended.final_deliverables,
    business_impact: extended.business_impact,
  };
}

/**
 * PBL 커리큘럼 모듈에서 확장 필드 추출
 */
function extractModuleDeliverables(
  module: PBLCourse['curriculum'][number]
): string[] | undefined {
  const extended = module as unknown as PBLModuleExtended;
  return extended.deliverables;
}

// ============================================================================
// 시트 생성 함수들
// ============================================================================

/**
 * 개요 시트 생성
 */
function createOverviewSheet(
  data: RoadmapExportData
): XLSX.WorkSheet {
  const overviewData = [
    ['AI 교육 로드맵'],
    [],
    ['기업명', data.companyName],
    ['프로젝트 ID', data.projectId],
    ['버전', `v${data.versionNumber}`],
    ['상태', data.status === 'DRAFT' ? '초안' : data.status === 'FINAL' ? '확정' : '보관'],
    ['생성일', new Date(data.createdAt).toLocaleDateString('ko-KR')],
    ['확정일', data.finalizedAt ? new Date(data.finalizedAt).toLocaleDateString('ko-KR') : '-'],
    [],
    ['진단 요약'],
    [data.diagnosisSummary],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(overviewData);
  sheet['!cols'] = [{ wch: 20 }, { wch: 60 }];
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 1 } },
  ];

  return sheet;
}

/**
 * NxM 매트릭스 시트 생성
 */
function createMatrixSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const header = [
    '업무',
    '초급 과정',
    '초급 시간',
    '중급 과정',
    '중급 시간',
    '고급 과정',
    '고급 시간',
  ];

  const rows = data.roadmapMatrix.map(row => [
    row.task_name,
    formatMatrixCourseNames(row.beginner),
    formatMatrixCourseHours(row.beginner),
    formatMatrixCourseNames(row.intermediate),
    formatMatrixCourseHours(row.intermediate),
    formatMatrixCourseNames(row.advanced),
    formatMatrixCourseHours(row.advanced),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 10 },
    { wch: 30 },
    { wch: 10 },
    { wch: 30 },
    { wch: 10 },
  ];

  return sheet;
}

/**
 * PBL 과정 시트 생성
 */
function createPBLSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const extended = extractPBLExtendedFields(data.pblCourse);
  const { selection_rationale: rationale } = extended;

  // 선정된 과정 정보
  const selectionInfo = [
    ['PBL 최적 과정'],
    [],
    ['[선정된 과정 정보]'],
    ['선정된 과정명', extended.selected_course_name || '-'],
    ['선정된 과정 레벨', extended.selected_course_level ? getLevelLabel(extended.selected_course_level) : '-'],
    ['선정된 과정 업무', extended.selected_course_task || '-'],
    [],
    ['[PBL 과정 선정 이유]'],
    ['컨설턴트 전문성 적합도', rationale?.consultant_expertise_fit || '-'],
    ['페인포인트 연관성', rationale?.pain_point_alignment || '-'],
    ['현실 가능성 평가', rationale?.feasibility_assessment || '-'],
    ['종합 선정 이유', rationale?.summary || '-'],
    [],
    ['[PBL 과정 정보]'],
    ['과정명', data.pblCourse.course_name],
    ['총 시간', `${data.pblCourse.total_hours}시간`],
    ['교육 대상', data.pblCourse.target_audience],
    ['대상 업무', data.pblCourse.target_tasks?.join(', ') || '-'],
    [],
    ['[커리큘럼]'],
  ];

  // 커리큘럼
  const curriculumHeader = ['모듈명', '시간', '세부 커리큘럼', '실습', '모듈 결과물', '사용 도구', '무료 범위'];
  const curriculumRows = data.pblCourse.curriculum?.map(module => {
    const deliverables = extractModuleDeliverables(module);
    const details = module.details?.map(d => `- ${d}`).join('\n') || '-';
    return [
      module.module_name,
      module.hours,
      details,
      module.practice,
      deliverables?.join(', ') || '-',
      module.tools?.map(t => t.name).join(', ') || '-',
      module.tools?.map(t => t.free_tier_info).join(', ') || '-',
    ];
  }) || [];

  // 최종 산출물 및 기타 정보
  const additionalInfo = [
    [],
    ['[최종 산출물]'],
    ...(extended.final_deliverables?.map(d => [d]) || [['(없음)']]),
    [],
    ['[비즈니스 임팩트]'],
    [extended.business_impact || '-'],
    [],
    ['[기대 효과]'],
    ...(data.pblCourse.expected_outcomes?.map(o => [o]) || []),
    [],
    ['[측정 방법]'],
    ...(data.pblCourse.measurement_methods?.map(m => [m]) || []),
    [],
    ['[준비물]'],
    ...(data.pblCourse.prerequisites?.map(p => [p]) || []),
  ];

  const pblData = [
    ...selectionInfo,
    curriculumHeader,
    ...curriculumRows,
    ...additionalInfo,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(pblData);
  sheet['!cols'] = [
    { wch: 25 },
    { wch: 10 },
    { wch: 40 },
    { wch: 40 },
    { wch: 30 },
    { wch: 25 },
    { wch: 30 },
  ];

  return sheet;
}

/**
 * 과정 상세 시트 생성
 */
function createCoursesSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const header = [
    '과정명',
    '레벨',
    '대상 업무',
    '교육 대상',
    '권장 시간',
    '커리큘럼',
    '실습/과제',
    '사용 도구',
    '무료 범위',
    '기대 효과',
    '측정 방법',
    '준비물',
  ];

  const rows = data.courses.map(course => {
    // 커리큘럼 모듈을 문자열로 변환
    const curriculumStr = course.curriculum?.map(m => {
      const details = m.details?.map(d => `  - ${d}`).join('\n') || '';
      return `[${m.hours}H] ${m.module_name}${details ? '\n' + details : ''}`;
    }).join('\n\n') || '-';

    // 실습/과제를 문자열로 변환
    const practiceStr = course.curriculum?.map(m =>
      m.practice ? `[${m.module_name}] ${m.practice}` : null
    ).filter(Boolean).join('\n') || '-';

    return [
      course.course_name,
      getLevelLabel(course.level),
      course.target_task,
      course.target_audience,
      course.recommended_hours,
      curriculumStr,
      practiceStr,
      course.tools?.map(t => t.name).join(', ') || '-',
      course.tools?.map(t => t.free_tier_info).join(', ') || '-',
      course.expected_outcome,
      course.measurement_method,
      course.prerequisites?.join(', ') || '-',
    ];
  });

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [
    { wch: 25 },
    { wch: 8 },
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
    { wch: 40 },
    { wch: 40 },
    { wch: 25 },
    { wch: 30 },
    { wch: 30 },
    { wch: 25 },
    { wch: 25 },
  ];

  return sheet;
}

/**
 * 도구 목록 시트 생성
 */
function createToolsSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const toolsSet = new Map<string, string>();

  // 모든 과정에서 도구 수집
  data.courses.forEach(course => {
    course.tools?.forEach(tool => {
      if (!toolsSet.has(tool.name)) {
        toolsSet.set(tool.name, tool.free_tier_info);
      }
    });
  });

  // PBL 과정에서 도구 수집
  data.pblCourse.curriculum?.forEach(module => {
    module.tools?.forEach(tool => {
      if (!toolsSet.has(tool.name)) {
        toolsSet.set(tool.name, tool.free_tier_info);
      }
    });
  });

  const header = ['도구명', '무료 범위'];
  const rows = Array.from(toolsSet.entries()).map(([name, info]) => [name, info]);

  const toolsData = [
    ['사용 도구 및 무료 범위'],
    [],
    header,
    ...rows,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(toolsData);
  sheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  return sheet;
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * XLSX 생성
 */
export function generateXLSX(data: RoadmapExportData): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // 시트 추가
  XLSX.utils.book_append_sheet(workbook, createOverviewSheet(data), '개요');
  XLSX.utils.book_append_sheet(workbook, createMatrixSheet(data), 'NxM 매트릭스');
  XLSX.utils.book_append_sheet(workbook, createPBLSheet(data), 'PBL 과정');
  XLSX.utils.book_append_sheet(workbook, createCoursesSheet(data), '과정 상세');
  XLSX.utils.book_append_sheet(workbook, createToolsSheet(data), '도구 목록');

  // Uint8Array로 변환
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

/**
 * 브라우저에서 다운로드 실행
 */
export function downloadXLSX(data: RoadmapExportData, filename: string): void {
  const buffer = generateXLSX(data);

  // 새 ArrayBuffer로 복사하여 Blob 생성
  const newBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(newBuffer);
  view.set(buffer);

  const blob = new Blob([newBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
