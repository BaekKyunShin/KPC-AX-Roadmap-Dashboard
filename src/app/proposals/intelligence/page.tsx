'use client';

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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Label,
  LineChart,
  Line,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  Users,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ArrowRight,
  Filter,
  Download,
  ChevronDown,
  Zap,
  Target,
  Layers,
  BookOpen,
} from 'lucide-react';

// ── 하드코딩 데모 데이터 ──────────────────────────────

const KPI_SUMMARY = {
  totalProjects: 87,
  activeProjects: 23,
  avgCompletionDays: 18.5,
  completionRate: 89,
  monthlyGrowth: 12,
  bottleneckStage: 'INTERVIEWED',
};

// 파이프라인 퍼널 데이터
const PIPELINE_STAGES = [
  { stage: 'NEW', label: '신규 등록', count: 87, color: '#94A3B8', rate: 100 },
  { stage: 'DIAGNOSED', label: '진단 완료', count: 79, color: '#60A5FA', rate: 91 },
  { stage: 'ASSIGNED', label: '컨설턴트 배정', count: 68, color: '#818CF8', rate: 86 },
  { stage: 'INTERVIEWED', label: '인터뷰 완료', count: 52, color: '#A78BFA', rate: 76 },
  { stage: 'ROADMAP_DRAFTED', label: '로드맵 초안', count: 47, color: '#C084FC', rate: 90 },
  { stage: 'FINALIZED', label: '최종 확정', count: 42, color: '#10B981', rate: 89 },
];

// 병목 분석 데이터
const BOTTLENECK_DATA = [
  { stage: '진단→배정', avgDays: 3.2, projects: 11, status: 'normal' },
  { stage: '배정→인터뷰', avgDays: 8.7, projects: 16, status: 'warning' },
  { stage: '인터뷰→초안', avgDays: 2.1, projects: 5, status: 'normal' },
  { stage: '초안→확정', avgDays: 4.5, projects: 5, status: 'normal' },
];

// 업종 × 교육레벨 히트맵
const INDUSTRIES = ['제조/생산', '전자/반도체', 'IT/소프트웨어', '금융/보험', '유통/물류', '건설/엔지니어링', '화학/소재', '의료/바이오'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

// 히트맵 값 생성 (업종 × 레벨 → 과정 수)
const HEATMAP_VALUES: Record<string, Record<string, number>> = {
  '제조/생산': { BEGINNER: 12, INTERMEDIATE: 18, ADVANCED: 8 },
  '전자/반도체': { BEGINNER: 9, INTERMEDIATE: 15, ADVANCED: 11 },
  'IT/소프트웨어': { BEGINNER: 6, INTERMEDIATE: 10, ADVANCED: 14 },
  '금융/보험': { BEGINNER: 11, INTERMEDIATE: 13, ADVANCED: 5 },
  '유통/물류': { BEGINNER: 14, INTERMEDIATE: 9, ADVANCED: 3 },
  '건설/엔지니어링': { BEGINNER: 7, INTERMEDIATE: 6, ADVANCED: 2 },
  '화학/소재': { BEGINNER: 8, INTERMEDIATE: 11, ADVANCED: 7 },
  '의료/바이오': { BEGINNER: 5, INTERMEDIATE: 8, ADVANCED: 9 },
};

// 컨설턴트 성과 테이블
const CONSULTANT_PERFORMANCE = [
  {
    name: '김민수',
    projects: 12,
    avgDays: 14.2,
    satisfaction: 96,
    specialties: ['제조/생산', '품질관리'],
    trend: 'up',
    radar: { speed: 85, quality: 92, satisfaction: 96, volume: 78, diversity: 65 },
  },
  {
    name: '이서연',
    projects: 10,
    avgDays: 16.8,
    satisfaction: 94,
    specialties: ['IT/소프트웨어', '데이터분석'],
    trend: 'up',
    radar: { speed: 72, quality: 88, satisfaction: 94, volume: 70, diversity: 82 },
  },
  {
    name: '박준혁',
    projects: 9,
    avgDays: 12.5,
    satisfaction: 91,
    specialties: ['금융/보험', '리스크관리'],
    trend: 'stable',
    radar: { speed: 90, quality: 85, satisfaction: 91, volume: 65, diversity: 55 },
  },
  {
    name: '최하은',
    projects: 8,
    avgDays: 19.3,
    satisfaction: 97,
    specialties: ['전자/반도체', 'AI/ML'],
    trend: 'up',
    radar: { speed: 62, quality: 95, satisfaction: 97, volume: 58, diversity: 70 },
  },
  {
    name: '정태윤',
    projects: 7,
    avgDays: 15.0,
    satisfaction: 88,
    specialties: ['유통/물류', '자동화'],
    trend: 'down',
    radar: { speed: 78, quality: 80, satisfaction: 88, volume: 55, diversity: 48 },
  },
];

// 인기 과정 트렌드
const COURSE_TREND_DATA = [
  { month: '9월', '문서자동화': 8, '데이터분석': 12, '챗봇구축': 5, 'AI비서활용': 15 },
  { month: '10월', '문서자동화': 10, '데이터분석': 14, '챗봇구축': 7, 'AI비서활용': 18 },
  { month: '11월', '문서자동화': 12, '데이터분석': 11, '챗봇구축': 9, 'AI비서활용': 20 },
  { month: '12월', '문서자동화': 15, '데이터분석': 13, '챗봇구축': 12, 'AI비서활용': 16 },
  { month: '1월', '문서자동화': 14, '데이터분석': 16, '챗봇구축': 15, 'AI비서활용': 22 },
  { month: '2월', '문서자동화': 18, '데이터분석': 19, '챗봇구축': 11, 'AI비서활용': 25 },
];

const COURSE_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];

// 도구 사용 빈도
const TOOL_USAGE = [
  { name: 'ChatGPT', count: 67, percentage: 82 },
  { name: 'Google Sheets', count: 54, percentage: 66 },
  { name: 'Notion AI', count: 41, percentage: 50 },
  { name: 'Canva AI', count: 38, percentage: 46 },
  { name: 'Gamma', count: 29, percentage: 35 },
  { name: 'Claude', count: 24, percentage: 29 },
];

// ── 헬퍼 함수 ──────────────────────────────────

function getHeatmapColor(value: number): string {
  if (value >= 15) return 'bg-blue-600 text-white';
  if (value >= 12) return 'bg-blue-500 text-white';
  if (value >= 9) return 'bg-blue-400 text-white';
  if (value >= 6) return 'bg-blue-300 text-blue-900';
  if (value >= 3) return 'bg-blue-200 text-blue-800';
  return 'bg-blue-50 text-blue-600';
}

// ── 페이지 컴포넌트 ──────────────────────────────────

export default function IntelligenceDashboardMockup() {
  const selectedConsultant = CONSULTANT_PERFORMANCE[0];
  const radarData = [
    { subject: '처리 속도', value: selectedConsultant.radar.speed },
    { subject: '품질', value: selectedConsultant.radar.quality },
    { subject: '만족도', value: selectedConsultant.radar.satisfaction },
    { subject: '처리량', value: selectedConsultant.radar.volume },
    { subject: '업종 다양성', value: selectedConsultant.radar.diversity },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="크로스 프로젝트 인텔리전스"
        description="전체 프로젝트의 파이프라인, 병목, 업종/교육 패턴을 한눈에 파악합니다."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-4 w-4" />
              필터
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              내보내기
            </Button>
          </div>
        }
      />

      {/* ── KPI 요약 카드 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{KPI_SUMMARY.totalProjects}</p>
                <p className="text-xs text-gray-500">총 프로젝트</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold">{KPI_SUMMARY.activeProjects}</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5">
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                    +{KPI_SUMMARY.monthlyGrowth}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">진행 중</p>
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
                  {KPI_SUMMARY.avgCompletionDays}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {KPI_SUMMARY.completionRate}
                  <span className="text-sm font-normal text-gray-400">%</span>
                </p>
                <p className="text-xs text-gray-500">완료율</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 섹션 1: 파이프라인 & 병목 분석 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 파이프라인 퍼널 (3/5) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-gray-400" />
                프로젝트 파이프라인
              </CardTitle>
              <CardDescription>
                각 단계별 프로젝트 수와 전환율을 표시합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PIPELINE_STAGES.map((stage, i) => {
                  const widthPercent = (stage.count / PIPELINE_STAGES[0].count) * 100;
                  const prevCount = i > 0 ? PIPELINE_STAGES[i - 1].count : stage.count;
                  const convRate = i > 0 ? Math.round((stage.count / prevCount) * 100) : 100;
                  const isBottleneck = convRate < 80 && i > 0;

                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            {stage.label}
                          </span>
                          {isBottleneck && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] px-1.5 gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              병목
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-bold text-gray-900">{stage.count}건</span>
                          {i > 0 && (
                            <span className={`text-xs ${isBottleneck ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              전환 {convRate}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-8 rounded bg-gray-50 overflow-hidden">
                        <div
                          className="h-full rounded transition-all flex items-center pl-3"
                          style={{
                            width: `${Math.max(widthPercent, 8)}%`,
                            backgroundColor: stage.color,
                          }}
                        >
                          {widthPercent > 20 && (
                            <span className="text-xs font-medium text-white">
                              {stage.count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 병목 분석 (2/5) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                단계별 병목 분석
              </CardTitle>
              <CardDescription>
                단계 간 평균 소요일과 대기 프로젝트 수
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {BOTTLENECK_DATA.map((item) => (
                <div
                  key={item.stage}
                  className={`rounded-lg border p-4 ${
                    item.status === 'warning'
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {item.stage}
                    </span>
                    {item.status === 'warning' && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                        주의
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {item.avgDays}
                        <span className="text-sm font-normal text-gray-400">일</span>
                      </p>
                      <p className="text-xs text-gray-500">평균 소요</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-700">
                        {item.projects}
                        <span className="text-sm font-normal text-gray-400">건</span>
                      </p>
                      <p className="text-xs text-gray-500">대기 중</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 섹션 2: 업종 × 교육레벨 히트맵 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                업종 × 교육레벨 히트맵
              </CardTitle>
              <CardDescription>
                업종과 교육 레벨 조합별 생성된 과정 수입니다. 색이 진할수록 수요가 높습니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-3 pr-4 text-left text-sm font-medium text-gray-500 min-w-[140px]">
                    업종
                  </th>
                  {LEVELS.map((level) => (
                    <th
                      key={level}
                      className="pb-3 px-2 text-center text-sm font-medium text-gray-500 min-w-[100px]"
                    >
                      {LEVEL_LABELS[level]}
                    </th>
                  ))}
                  <th className="pb-3 pl-4 text-right text-sm font-medium text-gray-500 min-w-[60px]">
                    합계
                  </th>
                </tr>
              </thead>
              <tbody>
                {INDUSTRIES.map((industry) => {
                  const total = LEVELS.reduce(
                    (sum, level) => sum + (HEATMAP_VALUES[industry]?.[level] || 0),
                    0,
                  );
                  return (
                    <tr key={industry} className="border-t border-gray-50">
                      <td className="py-2 pr-4 text-sm font-medium text-gray-700">
                        {industry}
                      </td>
                      {LEVELS.map((level) => {
                        const value = HEATMAP_VALUES[industry]?.[level] || 0;
                        return (
                          <td key={level} className="py-2 px-2">
                            <div
                              className={`flex items-center justify-center rounded-md h-10 text-sm font-semibold ${getHeatmapColor(value)}`}
                            >
                              {value}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 pl-4 text-right text-sm font-bold text-gray-900">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 범례 */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-gray-400">과정 수:</span>
            <div className="flex items-center gap-1">
              {[
                { label: '1-2', cls: 'bg-blue-50' },
                { label: '3-5', cls: 'bg-blue-200' },
                { label: '6-8', cls: 'bg-blue-300' },
                { label: '9-11', cls: 'bg-blue-400' },
                { label: '12-14', cls: 'bg-blue-500' },
                { label: '15+', cls: 'bg-blue-600' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={`h-4 w-6 rounded ${item.cls}`} />
                  <span className="text-[10px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 섹션 3: 컨설턴트 성과 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 성과 테이블 (2/3) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-gray-400" />
                컨설턴트 성과 순위
              </CardTitle>
              <CardDescription>
                프로젝트 수, 처리 속도, 만족도 기준
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium w-8">#</th>
                      <th className="pb-3 font-medium">컨설턴트</th>
                      <th className="pb-3 font-medium">전문 분야</th>
                      <th className="pb-3 font-medium text-center">프로젝트</th>
                      <th className="pb-3 font-medium text-center">평균 소요</th>
                      <th className="pb-3 font-medium text-center">만족도</th>
                      <th className="pb-3 font-medium text-center">추세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONSULTANT_PERFORMANCE.map((c, i) => (
                      <tr
                        key={c.name}
                        className="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              i === 0
                                ? 'bg-amber-100 text-amber-700'
                                : i === 1
                                  ? 'bg-gray-200 text-gray-600'
                                  : i === 2
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            {i + 1}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                              {c.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.specialties.map((s) => (
                              <Badge key={s} variant="secondary" className="text-[10px] px-1.5">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-center font-semibold">{c.projects}건</td>
                        <td className="py-3 text-center">
                          <span className={c.avgDays <= 15 ? 'text-green-600' : 'text-gray-600'}>
                            {c.avgDays}일
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              c.satisfaction >= 95
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : c.satisfaction >= 90
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                            }
                          >
                            {c.satisfaction}%
                          </Badge>
                        </td>
                        <td className="py-3 text-center">
                          {c.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />}
                          {c.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                          {c.trend === 'stable' && <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 레이더 차트 (1/3) */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">역량 프로필</CardTitle>
              <CardDescription>
                {selectedConsultant.name} 컨설턴트의 5대 역량 분석
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {radarData.map((item) => (
                  <div key={item.subject} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.subject}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900 w-8 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 섹션 4: 과정 트렌드 & 도구 사용 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 과정 트렌드 라인 차트 (2/3) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-gray-400" />
                인기 과정 트렌드
              </CardTitle>
              <CardDescription>
                최근 6개월 간 가장 많이 생성된 교육 과정 카테고리
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={COURSE_TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="AI비서활용"
                    stroke={COURSE_COLORS[3]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="데이터분석"
                    stroke={COURSE_COLORS[1]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="문서자동화"
                    stroke={COURSE_COLORS[0]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="챗봇구축"
                    stroke={COURSE_COLORS[2]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 도구 사용 빈도 (1/3) */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-gray-400" />
                AI 도구 사용 빈도
              </CardTitle>
              <CardDescription>
                로드맵에 포함된 도구 빈도 Top 6
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TOOL_USAGE.map((tool, i) => (
                <div key={tool.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <span className="font-medium text-gray-700">{tool.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {tool.count}건 ({tool.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                      style={{ width: `${tool.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── AI 인사이트 패널 ── */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-white">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-blue-900">AI 인사이트 요약</h3>
                <p className="text-xs text-blue-600 mt-0.5">최근 30일 데이터 기반 자동 분석</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">병목 경고</p>
                  <p className="text-sm text-gray-700">
                    &ldquo;배정→인터뷰&rdquo; 단계에 16건이 8.7일 평균 대기 중입니다. 컨설턴트 일정 조율이 필요합니다.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">수요 패턴</p>
                  <p className="text-sm text-gray-700">
                    &ldquo;AI 비서 활용&rdquo; 과정이 3개월 연속 증가 추세입니다. 관련 컨설턴트 확보를 권장합니다.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">성과 하이라이트</p>
                  <p className="text-sm text-gray-700">
                    김민수 컨설턴트가 이번 달 만족도 96%로 최고 성과를 기록했습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
