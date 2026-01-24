/**
 * XLSX 내보내기 서비스
 * 로드맵 데이터를 Excel 파일로 변환
 */

import * as XLSX from 'xlsx';
import type { RoadmapExportData } from './export-pdf';

/**
 * XLSX 생성
 */
export function generateXLSX(data: RoadmapExportData): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // 시트 1: 개요
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
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);

  // 컬럼 너비 설정
  overviewSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];

  // 병합 셀 설정
  overviewSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // 제목
    { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } }, // 진단 요약 제목
    { s: { r: 10, c: 0 }, e: { r: 10, c: 1 } }, // 진단 요약 내용
  ];

  XLSX.utils.book_append_sheet(workbook, overviewSheet, '개요');

  // 시트 2: NxM 매트릭스
  const matrixHeader = [
    '업무',
    '초급 과정',
    '초급 시간',
    '중급 과정',
    '중급 시간',
    '고급 과정',
    '고급 시간',
  ];

  const matrixRows = data.roadmapMatrix.map(row => [
    row.task_name,
    row.beginner?.course_name || '-',
    row.beginner?.recommended_hours || '-',
    row.intermediate?.course_name || '-',
    row.intermediate?.recommended_hours || '-',
    row.advanced?.course_name || '-',
    row.advanced?.recommended_hours || '-',
  ]);

  const matrixData = [matrixHeader, ...matrixRows];
  const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);

  matrixSheet['!cols'] = [
    { wch: 25 }, // 업무
    { wch: 30 }, // 초급 과정
    { wch: 10 }, // 초급 시간
    { wch: 30 }, // 중급 과정
    { wch: 10 }, // 중급 시간
    { wch: 30 }, // 고급 과정
    { wch: 10 }, // 고급 시간
  ];

  XLSX.utils.book_append_sheet(workbook, matrixSheet, 'NxM 매트릭스');

  // 시트 3: PBL 과정
  const pblOverview = [
    ['PBL 최적 과정'],
    [],
    ['과정명', data.pblCourse.course_name],
    ['총 시간', `${data.pblCourse.total_hours}시간`],
    ['교육 대상', data.pblCourse.target_audience],
    ['대상 업무', data.pblCourse.target_tasks?.join(', ') || '-'],
    [],
    ['커리큘럼'],
  ];

  const pblCurriculumHeader = ['모듈명', '시간', '설명', '실습', '사용 도구', '무료 범위'];
  const pblCurriculumRows = data.pblCourse.curriculum?.map(module => [
    module.module_name,
    module.hours,
    module.description,
    module.practice,
    module.tools?.map(t => t.name).join(', ') || '-',
    module.tools?.map(t => t.free_tier_info).join(', ') || '-',
  ]) || [];

  const pblData = [
    ...pblOverview,
    pblCurriculumHeader,
    ...pblCurriculumRows,
    [],
    ['기대 효과'],
    ...(data.pblCourse.expected_outcomes?.map(o => [o]) || []),
    [],
    ['측정 방법'],
    ...(data.pblCourse.measurement_methods?.map(m => [m]) || []),
    [],
    ['준비물'],
    ...(data.pblCourse.prerequisites?.map(p => [p]) || []),
  ];

  const pblSheet = XLSX.utils.aoa_to_sheet(pblData);
  pblSheet['!cols'] = [
    { wch: 25 },
    { wch: 10 },
    { wch: 40 },
    { wch: 40 },
    { wch: 25 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, pblSheet, 'PBL 과정');

  // 시트 4: 과정 상세
  const coursesHeader = [
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

  const coursesRows = data.courses.map(course => [
    course.course_name,
    course.level === 'BEGINNER' ? '초급' : course.level === 'INTERMEDIATE' ? '중급' : '고급',
    course.target_task,
    course.target_audience,
    course.recommended_hours,
    course.curriculum?.join('\n') || '-',
    course.practice_assignments?.join('\n') || '-',
    course.tools?.map(t => t.name).join(', ') || '-',
    course.tools?.map(t => t.free_tier_info).join(', ') || '-',
    course.expected_outcome,
    course.measurement_method,
    course.prerequisites?.join(', ') || '-',
  ]);

  const coursesData = [coursesHeader, ...coursesRows];
  const coursesSheet = XLSX.utils.aoa_to_sheet(coursesData);

  coursesSheet['!cols'] = [
    { wch: 25 }, // 과정명
    { wch: 8 },  // 레벨
    { wch: 20 }, // 대상 업무
    { wch: 15 }, // 교육 대상
    { wch: 10 }, // 권장 시간
    { wch: 40 }, // 커리큘럼
    { wch: 40 }, // 실습/과제
    { wch: 25 }, // 사용 도구
    { wch: 30 }, // 무료 범위
    { wch: 30 }, // 기대 효과
    { wch: 25 }, // 측정 방법
    { wch: 25 }, // 준비물
  ];

  XLSX.utils.book_append_sheet(workbook, coursesSheet, '과정 상세');

  // 시트 5: 도구 목록 (무료 범위 정리)
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

  const toolsHeader = ['도구명', '무료 범위'];
  const toolsRows = Array.from(toolsSet.entries()).map(([name, info]) => [name, info]);
  const toolsData = [
    ['사용 도구 및 무료 범위'],
    [],
    toolsHeader,
    ...toolsRows,
  ];

  const toolsSheet = XLSX.utils.aoa_to_sheet(toolsData);
  toolsSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
  toolsSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  XLSX.utils.book_append_sheet(workbook, toolsSheet, '도구 목록');

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
