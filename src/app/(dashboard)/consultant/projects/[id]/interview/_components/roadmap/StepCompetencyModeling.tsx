'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyCompetencyModel,
  type CompetencyModel,
  type NcsUsage,
} from '@/lib/schemas/interview-roadmap';

interface StepCompetencyModelingProps {
  competencies: CompetencyModel[];
  ncsUsage: NcsUsage;
  onCompetenciesChange: (next: CompetencyModel[]) => void;
  onNcsUsageChange: (next: NcsUsage) => void;
}

export default function StepCompetencyModeling({
  competencies,
  ncsUsage,
  onCompetenciesChange,
  onNcsUsageChange,
}: StepCompetencyModelingProps) {
  const updateCompetency = <K extends keyof CompetencyModel>(
    index: number,
    key: K,
    value: CompetencyModel[K],
  ) => {
    const next = competencies.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onCompetenciesChange(next);
  };

  const addCompetency = () => {
    onCompetenciesChange([...competencies, createEmptyCompetencyModel()]);
  };

  const removeCompetency = (index: number) => {
    if (competencies.length <= 1) return;
    onCompetenciesChange(competencies.filter((_, i) => i !== index));
  };

  const handleUsesNcsChange = (next: boolean) => {
    if (next) {
      onNcsUsageChange({ uses_ncs: true, ncs_usage_method: ncsUsage.ncs_usage_method ?? '' });
    } else {
      onNcsUsageChange({
        uses_ncs: false,
        competency_derivation_method: ncsUsage.competency_derivation_method ?? '',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Ⅲ-1. 역량 모델링
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            훈련대상 과업 수행에 필요한 역량을 도출하고, 각 역량별 지식(K)·기술(S)·태도(A)와
            역량 정의(수행준거)를 작성하세요. NCS 능력단위를 참고했다면 아래 NCS 활용 블록에
            어떻게 참고·수정했는지 기술합니다.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCompetency}>
          <Plus className="w-4 h-4 mr-1" />
          역량 추가
        </Button>
      </div>

      <div className="space-y-4">
        {competencies.map((item, index) => (
          <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                  {index + 1}
                </span>
                역량 {index + 1}
              </h3>
              {competencies.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`행 삭제: 역량 ${index + 1}`}
                  onClick={() => removeCompetency(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <FormField label="역량명" htmlFor={`cm-name-${item.id}`} required>
                <Input
                  id={`cm-name-${item.id}`}
                  value={item.competency_name}
                  onChange={(e) => updateCompetency(index, 'competency_name', e.target.value)}
                  placeholder="예) 품질 검사 데이터 해석 역량"
                />
              </FormField>
              <FormField
                label="역량 정의(수행준거)"
                htmlFor={`cm-def-${item.id}`}
                required
                hint="해당 역량이 실제 업무에서 어떻게 발휘되어야 하는지 1~2문장으로 기술"
              >
                <Textarea
                  id={`cm-def-${item.id}`}
                  rows={6}
                  value={item.competency_definition}
                  onChange={(e) =>
                    updateCompetency(index, 'competency_definition', e.target.value)
                  }
                  placeholder="예) 검사 이미지 데이터에서 불량 패턴을 식별하고, 공정 담당자에게 즉시 전달·대응할 수 있다."
                  className="break-keep"
                />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="필요 지식 (K)"
                  htmlFor={`cm-k-${item.id}`}
                  required
                  hint="학술·업무지식 (분야, 용어, 체계)"
                >
                  <Textarea
                    id={`cm-k-${item.id}`}
                    rows={6}
                    value={item.knowledge}
                    onChange={(e) => updateCompetency(index, 'knowledge', e.target.value)}
                    placeholder="예) 이미지 분류 기초, QMS 지표 체계, 머신러닝 입문"
                    className="break-keep"
                  />
                </FormField>
                <FormField
                  label="필요 기술 (S)"
                  htmlFor={`cm-s-${item.id}`}
                  required
                  hint="실제 수행 기능(툴·기법)"
                >
                  <Textarea
                    id={`cm-s-${item.id}`}
                    rows={6}
                    value={item.skill}
                    onChange={(e) => updateCompetency(index, 'skill', e.target.value)}
                    placeholder="예) 이미지 레이블링, 시각화 도구, 지표 모니터링"
                    className="break-keep"
                  />
                </FormField>
                <FormField
                  label="필요 태도 (A)"
                  htmlFor={`cm-a-${item.id}`}
                  required
                  hint="업무 수행 시 필요한 태도·가치관"
                >
                  <Textarea
                    id={`cm-a-${item.id}`}
                    rows={6}
                    value={item.attitude}
                    onChange={(e) => updateCompetency(index, 'attitude', e.target.value)}
                    placeholder="예) 데이터 기반 의사결정 선호, 지속 학습 의지, 협업 태도"
                    className="break-keep"
                  />
                </FormField>
              </div>
            </div>
          </div>
        ))}
      </div>

      <fieldset className="rounded-md border border-border/70 p-4 bg-background/60">
        <legend className="px-1 text-sm font-medium text-foreground">
          NCS 능력단위 활용 여부 <span className="text-destructive">*</span>
        </legend>
        <p className="text-xs text-muted-foreground mb-3">
          역량 도출 시 국가직무능력표준(NCS) 능력단위를 참고했는지 선택하세요.
        </p>
        <div
          role="radiogroup"
          aria-label="NCS 능력단위 활용 여부"
          className="flex flex-col sm:flex-row gap-3 mb-4"
        >
          <label className="flex items-start gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 flex-1">
            <input
              type="radio"
              name="ncs-uses"
              value="true"
              checked={ncsUsage.uses_ncs === true}
              onChange={() => handleUsesNcsChange(true)}
              className="mt-1"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">예, NCS 능력단위를 참고했습니다</span>
              <span className="text-xs text-muted-foreground">
                NCS 세분류·능력단위를 어떻게 참고·수정했는지 기술
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 flex-1">
            <input
              type="radio"
              name="ncs-uses"
              value="false"
              checked={ncsUsage.uses_ncs === false}
              onChange={() => handleUsesNcsChange(false)}
              className="mt-1"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">아니오, NCS 없이 자체 도출했습니다</span>
              <span className="text-xs text-muted-foreground">
                인터뷰·벤치마킹·전문가 자문 등 도출 방법 기술
              </span>
            </span>
          </label>
        </div>

        {ncsUsage.uses_ncs ? (
          <FormField
            label="NCS 활용 방법"
            htmlFor="ncs-usage-method"
            required
            hint="예) NCS 20.02.01 빅데이터분석 세분류 능력단위 '데이터 수집·전처리'를 차용, 기업 도메인에 맞춰 용어 일부 수정"
          >
            <Textarea
              id="ncs-usage-method"
              rows={6}
              value={ncsUsage.ncs_usage_method ?? ''}
              onChange={(e) =>
                onNcsUsageChange({ uses_ncs: true, ncs_usage_method: e.target.value })
              }
              placeholder="NCS 세분류·능력단위명과 함께 어떻게 참고·수정했는지 기술"
              className="break-keep"
            />
          </FormField>
        ) : (
          <FormField
            label="역량 도출 방법"
            htmlFor="competency-derivation-method"
            required
            hint="예) 3개 기업 현장 인터뷰 + 업계 벤치마킹(A사·B사 사례)을 통해 공통 역량을 추출"
          >
            <Textarea
              id="competency-derivation-method"
              rows={6}
              value={ncsUsage.competency_derivation_method ?? ''}
              onChange={(e) =>
                onNcsUsageChange({
                  uses_ncs: false,
                  competency_derivation_method: e.target.value,
                })
              }
              placeholder="NCS를 사용하지 않고 어떻게 역량을 도출했는지 방법 기술"
              className="break-keep"
            />
          </FormField>
        )}
      </fieldset>

      <GuideNote
        items={[
          '훈련대상 과업 수행에 필요한 역량을 도출하고, 역량 정의(수행준거) + 필요 지식(K)·기술(S)·태도(A) 를 작성합니다.',
          '지식(K)은 해당 역량에 필요한 학술·업무지식(분야, 용어, 체계 등)을 기술합니다.',
          '기술(S)은 실제 수행 기능(활용 툴, 기법 등)을, 태도(A)는 업무 수행 시 요구되는 가치관·태도를 기술합니다.',
          'NCS 능력단위를 참고했다면 활용 방법을, 참고하지 않았다면 자체 도출 방법(인터뷰·벤치마킹 등)을 기술합니다.',
        ]}
      />
    </div>
  );
}
