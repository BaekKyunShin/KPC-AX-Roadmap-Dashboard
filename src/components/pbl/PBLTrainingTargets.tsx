'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CARD_HEADER_CLASS,
  SyncedTableRow,
  TableInlineCell,
  TableTextCell,
} from '@/components/roadmap/shared';

// ============================================================================
// Ⅱ·Ⅲ장 요약 — PBL 인터뷰의 요구분석·훈련대상 업무 세부내용 읽기 전용 표시
//   (LLM 재창작 금지. 인터뷰 입력값 복사)
// ============================================================================

export interface PBLTrainingTargetDetail {
  id: string;
  task_name: string;
  as_is: string;
  to_be: string;
  required_knowledge: string;
  required_skill: string;
}

interface PBLTrainingTargetsProps {
  trainingNeedsAnalysis: string;
  selectionReason: string;
  details: PBLTrainingTargetDetail[];
}

export function PBLTrainingTargets({
  trainingNeedsAnalysis,
  selectionReason,
  details,
}: PBLTrainingTargetsProps) {
  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">요구분석·훈련대상 업무 (Ⅱ-2 · Ⅲ-3)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">AI 훈련 요구분석 결과</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] p-3 rounded bg-muted/30 border border-border/40">
            {trainingNeedsAnalysis || '-'}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">훈련대상 업무 선정 사유</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] p-3 rounded bg-muted/30 border border-border/40">
            {selectionReason || '-'}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">훈련대상 업무 세부내용</h3>
          <div className="overflow-x-auto rounded border border-border">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[18%] text-center">업무명</TableHead>
                  <TableHead className="w-[22%] text-center">As-Is</TableHead>
                  <TableHead className="w-[22%] text-center">To-Be</TableHead>
                  <TableHead className="w-[19%] text-center">요구 지식</TableHead>
                  <TableHead className="w-[19%] text-center">요구 기술</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      인터뷰에 세부내용이 없습니다.
                    </td>
                  </TableRow>
                ) : (
                  details.map((row) => (
                    <SyncedTableRow
                      key={row.id}
                      deps={[row.as_is, row.to_be, row.required_knowledge, row.required_skill]}
                    >
                      <TableInlineCell
                        canEdit={false}
                        value={row.task_name}
                        onChange={() => {}}
                        ariaLabel="업무명"
                        align="left"
                      />
                      <TableTextCell
                        canEdit={false}
                        value={row.as_is}
                        onChange={() => {}}
                        ariaLabel="As-Is"
                      />
                      <TableTextCell
                        canEdit={false}
                        value={row.to_be}
                        onChange={() => {}}
                        ariaLabel="To-Be"
                      />
                      <TableTextCell
                        canEdit={false}
                        value={row.required_knowledge}
                        onChange={() => {}}
                        ariaLabel="요구 지식"
                      />
                      <TableTextCell
                        canEdit={false}
                        value={row.required_skill}
                        onChange={() => {}}
                        ariaLabel="요구 기술"
                      />
                    </SyncedTableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
