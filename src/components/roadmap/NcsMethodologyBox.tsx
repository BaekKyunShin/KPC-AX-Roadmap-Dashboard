'use client';

import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// ============================================================================
// 양식 1번 Ⅲ-1: 역량 모델링 표 전체 단위 NCS 박스
//
// - ncs_used=true  → "NCS 활용 방법" textarea
// - ncs_used=false → "역량별 도출 방법" textarea
// - 역량 행마다가 아니라 표 전체 단위로 1개만 노출 (양식 원본 구조)
// ============================================================================

interface NcsMethodologyBoxProps {
  ncsUsed: boolean;
  ncsMethodology: string;
  ncsDerivationMethod: string;
  canEdit?: boolean;
  onChange?: (patch: {
    ncs_used?: boolean;
    ncs_methodology?: string;
    ncs_derivation_method?: string;
  }) => void;
}

export function NcsMethodologyBox({
  ncsUsed,
  ncsMethodology,
  ncsDerivationMethod,
  canEdit = false,
  onChange,
}: NcsMethodologyBoxProps) {
  const label = ncsUsed ? 'NCS 활용 방법' : '역량별 도출 방법';
  const hint = ncsUsed
    ? '표 전체 단위로 NCS(국가직무능력표준) 활용 방식을 기술합니다 (양식 Ⅲ-1).'
    : 'NCS를 활용하지 않은 경우, 역량별 도출 방법을 기술합니다 (양식 Ⅲ-1).';
  const value = ncsUsed ? ncsMethodology : ncsDerivationMethod;
  const placeholder = ncsUsed
    ? '예) NCS 20.02.01 경영·회계·사무 - 빅데이터분석 세분류 활용. 각 세분류 능력단위를 본 역량 정의에 매핑.'
    : '예) 현장 인터뷰 + 전문가 워크숍을 통해 역량 정의·지식·기술·태도를 도출.';

  const handleToggle = (used: boolean) => {
    onChange?.({ ncs_used: used });
  };

  const handleTextChange = (text: string) => {
    if (ncsUsed) {
      onChange?.({ ncs_methodology: text });
    } else {
      onChange?.({ ncs_derivation_method: text });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground break-keep">{hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ncs-used-root"
            checked={ncsUsed}
            onCheckedChange={handleToggle}
            disabled={!canEdit}
            aria-label="NCS 활용 여부"
          />
          <Label htmlFor="ncs-used-root" className="text-xs text-muted-foreground">
            NCS {ncsUsed ? '활용' : '미활용'}
          </Label>
        </div>
      </div>

      {canEdit ? (
        <Textarea
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          aria-label={label}
          className="break-keep"
        />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap break-keep">
          {value || '(내용 없음)'}
        </p>
      )}
    </div>
  );
}
