import { z } from 'zod';

// ============================================================================
// 로드맵 수동 편집용 Zod 스키마
// roadmap-types.ts 타입 정의와 1:1 대응
// ============================================================================

// RoadmapMatrixCell
const roadmapMatrixCellSchema = z.object({
  course_name: z.string().min(1),
  recommended_hours: z.number().positive(),
});

// RoadmapRow
const roadmapRowSchema = z.object({
  task_id: z.string().min(1),
  task_name: z.string().min(1),
  beginner: z.array(roadmapMatrixCellSchema),
  intermediate: z.array(roadmapMatrixCellSchema),
  advanced: z.array(roadmapMatrixCellSchema),
});

// CurriculumModule
const curriculumModuleSchema = z.object({
  module_name: z.string().min(1),
  hours: z.number().positive(),
  details: z.array(z.string()),
  practice: z.string(),
});

// 도구 스키마 (공통)
const toolSchema = z.object({
  name: z.string(),
  free_tier_info: z.string(),
});

// RoadmapCell (과정 상세)
const roadmapCellSchema = z.object({
  course_name: z.string().min(1),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  target_task: z.string(),
  target_audience: z.string(),
  recommended_hours: z.number().positive(),
  curriculum: z.array(curriculumModuleSchema),
  tools: z.array(toolSchema),
  expected_outcome: z.string(),
  measurement_method: z.string(),
  prerequisites: z.array(z.string()),
});

// PBLCurriculumModule (CurriculumModule 확장)
const pblCurriculumModuleSchema = curriculumModuleSchema.extend({
  deliverables: z.array(z.string()),
  tools: z.array(toolSchema),
});

// PBLCourse
const pblCourseSchema = z.object({
  selected_course_name: z.string().min(1),
  selected_course_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  selected_course_task: z.string(),
  selection_rationale: z.object({
    consultant_expertise_fit: z.string(),
    pain_point_alignment: z.string(),
    feasibility_assessment: z.string(),
    summary: z.string(),
  }),
  course_name: z.string().min(1),
  total_hours: z.number().positive(),
  target_tasks: z.array(z.string()),
  target_audience: z.string(),
  curriculum: z.array(pblCurriculumModuleSchema),
  final_deliverables: z.array(z.string()),
  expected_outcomes: z.array(z.string()),
  business_impact: z.string(),
  measurement_methods: z.array(z.string()),
  prerequisites: z.array(z.string()),
});

// editRoadmapManually updates 스키마
export const editRoadmapUpdatesSchema = z
  .object({
    diagnosis_summary: z.string().max(5000).optional(),
    roadmap_matrix: z.array(roadmapRowSchema).optional(),
    pbl_course: pblCourseSchema.optional(),
    courses: z.array(roadmapCellSchema).optional(),
  })
  .refine(
    (data) =>
      data.diagnosis_summary !== undefined ||
      data.roadmap_matrix !== undefined ||
      data.pbl_course !== undefined ||
      data.courses !== undefined,
    { message: '수정할 항목이 최소 하나 이상 필요합니다.' }
  );
