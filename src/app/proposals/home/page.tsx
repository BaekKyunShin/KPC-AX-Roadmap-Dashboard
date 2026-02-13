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
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  MessageSquare,
  CalendarDays,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

// ── 하드코딩 데모 데이터 ──────────────────────────────

const TODAY = '2026-02-09';
const CONSULTANT_NAME = '김민수';

const ACTION_ITEMS = [
  {
    id: 'p1',
    company: '(주)한국전자',
    industry: '전자/반도체',
    status: 'ASSIGNED',
    action: '인터뷰를 입력해주세요',
    actionHref: '/consultant/projects/p1/interview',
    dueDate: '2026-02-12',
    dDay: 3,
    priority: 'high' as const,
  },
  {
    id: 'p2',
    company: '삼성물산(주)',
    industry: '건설/엔지니어링',
    status: 'ROADMAP_DRAFTED',
    action: '로드맵을 검토 후 확정해주세요',
    actionHref: '/consultant/projects/p2/roadmap',
    dueDate: '2026-02-14',
    dDay: 5,
    priority: 'medium' as const,
  },
  {
    id: 'p3',
    company: '현대중공업(주)',
    industry: '조선/해양',
    status: 'INTERVIEWED',
    action: '로드맵을 생성해주세요',
    actionHref: '/consultant/projects/p3/roadmap',
    dueDate: '2026-02-18',
    dDay: 9,
    priority: 'low' as const,
  },
];

const RECENT_ACTIVITIES = [
  {
    id: '1',
    type: 'roadmap',
    message: '삼성물산 로드맵 v2 생성 완료',
    time: '오늘 09:30',
  },
  {
    id: '2',
    type: 'interview',
    message: '현대중공업 인터뷰 입력 완료',
    time: '어제 16:45',
  },
  {
    id: '3',
    type: 'feedback',
    message: 'LG에너지솔루션 교육 피드백 수신',
    time: '어제 11:20',
  },
  {
    id: '4',
    type: 'assignment',
    message: '(주)한국전자 프로젝트 배정',
    time: '2일 전',
  },
];

const STATS = {
  activeProjects: 5,
  completedThisMonth: 2,
  totalCompleted: 23,
  avgDaysToComplete: 12,
};

const UPCOMING_DEADLINES = [
  { company: '(주)한국전자', stage: '인터뷰 마감', date: '02/12', dDay: 3 },
  { company: '삼성물산(주)', stage: '로드맵 확정', date: '02/14', dDay: 5 },
  { company: '현대중공업(주)', stage: '로드맵 생성', date: '02/18', dDay: 9 },
  { company: 'SK하이닉스(주)', stage: '인터뷰 마감', date: '02/25', dDay: 16 },
];

// ── 헬퍼 ────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: '배정됨',
  INTERVIEWED: '인터뷰 완료',
  ROADMAP_DRAFTED: '로드맵 초안',
  FINALIZED: '확정 완료',
  DELIVERING: '교육 진행중',
};

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  INTERVIEWED: 'bg-amber-50 text-amber-700 border-amber-200',
  ROADMAP_DRAFTED: 'bg-purple-50 text-purple-700 border-purple-200',
  FINALIZED: 'bg-green-50 text-green-700 border-green-200',
  DELIVERING: 'bg-teal-50 text-teal-700 border-teal-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-green-500',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  roadmap: <FileText className="h-4 w-4 text-purple-500" />,
  interview: <ClipboardList className="h-4 w-4 text-blue-500" />,
  feedback: <MessageSquare className="h-4 w-4 text-green-500" />,
  assignment: <Briefcase className="h-4 w-4 text-amber-500" />,
};

// ── 페이지 컴포넌트 ──────────────────────────────────

export default function ConsultantHomeMockup() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-gray-500">{TODAY} 월요일</p>
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {CONSULTANT_NAME}님
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          오늘 처리할 항목이 {ACTION_ITEMS.length}건 있습니다.
        </p>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{STATS.activeProjects}</p>
                <p className="text-xs text-gray-500">진행 중</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {STATS.completedThisMonth}
                </p>
                <p className="text-xs text-gray-500">이번 달 완료</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{STATS.totalCompleted}</p>
                <p className="text-xs text-gray-500">총 완료</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {STATS.avgDaysToComplete}
                  <span className="text-sm font-normal text-gray-400">일</span>
                </p>
                <p className="text-xs text-gray-500">평균 소요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 오늘의 할 일 (2/3 너비) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                조치 필요 항목
              </CardTitle>
              <CardDescription>
                다음 단계로 진행하기 위해 처리가 필요한 프로젝트입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ACTION_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 rounded-lg border border-l-4 p-4 sm:flex-row sm:items-center sm:justify-between ${PRIORITY_COLORS[item.priority]}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {item.company}
                      </span>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[item.status]}
                      >
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{item.action}</p>
                    <p className="text-xs text-gray-400">
                      마감: {item.dueDate} (D-{item.dDay})
                    </p>
                  </div>
                  <Link href={item.actionHref}>
                    <Button size="sm" variant="outline" className="gap-1">
                      처리하기
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 최근 활동 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {RECENT_ACTIVITIES.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-50">
                      {ACTIVITY_ICONS[activity.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700">{activity.message}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 (1/3 너비) */}
        <div className="space-y-6">
          {/* 다가오는 마감일 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-gray-400" />
                다가오는 마감일
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {UPCOMING_DEADLINES.map((deadline, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-700">
                        {deadline.company}
                      </p>
                      <p className="text-xs text-gray-400">{deadline.stage}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        deadline.dDay <= 3
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : deadline.dDay <= 7
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                      }
                    >
                      D-{deadline.dDay}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 프로젝트 상태 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">프로젝트 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: '배정됨', count: 1, color: 'bg-blue-500' },
                  { label: '인터뷰 완료', count: 1, color: 'bg-amber-500' },
                  {
                    label: '로드맵 초안',
                    count: 2,
                    color: 'bg-purple-500',
                  },
                  { label: '교육 진행중', count: 1, color: 'bg-teal-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.count / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
