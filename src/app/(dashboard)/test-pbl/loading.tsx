import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { FlaskConical, Info } from 'lucide-react';

export default function TestPBLLoading() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <PageHeader
          title="PBL 테스트"
          description="샘플 PBL 인터뷰 데이터로 PBL 보고서 생성을 연습합니다."
        />
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>테스트 모드 안내</AlertTitle>
        <AlertDescription>
          샘플 인터뷰 데이터를 기반으로 PBL 보고서 초안을 LLM이 생성합니다. 결과는 테스트 프로젝트에
          저장되며 실제 프로젝트와 격리됩니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConical className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
