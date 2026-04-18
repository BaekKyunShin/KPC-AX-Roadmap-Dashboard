import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrackBadge } from '@/components/ui/TrackBadge';
import type { PBLInterviewSample } from '../../../../../e2e/fixtures/pbl-interview-sample';

interface TestPBLSampleSummaryProps {
  sample: PBLInterviewSample;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value || '-'}</dd>
    </div>
  );
}

export function TestPBLSampleSummary({ sample }: TestPBLSampleSummaryProps) {
  const c = sample.courseOverview;
  const env = sample.trainingEnvironment;
  const targets = sample.targetTasks.target_task_details;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle>샘플 PBL 인터뷰 요약</CardTitle>
          <TrackBadge track="PBL" size="sm" />
          <Badge variant="outline" className="text-[10px]">
            테스트 모드 · is_test_mode=true
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          이 데이터를 기반으로 LLM이 PBL 보고서 초안을 생성합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Ⅰ. 훈련과정 개요</h3>
          <dl className="space-y-1 p-3 rounded bg-muted/30 border border-border/40">
            <Row label="기업명" value={c.company_name} />
            <Row label="훈련과정명" value={c.course_name} />
            <Row label="훈련 직무" value={c.training_job} />
            <Row label="훈련 시간" value={`${c.training_hours}시간`} />
            <Row label="훈련생 수" value={`${c.trainee_count}명`} />
            <Row label="AI 역량 수준" value={c.ai_level} />
            <Row label="훈련 목표" value={c.training_goals.join(', ')} />
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Ⅱ-2. 훈련환경</h3>
          <dl className="space-y-1 p-3 rounded bg-muted/30 border border-border/40">
            <Row label="대상 인원" value={`${env.target_count}명`} />
            <Row label="대상 특성" value={`${env.target_characteristics.career} · ${env.target_characteristics.level}`} />
            <Row label="AI 도구 여건" value={env.ai_infrastructure.ai_tools} />
            <Row label="네트워크" value={env.ai_infrastructure.network} />
            <Row label="요구분석" value={env.training_needs_analysis} />
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Ⅲ-3. 훈련대상 업무 ({targets.length}건)</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {targets.map((t) => (
              <li key={t.id}>
                <strong className="text-foreground">{t.task_name}</strong> — {t.to_be}
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
