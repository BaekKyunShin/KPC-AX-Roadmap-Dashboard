import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
} from 'lucide-react';

// ── 하드코딩 데모 데이터 ──────────────────────────────

const CONSULTANT = {
  name: '김민수',
  specialty: ['제조/생산', '품질관리', '데이터분석'],
  experience: 8,
};

const KPI = {
  totalProjects: 23,
  totalRoadmaps: 31,
  avgDays: 12,
  satisfactionRate: 94,
};

const MONTHLY_DATA = [
  { month: '9월', completed: 2 },
  { month: '10월', completed: 3 },
  { month: '11월', completed: 4 },
  { month: '12월', completed: 2 },
  { month: '1월', completed: 3 },
  { month: '2월', completed: 2 },
];

const INDUSTRY_DISTRIBUTION = [
  { industry: '전자/반도체', count: 7, percentage: 30 },
  { industry: '자동차/부품', count: 5, percentage: 22 },
  { industry: '화학/소재', count: 4, percentage: 17 },
  { industry: '식품/의약', count: 3, percentage: 13 },
  { industry: '건설/엔지니어링', count: 2, percentage: 9 },
  { industry: '기타', count: 2, percentage: 9 },
];

const INDUSTRY_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-gray-400',
];

// 활동 히트맵 데이터 (12주 x 7일) - GitHub 스타일
const HEATMAP_DATA: number[][] = [];
for (let week = 0; week < 12; week++) {
  const row: number[] = [];
  for (let day = 0; day < 7; day++) {
    row.push(Math.floor(Math.random() * 5));
  }
  HEATMAP_DATA.push(row);
}

const COMPLETED_PROJECTS = [
  {
    company: 'LG에너지솔루션',
    industry: '전자/반도체',
    completedAt: '2026-01-28',
    roadmapCount: 2,
    satisfaction: 95,
  },
  {
    company: 'SK이노베이션',
    industry: '화학/소재',
    completedAt: '2026-01-15',
    roadmapCount: 1,
    satisfaction: 92,
  },
  {
    company: '포스코인터내셔널',
    industry: '철강/금속',
    completedAt: '2025-12-20',
    roadmapCount: 2,
    satisfaction: 98,
  },
  {
    company: '한화솔루션',
    industry: '화학/소재',
    completedAt: '2025-12-05',
    roadmapCount: 1,
    satisfaction: 90,
  },
  {
    company: '두산에너빌리티',
    industry: '건설/엔지니어링',
    completedAt: '2025-11-22',
    roadmapCount: 2,
    satisfaction: 93,
  },
];

const HEATMAP_COLORS = [
  'bg-gray-100',
  'bg-green-100',
  'bg-green-300',
  'bg-green-500',
  'bg-green-700',
];

const WEEK_LABELS = ['12주전', '', '10주전', '', '8주전', '', '6주전', '', '4주전', '', '2주전', '이번주'];
const DAY_LABELS = ['월', '', '수', '', '금', '', ''];

// ── 페이지 컴포넌트 ──────────────────────────────────

export default function ConsultantStatsMockup() {
  const maxMonthlyCompleted = Math.max(...MONTHLY_DATA.map((d) => d.completed));

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">나의 성과</h1>
        <p className="mt-1 text-sm text-gray-500">
          {CONSULTANT.name}님의 컨설팅 활동 통계와 성과를 확인합니다.
        </p>
      </div>

      {/* 프로필 요약 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {CONSULTANT.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{CONSULTANT.name}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {CONSULTANT.specialty.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                경력 {CONSULTANT.experience}년
              </p>
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
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{KPI.totalProjects}</p>
                <p className="text-xs text-gray-500">총 완료 프로젝트</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{KPI.totalRoadmaps}</p>
                <p className="text-xs text-gray-500">총 생성 로드맵</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {KPI.avgDays}
                  <span className="text-sm font-normal text-gray-400">일</span>
                </p>
                <p className="text-xs text-gray-500">평균 소요 기간</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {KPI.satisfactionRate}
                  <span className="text-sm font-normal text-gray-400">%</span>
                </p>
                <p className="text-xs text-gray-500">만족도</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 완료 프로젝트 (바 차트 대체) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              월별 완료 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MONTHLY_DATA.map((item) => (
                <div key={item.month} className="flex items-center gap-3">
                  <span className="w-10 text-sm text-gray-500 text-right">
                    {item.month}
                  </span>
                  <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded bg-primary/80 transition-all flex items-center justify-end pr-2"
                      style={{
                        width: `${(item.completed / maxMonthlyCompleted) * 100}%`,
                      }}
                    >
                      <span className="text-xs font-medium text-white">
                        {item.completed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 업종별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">업종별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {INDUSTRY_DISTRIBUTION.map((item, i) => (
                <div key={item.industry} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${INDUSTRY_COLORS[i]}`}
                      />
                      <span className="text-gray-700">{item.industry}</span>
                    </div>
                    <span className="text-gray-500">
                      {item.count}건 ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${INDUSTRY_COLORS[i]}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 활동 히트맵 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">활동 히트맵</CardTitle>
          <p className="text-sm text-gray-500">
            최근 12주간의 시스템 활동 빈도입니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-0.5 min-w-fit">
              {/* 주 라벨 */}
              <div className="flex gap-0.5 mb-1">
                <div className="w-6" />
                {WEEK_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="w-4 text-center text-[10px] text-gray-400"
                  >
                    {label}
                  </div>
                ))}
              </div>
              {/* 히트맵 그리드 */}
              {DAY_LABELS.map((dayLabel, dayIndex) => (
                <div key={dayIndex} className="flex items-center gap-0.5">
                  <span className="w-6 text-[10px] text-gray-400 text-right pr-1">
                    {dayLabel}
                  </span>
                  {HEATMAP_DATA.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className={`h-4 w-4 rounded-sm ${HEATMAP_COLORS[week[dayIndex]]}`}
                      title={`활동: ${week[dayIndex]}건`}
                    />
                  ))}
                </div>
              ))}
              {/* 범례 */}
              <div className="flex items-center gap-1 mt-2 ml-6">
                <span className="text-[10px] text-gray-400 mr-1">적음</span>
                {HEATMAP_COLORS.map((color, i) => (
                  <div key={i} className={`h-3 w-3 rounded-sm ${color}`} />
                ))}
                <span className="text-[10px] text-gray-400 ml-1">많음</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 완료 프로젝트 이력 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">최근 완료 프로젝트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">기업명</th>
                  <th className="pb-3 font-medium">업종</th>
                  <th className="pb-3 font-medium">완료일</th>
                  <th className="pb-3 font-medium text-center">로드맵</th>
                  <th className="pb-3 font-medium text-center">만족도</th>
                </tr>
              </thead>
              <tbody>
                {COMPLETED_PROJECTS.map((project) => (
                  <tr
                    key={project.company}
                    className="border-b last:border-0"
                  >
                    <td className="py-3 font-medium text-gray-900">
                      {project.company}
                    </td>
                    <td className="py-3 text-gray-600">{project.industry}</td>
                    <td className="py-3 text-gray-600">
                      {project.completedAt}
                    </td>
                    <td className="py-3 text-center">{project.roadmapCount}개</td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          project.satisfaction >= 95
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }
                      >
                        {project.satisfaction}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
