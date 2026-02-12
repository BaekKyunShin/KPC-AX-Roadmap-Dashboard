import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Plus,
  BarChart3,
  ArrowRight,
  FileText,
} from 'lucide-react';

// ── 하드코딩 데모 데이터 ──────────────────────────────

const PROJECT = {
  id: 'p4',
  company: 'LG에너지솔루션',
  industry: '전자/반도체',
  status: 'DELIVERING',
  pblCourse: '배터리 품질검사 데이터 분석 자동화',
  totalHours: 40,
  completedHours: 25,
};

const SESSIONS = [
  {
    number: 1,
    date: '2026-01-13',
    topic: 'AI 기반 품질검사 개론 및 데이터 이해',
    hours: 5,
    status: 'COMPLETED',
    attendance: 12,
    maxAttendance: 15,
  },
  {
    number: 2,
    date: '2026-01-20',
    topic: '검사 데이터 전처리 및 이상치 탐지',
    hours: 5,
    status: 'COMPLETED',
    attendance: 14,
    maxAttendance: 15,
  },
  {
    number: 3,
    date: '2026-01-27',
    topic: '예측 모델 구축 (무료 AutoML 도구 활용)',
    hours: 5,
    status: 'COMPLETED',
    attendance: 13,
    maxAttendance: 15,
  },
  {
    number: 4,
    date: '2026-02-03',
    topic: '실시간 모니터링 대시보드 구축',
    hours: 5,
    status: 'COMPLETED',
    attendance: 11,
    maxAttendance: 15,
  },
  {
    number: 5,
    date: '2026-02-10',
    topic: 'PBL 프로젝트: 실제 라인 데이터 분석',
    hours: 5,
    status: 'COMPLETED',
    attendance: 15,
    maxAttendance: 15,
  },
  {
    number: 6,
    date: '2026-02-17',
    topic: 'PBL 프로젝트: 모델 최적화 및 배포',
    hours: 5,
    status: 'SCHEDULED',
    attendance: 0,
    maxAttendance: 15,
  },
  {
    number: 7,
    date: '2026-02-24',
    topic: '산출물 제출 및 중간 발표',
    hours: 5,
    status: 'SCHEDULED',
    attendance: 0,
    maxAttendance: 15,
  },
  {
    number: 8,
    date: '2026-03-03',
    topic: '최종 발표 및 현장 적용 계획 수립',
    hours: 5,
    status: 'SCHEDULED',
    attendance: 0,
    maxAttendance: 15,
  },
];

const OUTCOMES = [
  {
    metric: '불량 검출 시간',
    unit: '분/건',
    before: 45,
    after: 12,
    direction: 'decrease',
    improvement: 73,
    measuredAt: '5회차 기준',
  },
  {
    metric: '검사 정확도',
    unit: '%',
    before: 82,
    after: 94,
    direction: 'increase',
    improvement: 15,
    measuredAt: '5회차 기준',
  },
  {
    metric: '보고서 작성 시간',
    unit: '시간/주',
    before: 8,
    after: 2,
    direction: 'decrease',
    improvement: 75,
    measuredAt: '4회차 기준',
  },
];

const SESSION_STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const SESSION_STATUS_LABEL: Record<string, string> = {
  COMPLETED: '완료',
  SCHEDULED: '예정',
  CANCELLED: '취소',
};

const completedSessions = SESSIONS.filter((s) => s.status === 'COMPLETED');
const progressPercent = (PROJECT.completedHours / PROJECT.totalHours) * 100;
const avgAttendance =
  completedSessions.length > 0
    ? Math.round(
        completedSessions.reduce((sum, s) => sum + s.attendance, 0) /
          completedSessions.length,
      )
    : 0;

// ── 페이지 컴포넌트 ──────────────────────────────────

export default function DeliveryTrackingMockup() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="교육 실행 추적"
        description={`${PROJECT.company} — ${PROJECT.pblCourse}`}
        backLink={{
          href: '/consultant/projects/p4',
          label: '프로젝트 상세',
        }}
      />

      {/* 진행률 요약 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  전체 진행률
                </span>
                <span className="text-sm font-bold text-primary">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {PROJECT.completedHours}/{PROJECT.totalHours}시간 완료
                </span>
                <span>
                  {completedSessions.length}/{SESSIONS.length}회차 완료
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {completedSessions.length}/{SESSIONS.length}
                </p>
                <p className="text-xs text-gray-500">완료 회차</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgAttendance}명</p>
                <p className="text-xs text-gray-500">평균 출석</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {PROJECT.totalHours - PROJECT.completedHours}
                  <span className="text-sm font-normal text-gray-400">h</span>
                </p>
                <p className="text-xs text-gray-500">남은 시간</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {SESSIONS.find((s) => s.status === 'SCHEDULED')?.number ||
                    '-'}
                  <span className="text-sm font-normal text-gray-400">
                    회차
                  </span>
                </p>
                <p className="text-xs text-gray-500">다음 세션</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 세션 목록 (2/3 너비) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">교육 세션</CardTitle>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  세션 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SESSIONS.map((session) => (
                  <div
                    key={session.number}
                    className={`flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      session.status === 'COMPLETED'
                        ? 'bg-white'
                        : 'bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          session.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {session.number}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.topic}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{session.date}</span>
                          <span>·</span>
                          <span>{session.hours}시간</span>
                          {session.status === 'COMPLETED' && (
                            <>
                              <span>·</span>
                              <span>
                                출석 {session.attendance}/{session.maxAttendance}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={SESSION_STATUS_STYLE[session.status]}
                    >
                      {session.status === 'COMPLETED' && (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      )}
                      {SESSION_STATUS_LABEL[session.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 성과 지표 (1/3 너비) */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                성과 지표 (Before → After)
              </CardTitle>
              <CardDescription>
                인터뷰 시 설정한 KPI의 변화를 추적합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {OUTCOMES.map((outcome) => (
                <div key={outcome.metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {outcome.metric}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        outcome.direction === 'decrease'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    >
                      {outcome.direction === 'decrease' ? (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      )}
                      {outcome.improvement}% 개선
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 rounded bg-red-50 px-3 py-2 text-center">
                      <p className="text-xs text-gray-500">Before</p>
                      <p className="font-bold text-red-600">
                        {outcome.before}
                        <span className="text-xs font-normal">
                          {outcome.unit}
                        </span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 rounded bg-green-50 px-3 py-2 text-center">
                      <p className="text-xs text-gray-500">After</p>
                      <p className="font-bold text-green-600">
                        {outcome.after}
                        <span className="text-xs font-normal">
                          {outcome.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-right">
                    {outcome.measuredAt}
                  </p>
                </div>
              ))}

              <Button variant="outline" size="sm" className="w-full gap-1">
                <Plus className="h-4 w-4" />
                지표 추가
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
