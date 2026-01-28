'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FlaskConical, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';
import { getLevelLabel, getLevelColorClass } from '@/lib/utils/roadmap';

interface TestRoadmapResultProps {
  result: RoadmapResult;
  validation: ValidationResult;
  companyName: string;
  industry: string;
  onReset: () => void;
}

export default function TestRoadmapResult({
  result,
  validation,
  companyName,
  industry,
  onReset,
}: TestRoadmapResultProps) {
  const [showValidation, setShowValidation] = useState(false);

  const hasValidationNotes = validation.errors.length > 0 || validation.warnings.length > 0;

  return (
    <div className="space-y-6 break-keep">
      {/* 테스트 모드 배너 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800">테스트 로드맵</h3>
          <p className="text-sm text-amber-700 mt-1">
            이 로드맵은 테스트 목적으로 생성되었습니다. 실제 기업 진단 결과가 아닌 입력된 정보만을
            기반으로 생성되었으므로 참고용으로만 활용하세요.
          </p>
        </div>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{companyName}</h2>
          <p className="text-gray-500">{industry}</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          새 테스트 시작
        </Button>
      </div>

      {/* 진단 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>진단 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{result.diagnosis_summary}</p>
        </CardContent>
      </Card>

      {/* 로드맵 탭 */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">과정 체계도</TabsTrigger>
          <TabsTrigger value="courses">과정 상세</TabsTrigger>
          <TabsTrigger value="pbl">PBL 과정</TabsTrigger>
        </TabsList>

        {/* 과정 체계도 */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>업무별 교육 로드맵 매트릭스</CardTitle>
              <CardDescription>
                세부업무별 초급/중급/고급 교육 과정을 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-3 text-left font-medium">업무</th>
                      <th className="border p-3 text-center font-medium text-green-700">초급</th>
                      <th className="border p-3 text-center font-medium text-blue-700">중급</th>
                      <th className="border p-3 text-center font-medium text-purple-700">고급</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.roadmap_matrix.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border p-3 font-medium">{row.task_name}</td>
                        <td className="border p-3 text-center">
                          {row.beginner && row.beginner.length > 0 ? (
                            <div className="space-y-2">
                              {row.beginner.map((course, idx) => (
                                <div key={idx} className="text-sm">
                                  <p className="font-medium">{course.course_name}</p>
                                  <p className="text-gray-500">{course.recommended_hours}시간</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="border p-3 text-center">
                          {row.intermediate && row.intermediate.length > 0 ? (
                            <div className="space-y-2">
                              {row.intermediate.map((course, idx) => (
                                <div key={idx} className="text-sm">
                                  <p className="font-medium">{course.course_name}</p>
                                  <p className="text-gray-500">{course.recommended_hours}시간</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="border p-3 text-center">
                          {row.advanced && row.advanced.length > 0 ? (
                            <div className="space-y-2">
                              {row.advanced.map((course, idx) => (
                                <div key={idx} className="text-sm">
                                  <p className="font-medium">{course.course_name}</p>
                                  <p className="text-gray-500">{course.recommended_hours}시간</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PBL 과정 */}
        <TabsContent value="pbl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{result.pbl_course.course_name}</CardTitle>
                  <CardDescription>총 {result.pbl_course.total_hours}시간 PBL 과정</CardDescription>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  PBL 최적 과정
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 선정된 과정 정보 */}
              {result.pbl_course.selected_course_name && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-900 mb-2">선정된 과정</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-indigo-800">
                      {result.pbl_course.selected_course_name}
                    </span>
                    {result.pbl_course.selected_course_level && (
                      <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                        {getLevelLabel(result.pbl_course.selected_course_level)}
                      </Badge>
                    )}
                    {result.pbl_course.selected_course_task && (
                      <Badge variant="secondary" className="text-indigo-700">
                        {result.pbl_course.selected_course_task}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* 선정 이유 */}
              {result.pbl_course.selection_rationale && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-3">PBL 과정 선정 이유</h4>
                  <div className="space-y-3">
                    {result.pbl_course.selection_rationale.consultant_expertise_fit && (
                      <div>
                        <span className="text-xs font-medium text-amber-800 uppercase">
                          컨설턴트 전문성 적합도
                        </span>
                        <p className="text-sm text-amber-900 mt-0.5">
                          {result.pbl_course.selection_rationale.consultant_expertise_fit}
                        </p>
                      </div>
                    )}
                    {result.pbl_course.selection_rationale.pain_point_alignment && (
                      <div>
                        <span className="text-xs font-medium text-amber-800 uppercase">
                          페인포인트 연관성
                        </span>
                        <p className="text-sm text-amber-900 mt-0.5">
                          {result.pbl_course.selection_rationale.pain_point_alignment}
                        </p>
                      </div>
                    )}
                    {result.pbl_course.selection_rationale.feasibility_assessment && (
                      <div>
                        <span className="text-xs font-medium text-amber-800 uppercase">
                          현실 가능성 평가
                        </span>
                        <p className="text-sm text-amber-900 mt-0.5">
                          {result.pbl_course.selection_rationale.feasibility_assessment}
                        </p>
                      </div>
                    )}
                    {result.pbl_course.selection_rationale.summary && (
                      <div className="pt-2 border-t border-amber-200">
                        <span className="text-xs font-medium text-amber-800 uppercase">
                          종합 선정 이유
                        </span>
                        <p className="text-sm text-amber-900 mt-0.5 font-medium">
                          {result.pbl_course.selection_rationale.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 대상 */}
              <div>
                <h4 className="font-medium mb-2">교육 대상</h4>
                <p className="text-gray-600">{result.pbl_course.target_audience}</p>
              </div>

              {/* 대상 업무 */}
              <div>
                <h4 className="font-medium mb-2">대상 업무</h4>
                <div className="flex flex-wrap gap-2">
                  {result.pbl_course.target_tasks.map((task, index) => (
                    <Badge key={index} variant="secondary">
                      {task}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 커리큘럼 */}
              <div>
                <h4 className="font-medium mb-3">커리큘럼</h4>
                <div className="space-y-3">
                  {result.pbl_course.curriculum.map((module, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{module.module_name}</h5>
                        <Badge variant="outline">{module.hours}시간</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">실습:</span> {module.practice}
                      </p>
                      {module.deliverables && module.deliverables.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-green-700 uppercase">모듈 결과물</span>
                          <ul className="list-disc list-inside text-sm text-green-600 mt-1">
                            {module.deliverables.map((deliverable, dIndex) => (
                              <li key={dIndex}>{deliverable}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {module.tools && module.tools.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {module.tools.map((tool, toolIndex) => (
                            <Badge key={toolIndex} variant="outline" className="text-xs">
                              {tool.name}
                              {tool.free_tier_info && (
                                <span className="text-gray-400 ml-1">({tool.free_tier_info})</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 최종 산출물 */}
              {result.pbl_course.final_deliverables && result.pbl_course.final_deliverables.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">최종 산출물</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.pbl_course.final_deliverables.map((deliverable, index) => (
                      <li key={index} className="text-sm text-green-800">
                        {deliverable}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 비즈니스 임팩트 */}
              {result.pbl_course.business_impact && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">비즈니스 임팩트</h4>
                  <p className="text-sm text-blue-800">{result.pbl_course.business_impact}</p>
                </div>
              )}

              {/* 기대 효과 */}
              <div>
                <h4 className="font-medium mb-2">기대 효과</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.pbl_course.expected_outcomes.map((outcome, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 측정 방법 */}
              <div>
                <h4 className="font-medium mb-2">측정 방법</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.pbl_course.measurement_methods.map((method, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {method}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 준비물 */}
              {result.pbl_course.prerequisites && result.pbl_course.prerequisites.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">준비물</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.pbl_course.prerequisites.map((prereq, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 과정 상세 */}
        <TabsContent value="courses">
          <div className="space-y-4">
            {result.courses.map((course, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{course.course_name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className={getLevelColorClass(course.level)}
                      >
                        {getLevelLabel(course.level)}
                      </Badge>
                      <Badge variant="outline">{course.recommended_hours}시간</Badge>
                    </div>
                  </div>
                  <CardDescription>대상 업무: {course.target_task}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h5 className="font-medium text-sm mb-1">교육 대상</h5>
                    <p className="text-sm text-gray-600">{course.target_audience}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm mb-1">커리큘럼</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {course.curriculum.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-600">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm mb-1">실습/과제</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {course.practice_assignments.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-600">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm mb-1">사용 도구</h5>
                    <div className="flex flex-wrap gap-2">
                      {course.tools.map((tool, toolIndex) => (
                        <Badge key={toolIndex} variant="secondary" className="text-xs">
                          {tool.name}
                          {tool.free_tier_info && (
                            <span className="text-gray-400 ml-1">({tool.free_tier_info})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-sm mb-1">기대 효과</h5>
                      <p className="text-sm text-gray-600">{course.expected_outcome}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-1">측정 방법</h5>
                      <p className="text-sm text-gray-600">{course.measurement_method}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 참고사항 (검증 결과) - 하단에 부드럽게 표시 */}
      {hasValidationNotes && (
        <div className="border border-gray-200 rounded-lg">
          <button
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            onClick={() => setShowValidation(!showValidation)}
          >
            <div className="flex items-center gap-2 text-amber-600">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">
                검토 필요 사항({validation.errors.length + validation.warnings.length}건)
              </span>
            </div>
            {showValidation ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {showValidation && (
            <div className="px-4 pb-4 space-y-3">
              <ul className="space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    {error}
                  </li>
                ))}
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
