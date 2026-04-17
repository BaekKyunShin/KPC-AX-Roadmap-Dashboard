'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyTrainingHistoryItem,
  createEmptySupportHistoryItem,
  createEmptyRecommendation,
  type PBLHrdNecessity,
} from '@/lib/schemas/interview-pbl';

interface StepPBLHrdNecessityProps {
  value: PBLHrdNecessity;
  onChange: (next: PBLHrdNecessity) => void;
}

const MAX_RECOMMENDATIONS = 3;

export default function StepPBLHrdNecessity({ value, onChange }: StepPBLHrdNecessityProps) {
  // ---- 훈련 이력 (training_history) ----
  const updateTrainingHistory = (
    index: number,
    next: Partial<PBLHrdNecessity['training_history'][number]>
  ) => {
    const training_history = value.training_history.map((item, i) =>
      i === index ? { ...item, ...next } : item
    );
    onChange({ ...value, training_history });
  };
  const addTrainingHistory = () => {
    onChange({
      ...value,
      training_history: [...value.training_history, createEmptyTrainingHistoryItem()],
    });
  };
  const removeTrainingHistory = (index: number) => {
    onChange({
      ...value,
      training_history: value.training_history.filter((_, i) => i !== index),
    });
  };

  // ---- 지원 이력 (support_history) ----
  const updateSupportHistory = (
    index: number,
    next: Partial<PBLHrdNecessity['support_history'][number]>
  ) => {
    const support_history = value.support_history.map((item, i) =>
      i === index ? { ...item, ...next } : item
    );
    onChange({ ...value, support_history });
  };
  const addSupportHistory = () => {
    onChange({
      ...value,
      support_history: [...value.support_history, createEmptySupportHistoryItem()],
    });
  };
  const removeSupportHistory = (index: number) => {
    onChange({
      ...value,
      support_history: value.support_history.filter((_, i) => i !== index),
    });
  };

  // ---- 추천 과정 (recommendations) ----
  const updateRecommendation = (
    index: number,
    next: Partial<PBLHrdNecessity['recommendations'][number]>
  ) => {
    const recommendations = value.recommendations.map((item, i) =>
      i === index ? { ...item, ...next } : item
    );
    onChange({ ...value, recommendations });
  };
  const addRecommendation = () => {
    if (value.recommendations.length >= MAX_RECOMMENDATIONS) return;
    const nextRank =
      Math.min(value.recommendations.length + 1, MAX_RECOMMENDATIONS) || 1;
    onChange({
      ...value,
      recommendations: [
        ...value.recommendations,
        { ...createEmptyRecommendation(), rank: nextRank },
      ],
    });
  };
  const removeRecommendation = (index: number) => {
    onChange({
      ...value,
      recommendations: value.recommendations.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Ⅱ-3. AI 과정개발의 필요성
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 양식 Ⅱ-3 (양식 2번 6p). 훈련 실시·지원 이력, 추천훈련사업, AI훈련과정 개발 필요성을 입력하세요.
        </p>
      </div>

      {/* 훈련 이력 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">최근 훈련 이력</h3>
            <p className="text-xs text-muted-foreground mt-1">
              프로그램·과정명·훈련방법·훈련일수를 행 단위로 입력하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTrainingHistory}>
            <Plus className="w-4 h-4 mr-1" />
            이력 추가
          </Button>
        </div>

        {value.training_history.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 훈련 이력이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.training_history.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    훈련 이력 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`훈련 이력 ${index + 1} 삭제`}
                    onClick={() => removeTrainingHistory(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`th-seq-${item.id}`}>순번</Label>
                    <Input
                      id={`th-seq-${item.id}`}
                      type="number"
                      min={0}
                      value={item.seq || ''}
                      onChange={(e) =>
                        updateTrainingHistory(index, {
                          seq: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`th-program-${item.id}`}>프로그램</Label>
                    <Input
                      id={`th-program-${item.id}`}
                      value={item.program}
                      onChange={(e) =>
                        updateTrainingHistory(index, { program: e.target.value })
                      }
                      placeholder="예: 재직자 향상훈련"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`th-course-${item.id}`}>과정명</Label>
                    <Input
                      id={`th-course-${item.id}`}
                      value={item.course_name}
                      onChange={(e) =>
                        updateTrainingHistory(index, { course_name: e.target.value })
                      }
                      placeholder="예: 스마트팩토리 기초"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`th-method-${item.id}`}>훈련방법</Label>
                    <Input
                      id={`th-method-${item.id}`}
                      value={item.method}
                      onChange={(e) =>
                        updateTrainingHistory(index, { method: e.target.value })
                      }
                      placeholder="예: 집체(대면)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`th-duration-${item.id}`}>훈련일수</Label>
                    <Input
                      id={`th-duration-${item.id}`}
                      type="number"
                      min={0}
                      value={item.duration_days || ''}
                      onChange={(e) =>
                        updateTrainingHistory(index, {
                          duration_days: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 지원 이력 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              연도별 지원 현황
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              연도·연간한도·지원액·지원비율을 입력하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addSupportHistory}>
            <Plus className="w-4 h-4 mr-1" />
            연도 추가
          </Button>
        </div>

        {value.support_history.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 지원 이력이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.support_history.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    지원 이력 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`지원 이력 ${index + 1} 삭제`}
                    onClick={() => removeSupportHistory(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`sh-year-${item.id}`}>연도</Label>
                    <Input
                      id={`sh-year-${item.id}`}
                      value={item.year}
                      onChange={(e) =>
                        updateSupportHistory(index, { year: e.target.value })
                      }
                      placeholder="예: 2025"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`sh-limit-${item.id}`}>연간 한도</Label>
                    <Input
                      id={`sh-limit-${item.id}`}
                      type="number"
                      min={0}
                      value={item.annual_limit || ''}
                      onChange={(e) =>
                        updateSupportHistory(index, {
                          annual_limit: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`sh-supported-${item.id}`}>지원액</Label>
                    <Input
                      id={`sh-supported-${item.id}`}
                      type="number"
                      min={0}
                      value={item.supported || ''}
                      onChange={(e) =>
                        updateSupportHistory(index, {
                          supported: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`sh-ratio-${item.id}`}>지원비율</Label>
                    <Input
                      id={`sh-ratio-${item.id}`}
                      value={item.ratio}
                      onChange={(e) =>
                        updateSupportHistory(index, { ratio: e.target.value })
                      }
                      placeholder="예: 60%"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 추천 과정 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">추천 과정</h3>
            <p className="text-xs text-muted-foreground mt-1">
              우선순위(1~3)·프로그램·제안 내용을 입력하세요. (최대 {MAX_RECOMMENDATIONS}개)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRecommendation}
            disabled={value.recommendations.length >= MAX_RECOMMENDATIONS}
          >
            <Plus className="w-4 h-4 mr-1" />
            추천 추가
          </Button>
        </div>

        {value.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 추천 과정이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.recommendations.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    추천 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`추천 ${index + 1} 삭제`}
                    onClick={() => removeRecommendation(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`rec-rank-${item.id}`}>우선순위</Label>
                    <Input
                      id={`rec-rank-${item.id}`}
                      type="number"
                      min={1}
                      max={3}
                      value={item.rank || ''}
                      onChange={(e) =>
                        updateRecommendation(index, {
                          rank: Math.min(
                            3,
                            Math.max(1, Number(e.target.value) || 1)
                          ),
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`rec-program-${item.id}`}>프로그램</Label>
                    <Input
                      id={`rec-program-${item.id}`}
                      value={item.program}
                      onChange={(e) =>
                        updateRecommendation(index, { program: e.target.value })
                      }
                      placeholder="예: AI 실무 응용"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label htmlFor={`rec-proposal-${item.id}`}>제안 내용</Label>
                  <Textarea
                    id={`rec-proposal-${item.id}`}
                    rows={3}
                    value={item.proposal}
                    onChange={(e) =>
                      updateRecommendation(index, { proposal: e.target.value })
                    }
                    placeholder="제안 배경 및 기대효과"
                    className="mt-1 break-keep"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI훈련과정 개발 필요성 */}
      <div>
        <Label htmlFor="hrd-necessity">
          AI훈련과정 개발 필요성 <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          불릿 스타일로 개발이 필요한 근거를 정리하세요.
        </p>
        <Textarea
          id="hrd-necessity"
          rows={5}
          value={value.course_development_necessity}
          onChange={(e) =>
            onChange({ ...value, course_development_necessity: e.target.value })
          }
          placeholder={'예) - 기존 과정의 AI 실습 부재\n- 현업 데이터 기반 커스텀 실습 필요\n- 사내 전문가와 연계한 PBL 형식 요구'}
          className="break-keep"
        />
      </div>
    </div>
  );
}
