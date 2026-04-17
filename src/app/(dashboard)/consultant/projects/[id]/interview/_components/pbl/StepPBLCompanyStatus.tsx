'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X } from 'lucide-react';
import {
  createEmptyOrgUnit,
  type PBLCompanyStatus,
  type PBLOrgUnit,
} from '@/lib/schemas/interview-pbl';

interface StepPBLCompanyStatusProps {
  value: PBLCompanyStatus;
  onChange: (next: PBLCompanyStatus) => void;
}

export default function StepPBLCompanyStatus({ value, onChange }: StepPBLCompanyStatusProps) {
  const updateUnit = (index: number, next: Partial<PBLOrgUnit>) => {
    const organization = value.organization.map((u, i) => (i === index ? { ...u, ...next } : u));
    onChange({ ...value, organization });
  };

  const addUnit = () => {
    onChange({ ...value, organization: [...value.organization, createEmptyOrgUnit()] });
  };

  const removeUnit = (index: number) => {
    onChange({ ...value, organization: value.organization.filter((_, i) => i !== index) });
  };

  const addTask = (unitIndex: number) => {
    updateUnit(unitIndex, { tasks: [...value.organization[unitIndex].tasks, ''] });
  };

  const updateTask = (unitIndex: number, taskIndex: number, next: string) => {
    const tasks = value.organization[unitIndex].tasks.map((t, i) => (i === taskIndex ? next : t));
    updateUnit(unitIndex, { tasks });
  };

  const removeTask = (unitIndex: number, taskIndex: number) => {
    const tasks = value.organization[unitIndex].tasks.filter((_, i) => i !== taskIndex);
    updateUnit(unitIndex, { tasks });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅱ-1. 기업 현황 분석</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 양식 Ⅱ-1. 경영 이슈와 조직도·주요 업무를 입력하세요.
        </p>
      </div>

      <div>
        <Label htmlFor="cs-business-issues">
          경영 이슈 <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          산업 변화·당면 문제·성장 전략 등 불릿 스타일로 정리하세요.
        </p>
        <Textarea
          id="cs-business-issues"
          rows={5}
          value={value.business_issues}
          onChange={(e) => onChange({ ...value, business_issues: e.target.value })}
          placeholder={'예) - 원자재 가격 변동성 증가\n- 숙련 인력 확보 난항\n- 납기 지연으로 인한 고객 이탈'}
          className="break-keep"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              조직도 및 주요 업무 <span className="text-destructive">*</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              부서별로 대표 업무를 추가하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addUnit}>
            <Plus className="w-4 h-4 mr-1" />
            부서 추가
          </Button>
        </div>

        {value.organization.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 등록된 부서가 없습니다.</p>
        )}

        {value.organization.map((unit, unitIndex) => (
          <div key={unit.id} className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                  {unitIndex + 1}
                </span>
                부서 {unitIndex + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`부서 ${unitIndex + 1} 삭제`}
                onClick={() => removeUnit(unitIndex)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            </div>

            <div>
              <Label htmlFor={`cs-dept-${unit.id}`}>부서명</Label>
              <Input
                id={`cs-dept-${unit.id}`}
                value={unit.department_name}
                onChange={(e) => updateUnit(unitIndex, { department_name: e.target.value })}
                placeholder="예: 생산팀"
                className="mt-1"
              />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="block">주요 업무</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTask(unitIndex)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  업무 추가
                </Button>
              </div>
              {unit.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  등록된 업무가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {unit.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex items-center gap-2">
                      <Input
                        value={task}
                        onChange={(e) => updateTask(unitIndex, taskIndex, e.target.value)}
                        placeholder="예: 품질검사"
                        aria-label={`부서 ${unitIndex + 1} 업무 ${taskIndex + 1}`}
                      />
                      <button
                        type="button"
                        aria-label={`부서 ${unitIndex + 1} 업무 ${taskIndex + 1} 삭제`}
                        onClick={() => removeTask(unitIndex, taskIndex)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
